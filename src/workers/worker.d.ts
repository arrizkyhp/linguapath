export interface WorkerMessage {
  type: "LOAD_MODEL" | "GENERATE_AUDIO" | "TERMINATE";
}

export interface LoadModelMessage extends WorkerMessage {
  type: "LOAD_MODEL";
  modelId: string;
  voice?: string;
}

export interface GenerateAudioMessage extends WorkerMessage {
  type: "GENERATE_AUDIO";
  text: string;
  voice?: string;
}

export interface TerminateMessage extends WorkerMessage {
  type: "TERMINATE";
}

export interface ProgressMessage {
  type: "PROGRESS";
  status: "loading" | "generating";
  progress: number;
  message?: string;
}

export interface ModelReadyMessage {
  type: "MODEL_READY";
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
