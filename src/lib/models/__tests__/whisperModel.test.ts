import { describe, it, expect, vi } from 'vitest'
import { loadWhisperModel, WHISPER_CHUNK_LENGTH_S, WHISPER_STRIDE_LENGTH_S } from '../whisperModel'

describe('whisperModel', () => {
  it('exposes constants', () => {
    expect(WHISPER_CHUNK_LENGTH_S).toBe(25)
    expect(WHISPER_STRIDE_LENGTH_S).toBe(2)
  })

  it('returns null when pipelineRef is already set', async () => {
    const setLoading = vi.fn()
    const setProgress = vi.fn()
    const pipelineRef = { current: 'already-loaded' }
    
    const result = await loadWhisperModel(setLoading, setProgress, pipelineRef)
    expect(result).toBeNull()
    expect(setLoading).not.toHaveBeenCalled()
  })

  it('handles undefined window environment', async () => {
    const setLoading = vi.fn()
    const setProgress = vi.fn()
    const pipelineRef = { current: undefined }
    
    // Temporarily mock window being undefined
    const originalWindow = global.window
    // @ts-ignore
    delete global.window
    
    const result = await loadWhisperModel(setLoading, setProgress, pipelineRef)
    expect(result).toBeNull()
    
    // Restore
    // @ts-ignore
    global.window = originalWindow
  })
})
