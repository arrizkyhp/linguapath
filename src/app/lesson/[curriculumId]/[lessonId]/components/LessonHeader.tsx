'use client';

import { ChevronLeft } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import type { LESSON_TYPE_CONFIG } from '@/lib/config';
import type { LessonType } from '@/types/curriculum';

type LessonHeaderProps = {
  curriculumTitle: string;
  lessonTitle: string;
  lessonType: LessonType;
  xp: number;
  alreadyComplete: boolean;
  onBack: () => void;
  typeCfg: (typeof LESSON_TYPE_CONFIG)[LessonType];
};

export function LessonHeader({
  curriculumTitle,
  lessonTitle,
  lessonType,
  xp,
  alreadyComplete,
  onBack,
  typeCfg,
}: LessonHeaderProps) {
  return (
    <div className="border-b border-neutral-100 px-8 py-4 flex items-center gap-4 bg-white">
      <button
        onClick={onBack}
        className="text-neutral-400 hover:text-neutral-700 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex-1">
        <div className="text-xs text-neutral-400">{curriculumTitle}</div>
        <div className="font-semibold text-sm">{lessonTitle}</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span>{typeCfg.icon}</span>
        <span>{typeCfg.label}</span>
        <span className="text-yellow-500 font-semibold">+{xp} XP</span>
      </div>
      {alreadyComplete && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 size={14} /> Completed
        </div>
      )}
    </div>
  );
}
