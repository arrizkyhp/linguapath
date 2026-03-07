'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Lesson, QuizContent } from '@/types/curriculum';

type QuizLessonProps = {
  lesson: Lesson;
  curriculumId: string;
  curriculumTitle: string;
  alreadyComplete: boolean;
  onComplete: () => void;
  onNavigateBack: () => void;
};

export function QuizLesson({
  lesson,
  curriculumId,
  curriculumTitle,
  alreadyComplete,
  onComplete,
  onNavigateBack,
}: QuizLessonProps) {
  const [step, setStep] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectQuestionIndices, setIncorrectQuestionIndices] = useState<number[]>([]);

  const content = lesson.content as QuizContent;
  const q = content.questions[qIdx];
  const isLastQ = qIdx === content.questions.length - 1;

  if (step === 1) {
    const pct = Math.round((correctCount / content.questions.length) * 100);
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <div className="text-6xl mb-4">
          {pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'}
        </div>
        <h2 className="font-serif text-3xl font-bold mb-2">
          Quiz Complete
        </h2>
        <p className="text-neutral-500 mb-6">
          {correctCount} / {content.questions.length} correct · {pct}%
        </p>
        <div className="bg-neutral-50 rounded-xl p-4 mb-8">
          <Progress value={pct} className="h-3" />
        </div>
        <Button size="lg" onClick={onComplete} className="w-full">
          Claim {lesson.xp} XP ✓
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Progress
          value={(qIdx / content.questions.length) * 100}
          className="flex-1"
        />
        <span className="text-sm text-neutral-400 whitespace-nowrap">
          {qIdx + 1} / {content.questions.length}
        </span>
      </div>
      <h2 className="font-serif text-2xl font-semibold mb-6">
        {q.question}
      </h2>
      <div className="space-y-3 mb-6">
        {q.options.map((opt, i) => {
          const isCorrect = q.answer === i || opt === q.answer;
          let cls =
            'border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white';
          if (showExp) {
            if (isCorrect)
              cls = 'border-green-400 bg-green-50 text-green-700';
            else if (i === selectedAns)
              cls = 'border-red-400 bg-red-50 text-red-700';
            else cls = 'border-neutral-100 bg-neutral-50 text-neutral-400';
          }
          return (
            <button
              key={i}
              onClick={() => {
                if (!showExp) {
                  setSelectedAns(i);
                  setShowExp(true);
                  if (isCorrect) {
                    setCorrectCount((c) => c + 1);
                  } else {
                    setIncorrectQuestionIndices(prev => [...prev, qIdx]);
                  }
                }
              }}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {showExp && q.explanation && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 mb-4">
          💡 {q.explanation}
        </div>
      )}
      {showExp && (
        <Button
          className="w-full"
          onClick={() => {
            if (isLastQ) {
              setStep(1);
            } else {
              setQIdx((i) => i + 1);
              setSelectedAns(null);
              setShowExp(false);
            }
          }}
        >
          {isLastQ ? 'See Results' : 'Next Question'}{' '}
          <ChevronRight size={16} />
        </Button>
      )}
    </div>
  );
}
