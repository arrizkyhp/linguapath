import { describe, it, expect, vi } from 'vitest'
import { loadKokoroModel } from '../kokoroModel'

describe('kokoroModel', () => {
  it('returns null when kokoroRef is already set', async () => {
    const setLoading = vi.fn()
    const setProgress = vi.fn()
    const kokoroRef = { current: 'already-loaded' }
    
    const result = await loadKokoroModel(setLoading, setProgress, kokoroRef)
    expect(result).toBeNull()
    expect(setLoading).not.toHaveBeenCalled()
  })

  it('handles undefined window environment', async () => {
    const setLoading = vi.fn()
    const setProgress = vi.fn()
    const kokoroRef = { current: undefined }
    
    // Temporarily mock window being undefined
    const originalWindow = global.window
    // @ts-ignore
    delete global.window
    
    const result = await loadKokoroModel(setLoading, setProgress, kokoroRef)
    expect(result).toBeNull()
    
    // Restore
    // @ts-ignore
    global.window = originalWindow
  })
})
