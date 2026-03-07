// ── Constants for Whisper chunking ─────────────────────────
export const WHISPER_CHUNK_LENGTH_S = 25
export const WHISPER_STRIDE_LENGTH_S = 2

/**
 * Load Whisper ASR model
 * @param setLoading Function to set loading state
 * @param setProgress Function to set progress percentage
 * @param pipelineRef Ref to store the pipeline instance
 * @returns The Whisper pipeline or null if already loaded
 */
export async function loadWhisperModel(
  setLoading: (loading: boolean) => void,
  setProgress: (progress: number) => void,
  pipelineRef: React.MutableRefObject<any>
) {
  if (typeof window === 'undefined') return null
  if (pipelineRef.current) return pipelineRef.current
  
  setLoading(true)
  setProgress(0)
  
  try {
    const { pipeline, env } = await import('@huggingface/transformers')
    env.allowLocalModels = false
    env.useBrowserCache = true
    
    const whisper = await pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-base',
      {
        dtype: 'q8',
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.progress) {
            setProgress(Math.round(progress.progress))
          }
        },
      }
    )
    
    pipelineRef.current = whisper
    setLoading(false)
    return whisper
  } catch (error) {
    console.error('Failed to load Whisper model:', error)
    setLoading(false)
    throw error
  }
}
