import { useState, useCallback } from 'react';

interface UseLessonProgressState {
  completed: boolean;
  progress: number;
  lastAccessed: Date | null;
}

interface UseLessonProgressActions {
  markComplete: () => void;
  markIncomplete: () => void;
  updateProgress: (percent: number) => void;
  reset: () => void;
}

export function useLessonProgress(
  curriculumId: string,
  lessonId: string
): [UseLessonProgressState, UseLessonProgressActions] {
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastAccessed, setLastAccessed] = useState<Date | null>(null);

  const markComplete = useCallback(() => {
    setCompleted(true);
    setProgress(100);
    setLastAccessed(new Date());
  }, []);

  const markIncomplete = useCallback(() => {
    setCompleted(false);
    setProgress(0);
    setLastAccessed(new Date());
  }, []);

  const updateProgress = useCallback((percent: number) => {
    setProgress(Math.min(100, Math.max(0, percent)));
    setLastAccessed(new Date());
  }, []);

  const reset = useCallback(() => {
    setCompleted(false);
    setProgress(0);
    setLastAccessed(null);
  }, []);

  return [
    {
      completed,
      progress,
      lastAccessed,
    },
    { markComplete, markIncomplete, updateProgress, reset },
  ];
}
