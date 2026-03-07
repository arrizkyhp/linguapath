'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Lesson, FillBlankContent } from '@/types/curriculum';

type FillBlankLessonProps = {
  lesson: Lesson;
  curriculumId: string;
  curriculumTitle: string;
  alreadyComplete: boolean;
  onComplete: () => void;
  onNavigateBack: () => void;
};

export function FillBlankLesson({
  lesson,
  curriculumId,
  curriculumTitle,
  alreadyComplete,
  onComplete,
  onNavigateBack,
}: FillBlankLessonProps) {
  const [fbIdx, setFbIdx] = useState(0);
  const [fbSelected, setFbSelected] = useState<string | null>(null);
  const [fbShowExp, setFbShowExp] = useState(false);
  const [incorrectQuestionIndices, setIncorrectQuestionIndices] = useState<number[]>([]);

  const content = lesson.content as FillBlankContent;
  const s = content.sentences[fbIdx];
  const isLastS = fbIdx === content.sentences.length - 1;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Progress
          value={(fbIdx / content.sentences.length) * 100}
          className="flex-1"
        />
        <span className="text-sm text-neutral-400">
          {fbIdx + 1} / {content.sentences.length}
        </span>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-8 mb-6">
        <p className="font-serif text-xl text-neutral-700 leading-relaxed">
          {s.text.replace(
            '_____',
            fbSelected && fbShowExp ? `[${fbSelected}]` : '_____',
          )}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(s.options ?? [s.answer]).map((opt) => {
          let cls =
            'border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white';
          if (fbShowExp) {
            if (opt === s.answer)
              cls = 'border-green-400 bg-green-50 text-green-700';
            else if (opt === fbSelected)
              cls = 'border-red-400 bg-red-50 text-red-700';
            else cls = 'border-neutral-100 bg-neutral-50 text-neutral-400';
          }
          return (
            <button
              key={opt}
              onClick={() => {
                if (!fbShowExp) {
                  setFbSelected(opt);
                  setFbShowExp(true);
                  if (opt !== s.answer) {
                    setIncorrectQuestionIndices((prev) => [...prev, fbIdx]);
                  }
                }
              }}
              className={`px-4 py-3 rounded-xl border-2 transition-all font-medium ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {fbShowExp && s.explanation && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700 mb-4">
          💡 {s.explanation}
        </div>
      )}
      {fbShowExp && (
        <Button
          className="w-full"
          onClick={() => {
            if (isLastS) {
              onComplete();
            } else {
              setFbIdx((i) => i + 1);
              setFbSelected(null);
              setFbShowExp(false);
            }
          }}
        >
          {isLastS ? 'Complete Lesson ✓' : 'Next '}{' '}
          <ChevronRight size={16} />
        </Button>
      )}
    </div>
  );
}
