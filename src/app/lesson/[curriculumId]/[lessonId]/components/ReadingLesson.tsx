'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Lesson, ReadingContent } from '@/types/curriculum';

type ReadingLessonProps = {
  lesson: Lesson;
  curriculumId: string;
  curriculumTitle: string;
  alreadyComplete: boolean;
  onComplete: () => void;
  onNavigateBack: () => void;
};

export function ReadingLesson({
  lesson,
  curriculumId,
  curriculumTitle,
  alreadyComplete,
  onComplete,
  onNavigateBack,
}: ReadingLessonProps) {
  const [step, setStep] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [incorrectQuestionIndices, setIncorrectQuestionIndices] = useState<number[]>([]);

  const content = lesson.content as ReadingContent;
  const isReading = step === 0;

  if (isReading) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="prose prose-neutral max-w-none bg-white border border-neutral-200 rounded-2xl p-8 mb-6">
          <p className="font-serif text-base leading-8 text-neutral-700 whitespace-pre-wrap">
            {content.text}
          </p>
        </div>
        <Button className="w-full" onClick={() => setStep(1)}>
          Continue to Questions <ChevronRight size={16} />
        </Button>
      </div>
    );
  }

  const q = content.questions[qIdx];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Progress
          value={(qIdx / content.questions.length) * 100}
          className="flex-1"
        />
        <span className="text-sm text-neutral-400">
          {qIdx + 1} / {content.questions.length}
        </span>
      </div>
      <h2 className="font-serif text-xl font-semibold mb-6">
        {content.questions[qIdx].question}
      </h2>
      <div className="space-y-3 mb-6">
        {content.questions[qIdx].options.map((opt, i) => {
          const isCorrect =
            content.questions[qIdx].answer === i ||
            opt === content.questions[qIdx].answer;
          let cls =
            'border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white';
          if (showExp) {
            if (isCorrect)
              cls = 'border-green-400 bg-green-50 text-green-700';
            else if (i === selectedAns)
              cls = 'border-red-400 bg-red-50 text-red-700';
            else
              cls = 'border-neutral-100 bg-neutral-50 text-neutral-400';
          }
          return (
            <button
              key={i}
              onClick={() => {
                if (!showExp) {
                  setSelectedAns(i);
                  setShowExp(true);
                  if (!isCorrect) {
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
      {showExp && content.questions[qIdx].explanation && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-4">
          💡 {content.questions[qIdx].explanation}
        </div>
      )}
      {showExp && (
        <Button
          className="w-full"
          onClick={() => {
            if (qIdx === content.questions.length - 1) {
              onComplete();
            } else {
              setQIdx((i) => i + 1);
              setSelectedAns(null);
              setShowExp(false);
            }
          }}
        >
          {qIdx === content.questions.length - 1
            ? 'Complete Lesson ✓'
            : 'Next'}{' '}
          <ChevronRight size={16} />
        </Button>
      )}
    </div>
  );
}
