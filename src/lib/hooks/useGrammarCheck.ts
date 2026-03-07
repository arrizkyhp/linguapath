import { useState, useCallback } from 'react'
import { useGrammarCheckMutation } from './queries/grammarCheckQuery'

export interface UseGrammarCheckReturn {
  errors: GrammarError[]
  isChecking: boolean
  hasChecked: boolean
  textModified: boolean
  lastCheckedText: string
  
  checkGrammar: (text: string) => Promise<void>
  applySuggestion: (error: GrammarError, suggestion: string) => string
  reset: () => void
}

interface GrammarError {
  id: number
  offset: number
  length: number
  message: string
  replacements?: { value: string }[]
  rule?: {
    category?: {
      name?: string
    }
  }
}

export function useGrammarCheck(): UseGrammarCheckReturn {
  const { mutate: checkGrammarMutation, isPending, data: errors, reset: mutationReset } = useGrammarCheckMutation()
  
  const [hasChecked, setHasChecked] = useState(false)
  const [textModified, setTextModified] = useState(false)
  const [lastCheckedText, setLastCheckedText] = useState('')

  const checkGrammar = useCallback(async (text: string) => {
    if (!text.trim()) return
    
    setHasChecked(false)
    setTextModified(false)
    setLastCheckedText('')
    
    try {
      await checkGrammarMutation(text)
      setLastCheckedText(text)
    } catch (error) {
      console.error('Grammar check failed:', error)
    }
  }, [checkGrammarMutation])

  const applySuggestion = useCallback((error: GrammarError, suggestion: string) => {
    setTextModified(true)
    return suggestion
  }, [])

  const reset = useCallback(() => {
    mutationReset()
    setHasChecked(false)
    setTextModified(false)
    setLastCheckedText('')
  }, [mutationReset])

  return {
    errors: errors || [],
    isChecking: isPending,
    hasChecked,
    textModified,
    lastCheckedText,
    checkGrammar,
    applySuggestion,
    reset,
  }
}
