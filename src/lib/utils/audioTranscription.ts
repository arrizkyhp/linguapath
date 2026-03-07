// ── Constants for Whisper chunking ─────────────────────────
export const WHISPER_CHUNK_LENGTH_S = 25
export const WHISPER_STRIDE_LENGTH_S = 2

/**
 * Transcribes audio using Whisper with chunking
 * @param audioUrl URL of the audio file
 * @param pipeline The Whisper pipeline
 * @returns Transcribed text
 */
export async function transcribeWithChunking(
  audioUrl: string,
  pipeline: any
): Promise<string> {
  try {
    const result = await pipeline(audioUrl, {
      language: 'english',
      task: 'transcribe',
      chunk_length_s: WHISPER_CHUNK_LENGTH_S,
      stride_length_s: WHISPER_STRIDE_LENGTH_S,
    })
    return result.text.trim()
  } finally {
    URL.revokeObjectURL(audioUrl)
  }
}
