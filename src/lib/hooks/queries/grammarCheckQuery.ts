import { useMutation } from '@tanstack/react-query'

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

/**
 * Query key for grammar checking
 */
export const GRAMMAR_CHECK_QUERY_KEY = ['grammarCheck']

/**
 * Check grammar using LanguageTool API
 * @param text Text to check
 * @returns Array of grammar errors
 */
async function checkGrammar(text: string): Promise<GrammarError[]> {
  const res = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text, language: 'en-US' }),
  })
  
  if (!res.ok) {
    throw new Error('Failed to check grammar')
  }
  
  const data = await res.json()
  return data.matches || []
}

/**
 * Hook for grammar checking using TanStack Query
 * @returns Mutation function and state
 */
export function useGrammarCheckMutation() {
  return useMutation({
    mutationKey: GRAMMAR_CHECK_QUERY_KEY,
    mutationFn: checkGrammar,
  })
}
