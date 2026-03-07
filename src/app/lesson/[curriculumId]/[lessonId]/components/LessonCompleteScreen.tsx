'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type LessonCompleteScreenProps = {
  xp: number;
  nextLesson: { curriculumId: string; lessonId: string } | null;
  onBackToCurriculum: () => void;
  onDashboard: () => void;
  onNextLesson: () => void;
  isReview?: boolean;
  lessonTitle?: string;
};

export function LessonCompleteScreen({
  xp,
  nextLesson,
  onBackToCurriculum,
  onDashboard,
  onNextLesson,
  isReview = false,
  lessonTitle = 'Lesson',
}: LessonCompleteScreenProps) {
  const router = useRouter();
  
  const replayConfetti = () => {
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'],
      });
    });
  };

  if (nextLesson) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4 relative">
            <span className="relative z-10">🎉</span>
          </div>
          <h2 className="font-serif text-3xl font-bold mb-2">
            {lessonTitle} Complete!
          </h2>
          <p className="text-neutral-500 mb-2">You earned</p>
          <div className="text-4xl font-bold text-yellow-500 mb-8">
            +{xp} XP
          </div>
          <button
            onClick={replayConfetti}
            className="text-2xl mb-4 hover:scale-125 transition-transform inline-block"
            title="Play confetti again"
          >
            🎆
          </button>
          <p className="mb-6 text-neutral-600">
            Ready to continue learning?
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={onNextLesson}
            >
              Next Lesson <ChevronRight size={16} />
            </Button>
            <Button
              variant="outline"
              onClick={onBackToCurriculum}
            >
              {isReview ? 'Back to Review' : 'Back to Curriculum'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex items-center justify-center min-h-[80vh]">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4 relative">
          <span className="relative z-10">🎉</span>
        </div>
        <h2 className="font-serif text-3xl font-bold mb-2">
          Curriculum Complete!
        </h2>
        <p className="text-neutral-500 mb-6">
          You've successfully completed all lessons in this curriculum. Amazing job! 🌟
        </p>
        <div className="text-4xl font-bold text-yellow-500 mb-8">
          +{xp} XP
        </div>
        <button
          onClick={replayConfetti}
          className="text-2xl mb-4 hover:scale-125 transition-transform inline-block"
          title="Play confetti again"
        >
          🎆
        </button>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={onBackToCurriculum}
          >
            {isReview ? 'Back to Review' : 'Back to Curriculum'}
          </Button>
          <Button onClick={onDashboard}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
