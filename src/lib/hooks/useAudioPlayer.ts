import { useState, useCallback, useRef, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────
export type Speed = 0.75 | 1.0 | 1.25

export interface UseAudioPlayerReturn {
  // State
  isPlaying: boolean
  progress: number
  duration: number
  currentTime: number
  playSpeed: Speed
  
  // Actions
  play: () => void
  pause: () => void
  changeSpeed: (speed: Speed) => void
  reset: () => void
}

/**
 * Custom hook for managing audio playback
 * @param audioUrl URL of the audio to play
 * @param initialSpeed Initial playback speed (default: 1.0)
 * @returns Audio player state and controls
 */
export function useAudioPlayer(audioUrl: string | null, initialSpeed: Speed = 1.0): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playSpeed, setPlaySpeed] = useState<Speed>(initialSpeed)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Sync audio URL changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl
      setCurrentTime(0)
      setProgress(0)
      setIsPlaying(false)
    }
  }, [audioUrl])

  // Play audio
  const play = useCallback(() => {
    if (!audioRef.current || !audioUrl) return
    
    audioRef.current.playbackRate = playSpeed
    audioRef.current.play().then(() => {
      setIsPlaying(true)
    }).catch((error) => {
      console.error('Audio play failed:', error)
      setIsPlaying(false)
    })
  }, [playSpeed, audioUrl])

  // Pause audio
  const pause = useCallback(() => {
    if (!audioRef.current) return
    
    audioRef.current.pause()
    setIsPlaying(false)
  }, [])

  // Change speed
  const changeSpeed = useCallback((speed: Speed) => {
    setPlaySpeed(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [])

  // Reset
  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
  }, [])

  // Setup audio event listeners
  useEffect(() => {
    if (!audioRef.current && audioUrl) {
      audioRef.current = new Audio()
      audioRef.current.playbackRate = playSpeed
      audioRef.current.src = audioUrl
    }

    if (!audioRef.current) {
      return
    }

    const audio = audioRef.current

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setProgress(100)
    }
    const onError = () => {
      setIsPlaying(false)
      console.error('Audio error')
    }
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0)
    }
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [audioUrl, playSpeed])

  return {
    isPlaying,
    progress,
    duration,
    currentTime,
    playSpeed,
    play,
    pause,
    changeSpeed,
    reset,
  }
}
