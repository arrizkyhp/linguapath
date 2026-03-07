import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Mock localStorage for jsdom environment
const localStorageMock = {
  _storage: {} as Record<string, string>,
  getItem(key: string) {
    return this._storage[key] || null
  },
  setItem(key: string, value: string) {
    this._storage[key] = value.toString()
  },
  removeItem(key: string) {
    delete this._storage[key]
  },
  clear() {
    this._storage = {}
  },
  length: 0,
  key(index: number) {
    return Object.keys(this._storage)[index] || null
  },
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

afterEach(() => {
  cleanup()
  localStorage.removeItem('linguapath_state')
  localStorage.removeItem('linguapath_open_tabs')
  localStorage.removeItem('whisper_model_loaded')
  localStorage.removeItem('kokoro_model_loaded')
})
