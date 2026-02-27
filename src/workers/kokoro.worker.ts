// ── Types ────────────────────────────────────────────────

// Polyfill window for kokoro-js (it references window which doesn't exist in workers)
// Must be set BEFORE any imports that might use window
const workerGlobal = self as any;
workerGlobal.window = workerGlobal;

// Incoming messages (main thread → worker)
export interface LoadModelMessage {
  type: "LOAD_MODEL";
  modelId: string;
  voice?: string;
}

export interface GenerateAudioMessage {
  type: "GENERATE_AUDIO";
  text: string;
  voice?: string;
}

export interface TerminateMessage {
  type: "TERMINATE";
}

export type WorkerMessage =
  | LoadModelMessage
  | GenerateAudioMessage
  | TerminateMessage;

// Outgoing messages (worker → main thread)
export interface ProgressMessage {
  type: "PROGRESS";
  status: "loading" | "generating";
  progress: number;
  message?: string;
}

export interface ModelReadyMessage {
  type: "MODEL_READY";
  modelLoaded?: boolean;
}

export interface AudioReadyMessage {
  type: "AUDIO_READY";
  wavBytes: Uint8Array;
}

export interface ErrorMessage {
  type: "ERROR";
  error: string;
}

export type WorkerResponse =
  | ProgressMessage
  | ModelReadyMessage
  | AudioReadyMessage
  | ErrorMessage;

// ── State ────────────────────────────────────────────────

let kokoroTTS: any = null;

// ── Helpers ──────────────────────────────────────────────

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

function writeWavHeader(numSamples: number, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  const numChannels = 1; // mono
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8); // = 2
  const byteRate = sampleRate * blockAlign; // = sampleRate * 2
  const dataSize = numSamples * blockAlign;

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (PCM = 16)
  view.setUint16(20, 1, true); // AudioFormat   (PCM = 1)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample
  writeString(36, "data");
  view.setUint32(40, dataSize, true); // Subchunk2Size

  return buffer;
}

// ── Core functions ───────────────────────────────────────

type ProgressCallback = (
  status: "loading" | "generating",
  progress: number,
  message: string,
) => void;

async function initializeKokoro(
  modelId: string,
  onProgress: ProgressCallback,
): Promise<void> {
  const kokoroJs = await import("kokoro-js");

  onProgress("loading", 5, "Loading TTS model...");

  kokoroTTS = await kokoroJs.KokoroTTS.from_pretrained(modelId, {
    dtype: "q8",
    device: "wasm",
    progress_callback: (progress: any) => {
      if (progress.status === "progress" && progress.progress) {
        onProgress(
          "loading",
          Math.round(progress.progress),
          "Downloading model...",
        );
      }
    },
  });

  onProgress("loading", 100, "Model loaded!");
}

async function generateAudio(
  text: string,
  voice: string,
  onProgress: ProgressCallback,
): Promise<Uint8Array> {
  if (!kokoroTTS) throw new Error("Model not loaded");

  onProgress("generating", 10, "Generating speech...");

  const output = await kokoroTTS.generate(text, { voice });

  if (!output) throw new Error("Kokoro.generate returned undefined");

  const samples: Float32Array = output.audio;
  if (!samples || !(samples instanceof Float32Array))
    throw new Error("Invalid audio samples");

  onProgress("generating", 90, "Converting to WAV...");

  const wavHeader = writeWavHeader(samples.length, 24000);
  const pcmData = floatTo16BitPCM(samples);

  const wavBytes = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(new Uint8Array(pcmData), wavHeader.byteLength);

  onProgress("generating", 100, "Audio ready!");

  return wavBytes;
}

// ── Message handler ──────────────────────────────────────

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const message = e.data;

  const sendProgress: ProgressCallback = (status, progress, msg) => {
    const response: ProgressMessage = {
      type: "PROGRESS",
      status,
      progress,
      message: msg,
    };
    self.postMessage(response);
  };

  try {
    if (message.type === "LOAD_MODEL") {
      await initializeKokoro(message.modelId, sendProgress);
      const response: ModelReadyMessage = { type: "MODEL_READY" };
      self.postMessage(response);
    } else if (message.type === "GENERATE_AUDIO") {
      const wavBytes = await generateAudio(
        message.text,
        message.voice || "af_heart",
        sendProgress,
      );
      const response: AudioReadyMessage = { type: "AUDIO_READY", wavBytes };
      // Transfer buffer to avoid copying large data
      self.postMessage(response, { transfer: [wavBytes.buffer] } as any);
    } else if (message.type === "TERMINATE") {
      kokoroTTS = null;
      self.close();
    }
  } catch (error) {
    const response: ErrorMessage = {
      type: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
