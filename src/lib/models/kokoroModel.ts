/**
 * Load Kokoro TTS model
 * @param setLoading Function to set loading state
 * @param setProgress Function to set progress percentage
 * @param kokoroRef Ref to store the Kokoro instance
 * @returns The Kokoro TTS instance or null if already loaded
 */
export async function loadKokoroModel(
  setLoading: (loading: boolean) => void,
  setProgress: (progress: number) => void,
  kokoroRef: React.MutableRefObject<any>
) {
  if (typeof window === 'undefined') return null
  if (kokoroRef.current) return kokoroRef.current
  
  setLoading(true)
  setProgress(0)
  
  try {
    const kokoroJs = await import('kokoro-js')
    kokoroJs.env.allowLocalModels = false
    kokoroJs.env.useBrowserCache = true
    
    const kokoro = await kokoroJs.KokoroTTS.from_pretrained(
      'onnx-community/Kokoro-82M-v1.0-ONNX',
      {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.progress) {
            setProgress(Math.round(progress.progress))
          }
        },
      }
    )
    
    kokoroRef.current = kokoro
    setLoading(false)
    return kokoro
  } catch (error) {
    console.error('Failed to load Kokoro model:', error)
    setLoading(false)
    throw error
  }
}
