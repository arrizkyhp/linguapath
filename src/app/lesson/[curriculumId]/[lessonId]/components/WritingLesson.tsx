'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles, SpellCheck, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadState } from '@/lib/store';
import type { Lesson, WritingContent } from '@/types/curriculum';

type WritingLessonProps = {
  lesson: Lesson;
  curriculumId: string;
  curriculumTitle: string;
  alreadyComplete: boolean;
  onComplete: () => void;
  onNavigateBack: () => void;
};

export function WritingLesson({
  lesson,
  curriculumId,
  curriculumTitle,
  alreadyComplete,
  onComplete,
  onNavigateBack,
}: WritingLessonProps) {
  const [writingText, setWritingText] = useState('');
  const [grammarErrors, setGrammarErrors] = useState<any[]>([]);
  const [grammarChecking, setGrammarChecking] = useState(false);
  const [grammarChecked, setGrammarChecked] = useState(false);
  const [lastCheckedText, setLastCheckedText] = useState('');
  const [textModified, setTextModified] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedFeedback, setPastedFeedback] = useState('');
  const [selectedAISource, setSelectedAISource] = useState('auto');
  const [parsedFeedback, setParsedFeedback] = useState<{
    naturalnessScore: number;
    overallFeedback: string;
    errors: Array<{
      text: string;
      suggestion: string;
      explanation: string;
    }>;
    improvedVersion: string;
    detectedFormat?: string;
  } | null>(null);
  const [parseError, setParseError] = useState('');
  const [showRawFeedback, setShowRawFeedback] = useState(false);
  const [feedbackSidebarOpen, setFeedbackSidebarOpen] = useState(false);

  const content = lesson.content as WritingContent;
  const wordCount = writingText.trim().split(/\s+/).filter(Boolean).length;
  const minWords = content.min_words ?? 0;
  
  const state = loadState();
  const currentLevel = state.current_level || 'B1';

  async function checkGrammar() {
    if (!writingText.trim()) return;
    setGrammarChecking(true);
    setGrammarErrors([]);
    setGrammarChecked(false);
    setTextModified(false);
    try {
      const res = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text: writingText, language: 'en-US' }),
      });
      const data = await res.json();
      setGrammarErrors(data.matches || []);
      setGrammarChecked(true);
      setLastCheckedText(writingText);
    } catch {
    } finally {
      setGrammarChecking(false);
    }
  }

  function copyPromptForAI() {
    if (!writingText.trim()) return;
    
    const prompt = `You are an English learning assistant for Linguapath. Please analyze this student's writing:

**Student's CEFR Level**: ${currentLevel}
**Writing Task**: ${content.prompt}
**Minimum Words**: ${content.min_words || 'not specified'}

**Student's Answer**:
${writingText}

Please provide:
1. **Naturalness Score** (1-5 stars)
2. **Overall Feedback** - Encouraging summary with 2-3 key improvement areas
3. **Specific Errors** - List mistakes with:
   - Original text snippet
   - Suggested correction  
   - Brief explanation of what's wrong
4. **Improved Version** - A rewritten version that maintains the original meaning but sounds more natural

Be encouraging and educational. Focus on clarity and naturalness for language learners at this level.`;

    navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
  }

  function parseFeedback() {
    const text = pastedFeedback.trim();
    
    if (!text) {
      setParseError('Please paste some feedback first');
      return;
    }

    let detectedFormat = '';
    let formatScore = 0;

    let score = 0;
    const scorePatterns = [
      /Naturalness Score[:\s⭐]*([1-5])/i,
      /Score[:\s]*([1-5])[:\s]/i,
      /([1-5])[:\s⭐]*\/5/i,
      /Naturalness Score:\s*\*\*([1-5])\s*\/\s*5/i,
    ];
    
    for (const pattern of scorePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        score = parseInt(match[1]);
        break;
      }
    }

    let overall = '';
    const overallPatterns = [
      /Overall Feedback[:\s]*([\s\S]*?)(?:Specific Errors|❌ Errors|📝 Specific Errors|🔍 Specific Errors|$)/i,
      /💬 Overall Feedback[:\s]*([\s\S]*?)(?:🔍|##\s*\[|$)/i,
      /🌼\s*\*\*Overall Feedback\*\*[:\s]*([\s\S]*?)(?:🔎|##\s*\[|$)/i,
    ];
    
    for (const pattern of overallPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        overall = match[1].trim().replace(/\n+/g, ' ').replace(/\*\*/g, '');
        break;
      }
    }

    let improved = '';
    const improvedPatterns = [
      /Improved Version[:\s]*([\s\S]*?)$/i,
      /✅ Improved Version[:\s]*([\s\S]*?)$/i,
      /✨ Improved Version[:\s]*([\s\S]*?)$/i,
      /Rewritten Version[:\s]*([\s\S]*?)$/i,
      /Better Version[:\s]*([\s\S]*?)$/i,
      /##\s*\d+\.?\s*✨?\s*\*\*?Improved Version\*\*?[:\s]*([\s\S]*?)(?:##|$)/i,
    ];
    
    for (const pattern of improvedPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        improved = match[1].trim().replace(/^>\s*/gm, '').replace(/^-+\s*/gm, '');
        break;
      }
    }

    const errors: Array<{ text: string; suggestion: string; explanation: string }> = [];
    
    if (selectedAISource === 'claude') {
      const tablePattern = /\|\s*\d+\s*\|\s*\*?_?["']?([^|"*'\n_]+)["']?\*?_?\s*\|\s*\*?_?["']?([^|"*'\n_]+)["']?\*?_?\s*\|\s*([^|\n]+)\|/g;
      let match;
      while ((match = tablePattern.exec(text)) !== null) {
        const text_content = match[1].trim().replace(/^["']|["']$/g, '').replace(/^\*|\*$/g, '').replace(/^_+_$/g, '');
        const suggestion = match[2].trim().replace(/^["']|["']$/g, '').replace(/^\*|\*$/g, '').replace(/^_+_$/g, '');
        const explanation = match[3].trim();
        
        if (text_content && suggestion && !errors.find(e => e.text === text_content)) {
          errors.push({
            text: text_content,
            suggestion: suggestion,
            explanation: explanation
          });
          formatScore += 10;
          detectedFormat = 'Claude (table format)';
        }
      }
      
      if (errors.length === 0) {
        setParseError('Claude table format not detected');
        return;
      }
    }
    
    if (selectedAISource === 'chatgpt') {
      const numberedLabelPattern = /\*\*\d+\.\s*Original[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Correction[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Explanation[:\s]*\*\*\s*([^\n]+)/gi;
      let match;
      while ((match = numberedLabelPattern.exec(text)) !== null) {
        const text_content = match[1].trim().replace(/^["']|["']$/g, '');
        const suggestion = match[2].trim().replace(/^["']|["']$/g, '');
        const explanation = match[3].trim();
        
        if (!errors.find(e => e.text === text_content)) {
          errors.push({
            text: text_content,
            suggestion: suggestion,
            explanation: explanation
          });
          formatScore += 10;
          detectedFormat = 'ChatGPT (numbered labels)';
        }
      }
      
      const labelPattern = /\*\*Original[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Correction[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Explanation[:\s]*\*\*\s*([^\n]+)/gi;
      while ((match = labelPattern.exec(text)) !== null) {
        const text_content = match[1].trim().replace(/^["']|["']$/g, '');
        const suggestion = match[2].trim().replace(/^["']|["']$/g, '');
        const explanation = match[3].trim().replace(/^["']|["']$/g, '');
        
        if (!errors.find(e => e.text === text_content)) {
          errors.push({
            text: text_content,
            suggestion: suggestion,
            explanation: explanation
          });
          formatScore += 10;
          detectedFormat = 'ChatGPT (structured labels)';
        }
      }
      
      if (errors.length === 0) {
        setParseError('ChatGPT format not detected');
        return;
      }
    }
    
    if (selectedAISource === 'auto' || errors.length === 0) {
      const errorPattern1 = /["'](.*?)["']\s*→\s*["'](.*?)["']\s*(?:-?\s*(.*?))(?=["']|$)/g;
      let match;
      while ((match = errorPattern1.exec(text)) !== null) {
        errors.push({
          text: match[1].trim(),
          suggestion: match[2].trim(),
          explanation: match[3]?.trim().replace(/^-\s*/, '') || ''
        });
        formatScore += 10;
      }

      const tablePattern = /\|\s*\d+\s*\|\s*\*?_?["']?([^|"*'\n_]+)["']?\*?_?\s*\|\s*\*?_?["']?([^|"*'\n_]+)["']?\*?_?\s*\|\s*([^|\n]+)\|/g;
      while ((match = tablePattern.exec(text)) !== null) {
        const text_content = match[1].trim().replace(/^["']|["']$/g, '').replace(/^\*|\*$/g, '').replace(/^_+_$/g, '');
        const suggestion = match[2].trim().replace(/^["']|["']$/g, '').replace(/^\*|\*$/g, '').replace(/^_+_$/g, '');
        const explanation = match[3].trim();
        
        if (text_content && suggestion && !errors.find(e => e.text === text_content)) {
          errors.push({
            text: text_content,
            suggestion: suggestion,
            explanation: explanation
          });
          formatScore += 10;
          if (!detectedFormat) detectedFormat = 'Claude (table format)';
        }
      }

      const errorPattern2 = /\*\*(.*?)\*\*\s*->\s*\*\*(.*?)\*\*/g;
      while ((match = errorPattern2.exec(text)) !== null) {
        errors.push({
          text: match[1],
          suggestion: match[2],
          explanation: ""
        });
      }

      const errorPattern3 = /["'](.*?)["']\s+should be\s+["'](.*?)["']/gi;
      while ((match = errorPattern3.exec(text)) !== null) {
        errors.push({
          text: match[1],
          suggestion: match[2],
          explanation: ""
        });
      }

      const labelPattern = /\*\*Original[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Correction[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Explanation[:\s]*\*\*\s*([^\n]+)/gi;
      while ((match = labelPattern.exec(text)) !== null) {
        const text_content = match[1].trim().replace(/^["']|["']$/g, '');
        const suggestion = match[2].trim().replace(/^["']|["']$/g, '');
        const explanation = match[3].trim().replace(/^["']|["']$/g, '');
        
        if (!errors.find(e => e.text === text_content)) {
          errors.push({
            text: text_content,
            suggestion: suggestion,
            explanation: explanation
          });
          formatScore += 10;
          if (!detectedFormat) detectedFormat = 'ChatGPT (structured labels)';
        }
      }

      const numberedLabelPattern = /\*\*\d+\.\s*Original[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Correction[:\s]*\*\*\s*>?\s*([^\n]+?)\s*\n*\*\*Explanation[:\s]*\*\*\s*([^\n]+)/gi;
      while ((match = numberedLabelPattern.exec(text)) !== null) {
        const text_content = match[1].trim().replace(/^["']|["']$/g, '');
        const suggestion = match[2].trim().replace(/^["']|["']$/g, '');
        const explanation = match[3].trim();
        
        if (!errors.find(e => e.text === text_content)) {
          errors.push({
            text: text_content,
            suggestion: suggestion,
            explanation: explanation
          });
          formatScore += 10;
          if (!detectedFormat) detectedFormat = 'ChatGPT (numbered labels)';
        }
      }
    }

    if (!detectedFormat && errors.length > 0) {
      detectedFormat = 'Standard (arrow format)';
    }

    if (errors.length === 0 && !improved && !overall) {
      setParseError("Couldn't parse the feedback automatically. But you can still view the raw AI response below!");
      setParsedFeedback({
        naturalnessScore: score,
        overallFeedback: '',
        errors: [],
        improvedVersion: '',
        detectedFormat: 'Unknown'
      });
      setShowRawFeedback(true);
      return;
    }

    setParsedFeedback({
      naturalnessScore: score,
      overallFeedback: overall,
      errors: errors,
      improvedVersion: improved,
      detectedFormat: detectedFormat || 'Mixed format'
    });
    
    setParseError('');
    setShowRawFeedback(false);
    setShowPasteArea(false);
    setPastedFeedback('');
    setFeedbackSidebarOpen(true);
  }

  const errorCount = grammarErrors.length;

  return (
    <div className="flex min-h-[calc(100vh-80px)] p-8 gap-8">
      <div className="flex-1 max-w-2xl">
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-6">
          <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">
            Writing Prompt
          </div>
          <p className="text-neutral-700 leading-relaxed">{content.prompt}</p>
          {minWords > 0 && (
            <div className="text-xs text-neutral-400 mt-2">
              Minimum: {minWords} words
            </div>
          )}
        </div>
        <textarea
          value={writingText}
          onChange={(e) => {
            setWritingText(e.target.value);
            if (lastCheckedText)
              setTextModified(e.target.value !== lastCheckedText);
          }}
          placeholder="Start writing here..."
          className="w-full min-h-56 border border-neutral-200 rounded-xl p-4 text-neutral-700 leading-relaxed resize-y outline-none focus:border-neutral-400 transition-colors font-sans text-sm"
        />
        <div className="flex items-center justify-between mt-2 mb-4 gap-3">
          <span
            className={`text-sm ${wordCount >= minWords ? 'text-green-600' : 'text-neutral-400'}`}
          >
            {wordCount} words {minWords > 0 && `/ ${minWords} min`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={checkGrammar}
              disabled={grammarChecking || !writingText.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                grammarChecking || !writingText.trim()
                  ? 'border-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'border-blue-200 text-blue-600 hover:bg-blue-50'
              }`}
            >
              {grammarChecking ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Checking...
                </>
              ) : (
                <>
                  <SpellCheck size={14} /> Check Grammar
                </>
              )}
            </button>
            <button
              onClick={copyPromptForAI}
              disabled={!writingText.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                !writingText.trim()
                  ? 'border-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'border-purple-200 text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Sparkles size={14} /> Get AI Feedback
            </button>
          </div>
        </div>
        {promptCopied && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={15} className="text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">
                    Prompt copied to clipboard!
                  </span>
                </div>
                <p className="text-xs text-purple-700 mb-3">
                  Paste it into your favorite AI chat, then come back and continue when done.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    <Play size={12} className="rotate-[-90deg]" />
                    Open Gemini
                  </a>
                  <a
                    href="https://claude.ai/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    <Play size={12} className="rotate-[-90deg]" />
                    Open Claude
                  </a>
                  <a
                    href="https://chatgpt.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    <Play size={12} className="rotate-[-90deg]" />
                    Open ChatGPT
                  </a>
                  <a
                    href="https://qwenlm.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    <Play size={12} className="rotate-[-90deg]" />
                    Open Qwen
                  </a>
                  <button
                    onClick={() => {
                      setShowPasteArea(true);
                      setPromptCopied(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
                  >
                    I have the response
                  </button>
                </div>
              </div>
              <button
                onClick={() => setPromptCopied(false)}
                className="text-purple-400 hover:text-purple-600 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {showPasteArea && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="mb-2">
              <label className="text-xs font-medium text-purple-700 block mb-1">
                Which AI provided this feedback?
              </label>
              <select
                value={selectedAISource}
                onChange={(e) => setSelectedAISource(e.target.value)}
                className="text-sm border border-purple-200 rounded-lg px-3 py-1.5 bg-white text-purple-700 focus:outline-none focus:border-purple-400"
              >
                <option value="auto">Auto-detect (recommended)</option>
                <option value="claude">Claude (uses tables)</option>
                <option value="chatgpt">ChatGPT (uses labels)</option>
              </select>
            </div>
            <textarea
              value={pastedFeedback}
              onChange={(e) => setPastedFeedback(e.target.value)}
              placeholder="Paste the AI's response here... (includes score, errors, and improved version)"
              className="w-full h-32 p-2 text-sm rounded-lg border border-purple-200 bg-white focus:outline-none focus:border-purple-400"
            />
            {parseError && (
              <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} />
                {parseError}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                onClick={parseFeedback}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Parse Feedback
              </button>
              <button
                onClick={() => {
                  setShowPasteArea(false);
                  setPastedFeedback('');
                  setParseError('');
                }}
                className="px-3 py-1.5 bg-white text-purple-700 text-xs font-medium rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {grammarChecked && textModified && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-sm text-amber-700">
              Text modified since last check — results may be outdated
            </span>
          </div>
        )}
        {grammarChecked && errorCount > 0 && (
          <div className="mb-6 border border-amber-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                {errorCount} issue{errorCount !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
              {grammarErrors.map((err: any, i: number) => (
                <div key={i} className="px-4 py-3 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">
                      {writingText.substring(
                        err.offset,
                        err.offset + err.length,
                      ) || '—'}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {err.rule?.category?.name || 'Grammar'}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700">{err.message}</p>
                  {err.replacements?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <span className="text-xs text-neutral-400">
                        Suggestions:
                      </span>
                      {err.replacements
                        .slice(0, 3)
                        .map((r: any, j: number) => (
                          <button
                            key={j}
                            onClick={() => {
                              const before = writingText.substring(
                                0,
                                err.offset,
                              );
                              const after = writingText.substring(
                                err.offset + err.length,
                              );
                              setWritingText(before + r.value + after);
                              setTextModified(true);
                            }}
                            className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 transition-colors font-medium"
                          >
                            {r.value}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {grammarChecked && errorCount === 0 && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              No grammar or spelling issues found!
            </span>
          </div>
        )}
        {parsedFeedback && !feedbackSidebarOpen && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  AI Feedback Ready
                </span>
              </div>
              <button
                onClick={() => setFeedbackSidebarOpen(true)}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Open AI Feedback Sidebar →
              </button>
            </div>
          </div>
        )}
        <Button
          className="w-full"
          disabled={minWords > 0 && wordCount < minWords}
          onClick={onComplete}
        >
          Submit & Complete ✓
        </Button>
      </div>
      
      {/* AI Feedback Sidebar */}
      <div 
        className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-neutral-200 shadow-xl transform transition-transform duration-300 z-50 ${
          feedbackSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600" />
              <span className="font-semibold text-purple-800">AI Feedback</span>
            </div>
            <button
              onClick={() => setFeedbackSidebarOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 p-1"
            >
              <X size={20} />
            </button>
          </div>
          
          {parsedFeedback && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {parsedFeedback.detectedFormat && (
                <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  {parsedFeedback.detectedFormat}
                </div>
              )}
              
              {parsedFeedback.naturalnessScore > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-700">Naturalness Score</span>
                    <span className="text-lg font-bold text-purple-600">
                      {parsedFeedback.naturalnessScore}/5
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div
                        key={star}
                        className={`flex-1 h-2 rounded-full ${
                          star <= parsedFeedback.naturalnessScore
                            ? 'bg-purple-500'
                            : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {parsedFeedback.overallFeedback && (
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-700">{parsedFeedback.overallFeedback}</p>
                </div>
              )}
              
              {showRawFeedback && pastedFeedback && (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-b border-neutral-100">
                    <span className="text-xs font-medium text-neutral-600">Original AI Response</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(pastedFeedback)}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-sans">
                      {pastedFeedback}
                    </pre>
                  </div>
                </div>
              )}
              
              {parsedFeedback.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 mb-2">
                    Suggestions ({parsedFeedback.errors.length})
                  </h4>
                  <div className="space-y-2">
                    {parsedFeedback.errors.map((err, i) => (
                      <div key={i} className="p-3 border border-neutral-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">
                            {err.text || 'General'}
                          </span>
                        </div>
                        {err.explanation && (
                          <p className="text-sm text-neutral-700 mb-1">{err.explanation}</p>
                        )}
                        {err.suggestion && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500">→</span>
                            <button
                              onClick={() => {
                                if (err.text) {
                                  setWritingText(writingText.replace(err.text, err.suggestion));
                                  setTextModified(true);
                                }
                              }}
                              className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded hover:bg-green-100 transition-colors font-medium"
                            >
                              {err.suggestion}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {parsedFeedback.improvedVersion && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-neutral-700">Improved Version</h4>
                    <button
                      onClick={() => {
                        setWritingText(parsedFeedback.improvedVersion);
                        setTextModified(true);
                      }}
                      className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded hover:bg-purple-100 transition-colors font-medium"
                    >
                      Use This Version
                    </button>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      {parsedFeedback.improvedVersion}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
