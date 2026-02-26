import type { AppState, CEFRLevel, Curriculum, CurriculumProgress, LessonProgress } from "@/types/curriculum";
import { sampleCurriculum } from "./sampleData";

const STORAGE_KEY = "linguapath_state";

export function getDefaultState(): AppState {
  return {
    onboarding_complete: false,
    current_level: "B2",
    total_xp: 0,
    streak_days: 0,
    last_active_date: new Date().toISOString().split("T")[0],
    last_lesson: null,
    curriculums: [sampleCurriculum],
    progress: [],
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return getDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultState();
      saveState(defaults);
      return defaults;
    }
    return JSON.parse(raw) as AppState;
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateState(partial: Partial<AppState>): AppState {
  const current = loadState();
  const updated = { ...current, ...partial };
  saveState(updated);
  return updated;
}

export function setLevel(level: CEFRLevel): void {
  updateState({ current_level: level });
}

export function completeOnboarding(level: CEFRLevel): void {
  updateState({ onboarding_complete: true, current_level: level });
}

export function addCurriculum(curriculum: Curriculum): void {
  const state = loadState();
  const exists = state.curriculums.find((c) => c.id === curriculum.id);
  if (exists) {
    state.curriculums = state.curriculums.map((c) =>
      c.id === curriculum.id ? curriculum : c
    );
  } else {
    state.curriculums = [...state.curriculums, curriculum];
  }
  saveState(state);
}

export function removeCurriculum(id: string): void {
  const state = loadState();
  state.curriculums = state.curriculums.filter((c) => c.id !== id);
  state.progress = state.progress.filter((p) => p.curriculum_id !== id);
  saveState(state);
}

export function getLessonProgress(
  curriculumId: string,
  lessonId: string
): LessonProgress | null {
  const state = loadState();
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp) return null;
  return cp.lessons[lessonId] ?? null;
}

export function completeLesson(
  curriculumId: string,
  lessonId: string,
  xp: number
): void {
  const state = loadState();
  let cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp) {
    cp = { curriculum_id: curriculumId, lessons: {} };
    state.progress = [...state.progress, cp];
  }
  cp.lessons[lessonId] = {
    completed: true,
    xp_earned: xp,
    completed_at: new Date().toISOString(),
  };
  state.total_xp += xp;
  saveState(state);
}

export function getCurriculumProgress(
  curriculum: Curriculum,
  progress: CurriculumProgress[]
): number {
  const cp = progress.find((p) => p.curriculum_id === curriculum.id);
  if (!cp) return 0;
  const totalLessons = curriculum.modules.flatMap((m) =>
    m.units.flatMap((u) => u.lessons)
  ).length;
  if (totalLessons === 0) return 0;
  const completed = Object.values(cp.lessons).filter((l) => l.completed).length;
  return Math.round((completed / totalLessons) * 100);
}

export function isLessonUnlocked(
  curriculumId: string,
  lessonIndex: number,
  allLessonIds: string[]
): boolean {
  if (lessonIndex === 0) return true;
  const prevId = allLessonIds[lessonIndex - 1];
  const prev = getLessonProgress(curriculumId, prevId);
  return prev?.completed === true;
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getStorageSize(): string {
  if (typeof window === "undefined") return "0 KB";
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  const bytes = new Blob([raw]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
