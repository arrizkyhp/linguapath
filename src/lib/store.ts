import type { AppState, CEFRLevel, Curriculum, CurriculumProgress, LessonProgress, ItemPerformance } from "@/types/curriculum";
import { sampleCurriculum } from "./sampleData";
import { 
  initDB,
  loadStateFromDB,
  saveStateToDB,
  updateStateInDB,
  setLevelInDB,
  completeOnboardingInDB,
  addCurriculumToDB,
  removeCurriculumFromDB,
  getCurriculumProgressFromDB,
  completeLessonInDB,
  updateItemPerformanceInDB,
  scheduleReviewInDB,
  getDueReviewsFromDB,
  getDueReviewsCountFromDB,
  getAllDueReviewsCountFromDB,
  getLessonDifficultItemsFromDB,
  clearDifficultItemsFromDB,
  getCurriculumProgressPercentageFromDB,
  isLessonUnlockedFromDB,
  clearAllDataFromDB,
  exportStateFromDB,
  importStateFromDB,
  saveOpenTabsToDB,
  loadOpenTabsFromDB,
  getUnitProgressFromDB,
  getModuleProgressFromDB,
  isUnitCompletedFromDB,
  isModuleCompletedFromDB,
  getStorageSizeFromDB,
  resetProgressInDB,
  addDays as dbAddDays,
} from "./db";

const STORAGE_KEY = "linguapath_state";
const TABS_KEY = "linguapath_open_tabs";

let dbInitialized = false;

export interface OpenTabs {
  openModules: string[];
  openUnits: string[];
}

export async function ensureDB(): Promise<void> {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

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

export async function loadStateAsync(): Promise<AppState> {
  await ensureDB();
  const state = await loadStateFromDB();
  return state ?? getDefaultState();
}

export async function saveStateAsync(state: AppState): Promise<void> {
  await ensureDB();
  await saveStateToDB(state);
}

export async function updateStateAsync(partial: Partial<AppState>): Promise<AppState> {
  await ensureDB();
  return await updateStateInDB(partial);
}

export async function setLevelAsync(level: CEFRLevel): Promise<void> {
  await ensureDB();
  await setLevelInDB(level);
}

export async function completeOnboardingAsync(level: CEFRLevel): Promise<void> {
  await ensureDB();
  await completeOnboardingInDB(level);
}

export async function setLastLessonAsync(
  curriculumId: string,
  moduleId: string,
  unitId: string,
  lessonId: string
): Promise<void> {
  await ensureDB();
  const state = await loadStateFromDB();
  if (!state) return;
  state.last_lesson = {
    curriculum_id: curriculumId,
    module_id: moduleId,
    unit_id: unitId,
    lesson_id: lessonId,
  };
  await saveStateToDB(state);
}

export async function addCurriculumAsync(curriculum: Curriculum): Promise<void> {
  await ensureDB();
  await addCurriculumToDB(curriculum);
}

export async function removeCurriculumAsync(id: string): Promise<void> {
  await ensureDB();
  await removeCurriculumFromDB(id);
}

export async function getLessonProgressAsync(
  curriculumId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  await ensureDB();
  return await getCurriculumProgressFromDB(curriculumId, lessonId);
}

export async function completeLessonAsync(
  curriculumId: string,
  lessonId: string,
  xp: number,
  itemPerformance?: ItemPerformance[]
): Promise<void> {
  await ensureDB();
  await completeLessonInDB(curriculumId, lessonId, xp, itemPerformance);
}

export async function updateItemPerformanceAsync(
  curriculumId: string,
  lessonId: string,
  itemPerformance: ItemPerformance[]
): Promise<void> {
  await ensureDB();
  await updateItemPerformanceInDB(curriculumId, lessonId, itemPerformance);
}

export async function scheduleReviewAsync(
  curriculumId: string,
  lessonId: string,
  performance: 1 | 2 | 3 | 4 | 5
): Promise<void> {
  await ensureDB();
  await scheduleReviewInDB(curriculumId, lessonId, performance);
}

export async function getDueReviewsAsync(curriculumId: string): Promise<Array<{ lessonId: string; progress: LessonProgress }>> {
  await ensureDB();
  return await getDueReviewsFromDB(curriculumId);
}

export async function getDueReviewsCountAsync(curriculumId: string): Promise<number> {
  await ensureDB();
  return await getDueReviewsCountFromDB(curriculumId);
}

export async function getAllDueReviewsCountAsync(): Promise<number> {
  await ensureDB();
  return await getAllDueReviewsCountFromDB();
}

export async function getLessonDifficultItemsAsync(
  curriculumId: string,
  lessonId: string
): Promise<ItemPerformance[]> {
  await ensureDB();
  return await getLessonDifficultItemsFromDB(curriculumId, lessonId);
}

export async function clearDifficultItemsAsync(
  curriculumId: string,
  lessonId: string
): Promise<void> {
  await ensureDB();
  await clearDifficultItemsFromDB(curriculumId, lessonId);
}

export async function getCurriculumProgressAsync(
  curriculum: Curriculum,
  progress: CurriculumProgress[]
): Promise<number> {
  await ensureDB();
  return await getCurriculumProgressPercentageFromDB(curriculum, progress);
}

export async function isLessonUnlockedAsync(
  curriculumId: string,
  lessonIndex: number,
  allLessonIds: string[]
): Promise<boolean> {
  await ensureDB();
  return await isLessonUnlockedFromDB(curriculumId, lessonIndex, allLessonIds);
}

export async function clearAllDataAsync(): Promise<void> {
  await ensureDB();
  await clearAllDataFromDB();
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export async function exportStateAsync(): Promise<string | null> {
  await ensureDB();
  return await exportStateFromDB();
}

export function exportState(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as AppState;
    const exportData = {
      version: 1,
      exported_at: new Date().toISOString(),
      state: state,
    };
    return JSON.stringify(exportData, null, 2);
  } catch {
    return null;
  }
}

export async function importStateAsync(jsonString: string): Promise<{ success: boolean; error?: string }> {
  await ensureDB();
  return await importStateFromDB(jsonString);
}

export function importState(jsonString: string): { success: boolean; error?: string } {
  if (typeof window === "undefined") return { success: false, error: "Not in browser environment" };
  try {
    const data = JSON.parse(jsonString);
    if (!data.version || !data.state) {
      return { success: false, error: "Invalid export format: missing version or state" };
    }
    if (data.version !== 1) {
      return { success: false, error: `Unsupported export version: ${data.version}` };
    }
    const state = data.state as AppState;
    if (!state.onboarding_complete || !state.current_level || !Array.isArray(state.curriculums)) {
      return { success: false, error: "Invalid state structure" };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { success: true };
  } catch (e) {
    return { success: false, error: `Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}` };
  }
}

export async function saveOpenTabsAsync(curriculumId: string, tabs: OpenTabs): Promise<void> {
  await ensureDB();
  await saveOpenTabsToDB(curriculumId, tabs);
}

export async function loadOpenTabsAsync(curriculumId: string): Promise<OpenTabs | null> {
  await ensureDB();
  return await loadOpenTabsFromDB(curriculumId);
}

export function saveOpenTabs(curriculumId: string, tabs: OpenTabs): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(TABS_KEY);
    const all = stored ? JSON.parse(stored) : {};
    all[curriculumId] = tabs;
    localStorage.setItem(TABS_KEY, JSON.stringify(all));
  } catch {
    // ignore storage errors
  }
}

export function loadOpenTabs(curriculumId: string): OpenTabs | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TABS_KEY);
    if (!stored) return null;
    const all = JSON.parse(stored);
    return all[curriculumId] || null;
  } catch {
    return null;
  }
}

export async function getUnitProgressAsync(unit: { lessons: { id: string }[] }, progress: CurriculumProgress[]): Promise<{ completed: number; total: number; percentage: number }> {
  await ensureDB();
  return await getUnitProgressFromDB(unit, progress);
}

export async function getModuleProgressAsync(module: { units: { lessons: { id: string }[] }[] }, progress: CurriculumProgress[]): Promise<{ completed: number; total: number; percentage: number }> {
  await ensureDB();
  return await getModuleProgressFromDB(module, progress);
}

export async function isUnitCompletedAsync(unit: { lessons: { id: string }[] }, progress: CurriculumProgress[]): Promise<boolean> {
  await ensureDB();
  return await isUnitCompletedFromDB(unit, progress);
}

export async function isModuleCompletedAsync(module: { units: { lessons: { id: string }[] }[] }, progress: CurriculumProgress[]): Promise<boolean> {
  await ensureDB();
  return await isModuleCompletedFromDB(module, progress);
}

export async function getStorageSizeAsync(): Promise<string> {
  await ensureDB();
  return await getStorageSizeFromDB();
}

export function getStorageSize(): string {
  if (typeof window === "undefined") return "0 KB";
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  const bytes = new Blob([raw]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export async function resetProgressAsync(): Promise<AppState> {
  await ensureDB();
  return await resetProgressInDB();
}

export const addDays = dbAddDays;

// Synchronous wrappers for backward compatibility (uses localStorage)
// Use async versions for IndexedDB access

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

export function setLastLesson(
  curriculumId: string,
  moduleId: string,
  unitId: string,
  lessonId: string
): void {
  updateState({
    last_lesson: {
      curriculum_id: curriculumId,
      module_id: moduleId,
      unit_id: unitId,
      lesson_id: lessonId,
    },
  });
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
  if (state.last_lesson?.curriculum_id === id) {
    state.last_lesson = null;
  }
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
  xp: number,
  itemPerformance?: ItemPerformance[]
): void {
  const state = loadState();
  let cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp) {
    cp = { curriculum_id: curriculumId, lessons: {} };
    state.progress = [...state.progress, cp];
  }
  const now = new Date().toISOString();
  
  const difficultItems = itemPerformance?.filter(ip => !ip.correct) || [];
  const incorrectIndices = itemPerformance
    ?.filter(ip => ip.itemType === 'question' || ip.itemType === 'sentence')
    .filter(ip => !ip.correct)
    .map(ip => ip.itemIndex) || [];
  const difficultCardIndices = itemPerformance
    ?.filter(ip => ip.itemType === 'card')
    .filter(ip => !ip.correct)
    .map(ip => ip.itemIndex) || [];

  cp.lessons[lessonId] = {
    completed: true,
    xp_earned: xp,
    completed_at: now,
    next_review_date: addDays(now, 1),
    ease_factor: 2.5,
    review_count: 0,
    interval_days: 1,
    difficult_items: difficultItems.length > 0 ? difficultItems : undefined,
    incorrect_question_indices: incorrectIndices.length > 0 ? incorrectIndices : undefined,
    difficult_card_indices: difficultCardIndices.length > 0 ? difficultCardIndices : undefined,
    total_items: itemPerformance?.length,
    correct_items: itemPerformance?.filter(ip => ip.correct).length,
  };
  state.total_xp += xp;
  saveState(state);
}

export function updateItemPerformance(
  curriculumId: string,
  lessonId: string,
  itemPerformance: ItemPerformance[]
): void {
  const state = loadState();
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp || !cp.lessons[lessonId]) return;

  const progress = cp.lessons[lessonId];
  const difficultItems = itemPerformance.filter(ip => !ip.correct);
  
  const existingDifficult = progress.difficult_items || [];
  const mergedDifficult = mergeItemPerformance(existingDifficult, difficultItems);
  
  cp.lessons[lessonId] = {
    ...progress,
    difficult_items: mergedDifficult.length > 0 ? mergedDifficult : undefined,
  };
  
  saveState(state);
}

function mergeItemPerformance(
  existing: ItemPerformance[],
  newItems: ItemPerformance[]
): ItemPerformance[] {
  const map = new Map<string, ItemPerformance>();
  
  for (const item of existing) {
    const key = `${item.itemType}-${item.itemIndex}`;
    map.set(key, item);
  }
  
  for (const item of newItems) {
    const key = `${item.itemType}-${item.itemIndex}`;
    const existingItem = map.get(key);
    if (existingItem) {
      existingItem.attempts = (existingItem.attempts || 1) + 1;
      if (item.correct) {
        map.delete(key);
      }
    } else if (!item.correct) {
      map.set(key, { ...item, attempts: 1 });
    }
  }
  
  return Array.from(map.values());
}

export function scheduleReview(
  curriculumId: string,
  lessonId: string,
  performance: 1 | 2 | 3 | 4 | 5
): void {
  const state = loadState();
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp || !cp.lessons[lessonId]) return;

  const progress = cp.lessons[lessonId];
  const easeFactor = progress.ease_factor ?? 2.5;
  const interval = progress.interval_days ?? 1;
  const reviewCount = progress.review_count ?? 0;
  const difficultItemsCount = progress.difficult_items?.length || 0;
  const totalItems = progress.total_items || 1;
  const accuracy = (progress.correct_items || 0) / totalItems;

  let newEaseFactor = easeFactor;
  let newInterval = interval;

  const performanceModifier = accuracy < 0.5 ? -0.3 : accuracy < 0.7 ? -0.1 : 0;

  if (performance >= 3) {
    if (reviewCount === 0) {
      newInterval = difficultItemsCount > 0 ? 1 : 3;
    } else if (reviewCount === 1) {
      newInterval = difficultItemsCount > 0 ? 3 : 6;
    } else {
      newInterval = Math.round(interval * (easeFactor + performanceModifier));
    }
    newEaseFactor = easeFactor + (0.1 - (5 - performance) * (0.08 + (5 - performance) * 0.02));
  } else {
    newInterval = 1;
    newEaseFactor = Math.max(1.3, easeFactor - 0.2);
  }

  newEaseFactor = Math.max(1.3, Math.min(3.0, newEaseFactor));
  newInterval = Math.max(1, Math.min(365, newInterval));

  cp.lessons[lessonId] = {
    ...progress,
    ease_factor: newEaseFactor,
    interval_days: newInterval,
    review_count: reviewCount + 1,
    last_review_date: new Date().toISOString(),
    next_review_date: addDays(new Date().toISOString(), newInterval),
  };

  saveState(state);
}

export function getDueReviews(curriculumId: string): Array<{ lessonId: string; progress: LessonProgress }> {
  const state = loadState();
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp) return [];

  const now = new Date().toISOString();
  const due: Array<{ lessonId: string; progress: LessonProgress }> = [];

  for (const [lessonId, progress] of Object.entries(cp.lessons)) {
    if (progress.completed && progress.next_review_date && progress.next_review_date <= now) {
      due.push({ lessonId, progress });
    }
  }

  return due.sort((a, b) => {
    const dateA = new Date(a.progress.next_review_date!).getTime();
    const dateB = new Date(b.progress.next_review_date!).getTime();
    return dateA - dateB;
  });
}

export function getDueReviewsCount(curriculumId: string): number {
  return getDueReviews(curriculumId).length;
}

export function getAllDueReviewsCount(): number {
  const state = loadState();
  let total = 0;
  for (const curriculumId of state.curriculums.map((c) => c.id)) {
    total += getDueReviewsCount(curriculumId);
  }
  return total;
}

export function getLessonDifficultItems(
  curriculumId: string,
  lessonId: string
): ItemPerformance[] {
  const state = loadState();
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp || !cp.lessons[lessonId]) return [];
  
  return cp.lessons[lessonId].difficult_items || [];
}

export function clearDifficultItems(
  curriculumId: string,
  lessonId: string
): void {
  const state = loadState();
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp || !cp.lessons[lessonId]) return;
  
  cp.lessons[lessonId] = {
    ...cp.lessons[lessonId],
    difficult_items: undefined,
    incorrect_question_indices: undefined,
    difficult_card_indices: undefined,
  };
  
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

export function getUnitProgress(unit: { lessons: { id: string }[] }, progress: CurriculumProgress[], curriculumId?: string): { completed: number; total: number; percentage: number } {
  const total = unit.lessons.length;
  if (total === 0) return { completed: 0, total: 0, percentage: 0 };
  
  const curriculumProgress = curriculumId 
    ? progress.find((p) => p.curriculum_id === curriculumId)
    : progress[0];
  
  if (!curriculumProgress) return { completed: 0, total, percentage: 0 };
  
  const completed = unit.lessons.filter((lesson) => {
    const lp = curriculumProgress?.lessons[lesson.id];
    return lp?.completed === true;
  }).length;
  
  return { completed, total, percentage: Math.round((completed / total) * 100) };
}

export function getModuleProgress(module: { units: { lessons: { id: string }[] }[] }, progress: CurriculumProgress[], curriculumId?: string): { completed: number; total: number; percentage: number } {
  const allLessons = module.units.flatMap((u) => u.lessons);
  const total = allLessons.length;
  if (total === 0) return { completed: 0, total: 0, percentage: 0 };
  
  const curriculumProgress = curriculumId 
    ? progress.find((p) => p.curriculum_id === curriculumId)
    : progress[0];
  
  if (!curriculumProgress) return { completed: 0, total, percentage: 0 };
  
  const completed = allLessons.filter((lesson) => {
    const lp = curriculumProgress.lessons[lesson.id];
    return lp?.completed === true;
  }).length;
  
  return { completed, total, percentage: Math.round((completed / total) * 100) };
}

export function isUnitCompleted(unit: { lessons: { id: string }[] }, progress: CurriculumProgress[], curriculumId?: string): boolean {
  const prog = getUnitProgress(unit, progress, curriculumId);
  return prog.total > 0 && prog.completed === prog.total;
}

export function isModuleCompleted(module: { units: { lessons: { id: string }[] }[] }, progress: CurriculumProgress[], curriculumId?: string): boolean {
  const prog = getModuleProgress(module, progress, curriculumId);
  return prog.total > 0 && prog.completed === prog.total;
}
