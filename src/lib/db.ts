import Dexie, { Table } from "dexie";
import type { AppState } from "@/types/curriculum";
import type { OpenTabs } from "./store";

export interface DBState {
  key: string;
  state: AppState;
}

export interface TabsState {
  curriculumId: string;
  tabs: OpenTabs;
}

export interface MigrationMeta {
  key: string;
  migrated: boolean;
  timestamp: string;
}

class LinguaPathDB extends Dexie {
  state!: Table<DBState, string>;
  tabs!: Table<TabsState, string>;
  meta!: Table<MigrationMeta, string>;

  constructor() {
    super("linguapath");
    
    this.version(1).stores({
      state: "key",
      tabs: "curriculumId",
      meta: "key",
    });
  }
}

export const db = new LinguaPathDB();

export async function initDB(): Promise<void> {
  await db.open();
  await migrateFromLocalStorage();
}

async function migrateFromLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  const meta = await db.meta.get("migration");
  if (meta?.migrated) return;

  try {
    const raw = localStorage.getItem("linguapath_state");
    if (!raw) {
      await markMigrationComplete();
      return;
    }

    const state = JSON.parse(raw) as AppState;
    await db.state.put({ key: "main", state });

    const tabsRaw = localStorage.getItem("linguapath_open_tabs");
    if (tabsRaw) {
      const allTabs = JSON.parse(tabsRaw) as Record<string, OpenTabs>;
      const tabsArray = Object.entries(allTabs).map(([curriculumId, tabs]) => ({
        curriculumId,
        tabs,
      }));
      if (tabsArray.length > 0) {
        await db.tabs.bulkPut(tabsArray);
      }
    }

    localStorage.setItem("linguapath_state", JSON.stringify({ ...state, _migrated_to_indexeddb: true }));
    await markMigrationComplete();
    console.log("[DB] Migration from localStorage completed successfully");
  } catch (error) {
    console.error("[DB] Migration failed:", error);
  }
}

async function markMigrationComplete(): Promise<void> {
  await db.meta.put({
    key: "migration",
    migrated: true,
    timestamp: new Date().toISOString(),
  });
}

export async function loadStateFromDB(): Promise<AppState | null> {
  const record = await db.state.get("main");
  return record?.state ?? null;
}

export async function saveStateToDB(state: AppState): Promise<void> {
  await db.state.put({ key: "main", state });
}

export async function updateStateInDB(partial: Partial<AppState>): Promise<AppState> {
  const current = await loadStateFromDB();
  if (!current) {
    throw new Error("No state found in database");
  }
  const updated = { ...current, ...partial };
  await saveStateToDB(updated);
  return updated;
}

export async function setLevelInDB(level: AppState["current_level"]): Promise<void> {
  await updateStateInDB({ current_level: level });
}

export async function completeOnboardingInDB(level: AppState["current_level"]): Promise<void> {
  await updateStateInDB({ onboarding_complete: true, current_level: level });
}

export async function addCurriculumToDB(curriculum: AppState["curriculums"][number]): Promise<void> {
  const state = await loadStateFromDB();
  if (!state) return;
  
  const exists = state.curriculums.find((c) => c.id === curriculum.id);
  if (exists) {
    state.curriculums = state.curriculums.map((c) =>
      c.id === curriculum.id ? curriculum : c
    );
  } else {
    state.curriculums = [...state.curriculums, curriculum];
  }
  await saveStateToDB(state);
}

export async function removeCurriculumFromDB(id: string): Promise<void> {
  const state = await loadStateFromDB();
  if (!state) return;
  
  state.curriculums = state.curriculums.filter((c) => c.id !== id);
  state.progress = state.progress.filter((p) => p.curriculum_id !== id);
  if (state.last_lesson?.curriculum_id === id) {
    state.last_lesson = null;
  }
  await saveStateToDB(state);
}

export async function getCurriculumProgressFromDB(
  curriculumId: string,
  lessonId: string
): Promise<NonNullable<AppState["progress"][number]["lessons"][string]> | null> {
  const state = await loadStateFromDB();
  if (!state) return null;
  
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp) return null;
  return cp.lessons[lessonId] ?? null;
}

export async function completeLessonInDB(
  curriculumId: string,
  lessonId: string,
  xp: number,
  itemPerformance?: import("@/types/curriculum").ItemPerformance[]
): Promise<void> {
  const state = await loadStateFromDB();
  if (!state) return;
  
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
  await saveStateToDB(state);
}

export async function updateItemPerformanceInDB(
  curriculumId: string,
  lessonId: string,
  itemPerformance: import("@/types/curriculum").ItemPerformance[]
): Promise<void> {
  const state = await loadStateFromDB();
  if (!state) return;
  
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
  
  await saveStateToDB(state);
}

function mergeItemPerformance(
  existing: import("@/types/curriculum").ItemPerformance[],
  newItems: import("@/types/curriculum").ItemPerformance[]
): import("@/types/curriculum").ItemPerformance[] {
  const map = new Map<string, import("@/types/curriculum").ItemPerformance>();
  
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

export async function scheduleReviewInDB(
  curriculumId: string,
  lessonId: string,
  performance: 1 | 2 | 3 | 4 | 5
): Promise<void> {
  const state = await loadStateFromDB();
  if (!state) return;
  
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

  await saveStateToDB(state);
}

export async function getDueReviewsFromDB(curriculumId: string): Promise<Array<{ lessonId: string; progress: NonNullable<AppState["progress"][number]["lessons"][string]> }>> {
  const state = await loadStateFromDB();
  if (!state) return [];
  
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp) return [];

  const now = new Date().toISOString();
  const due: Array<{ lessonId: string; progress: NonNullable<AppState["progress"][number]["lessons"][string]> }> = [];

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

export async function getDueReviewsCountFromDB(curriculumId: string): Promise<number> {
  const due = await getDueReviewsFromDB(curriculumId);
  return due.length;
}

export async function getAllDueReviewsCountFromDB(): Promise<number> {
  const state = await loadStateFromDB();
  if (!state) return 0;
  
  let total = 0;
  for (const curriculumId of state.curriculums.map((c) => c.id)) {
    total += await getDueReviewsCountFromDB(curriculumId);
  }
  return total;
}

export async function getLessonDifficultItemsFromDB(
  curriculumId: string,
  lessonId: string
): Promise<import("@/types/curriculum").ItemPerformance[]> {
  const state = await loadStateFromDB();
  if (!state) return [];
  
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp || !cp.lessons[lessonId]) return [];
  
  return cp.lessons[lessonId].difficult_items || [];
}

export async function clearDifficultItemsFromDB(
  curriculumId: string,
  lessonId: string
): Promise<void> {
  const state = await loadStateFromDB();
  if (!state) return;
  
  const cp = state.progress.find((p) => p.curriculum_id === curriculumId);
  if (!cp || !cp.lessons[lessonId]) return;
  
  cp.lessons[lessonId] = {
    ...cp.lessons[lessonId],
    difficult_items: undefined,
    incorrect_question_indices: undefined,
    difficult_card_indices: undefined,
  };
  
  await saveStateToDB(state);
}

export async function getCurriculumProgressPercentageFromDB(
  curriculum: AppState["curriculums"][number],
  progress: AppState["progress"]
): Promise<number> {
  const state = await loadStateFromDB();
  if (!state) return 0;
  
  const cp = state.progress.find((p) => p.curriculum_id === curriculum.id);
  if (!cp) return 0;
  
  const totalLessons = curriculum.modules.flatMap((m) =>
    m.units.flatMap((u) => u.lessons)
  ).length;
  if (totalLessons === 0) return 0;
  
  const completed = Object.values(cp.lessons).filter((l) => l.completed).length;
  return Math.round((completed / totalLessons) * 100);
}

export async function isLessonUnlockedFromDB(
  curriculumId: string,
  lessonIndex: number,
  allLessonIds: string[]
): Promise<boolean> {
  if (lessonIndex === 0) return true;
  const prevId = allLessonIds[lessonIndex - 1];
  const prev = await getCurriculumProgressFromDB(curriculumId, prevId);
  return prev?.completed === true;
}

export async function clearAllDataFromDB(): Promise<void> {
  await db.state.clear();
  await db.tabs.clear();
}

export async function exportStateFromDB(): Promise<string | null> {
  const state = await loadStateFromDB();
  if (!state) return null;
  
  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    state: state,
  };
  return JSON.stringify(exportData, null, 2);
}

export async function importStateFromDB(jsonString: string): Promise<{ success: boolean; error?: string }> {
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
    await saveStateToDB(state);
    return { success: true };
  } catch (e) {
    return { success: false, error: `Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}` };
  }
}

export async function saveOpenTabsToDB(curriculumId: string, tabs: OpenTabs): Promise<void> {
  await db.tabs.put({ curriculumId, tabs });
}

export async function loadOpenTabsFromDB(curriculumId: string): Promise<OpenTabs | null> {
  const record = await db.tabs.get(curriculumId);
  return record?.tabs ?? null;
}

export async function getUnitProgressFromDB(
  unit: { lessons: { id: string }[] },
  progress: AppState["progress"]
): Promise<{ completed: number; total: number; percentage: number }> {
  const state = await loadStateFromDB();
  if (!state) return { completed: 0, total: unit.lessons.length, percentage: 0 };
  
  const curriculumProgress = state.progress.find((p) => p.curriculum_id === state.last_lesson?.curriculum_id) || progress[0];
  
  if (!curriculumProgress) return { completed: 0, total: unit.lessons.length, percentage: 0 };
  
  const completed = unit.lessons.filter((lesson) => {
    const lp = curriculumProgress.lessons[lesson.id];
    return lp?.completed === true;
  }).length;
  
  return { completed, total: unit.lessons.length, percentage: Math.round((completed / unit.lessons.length) * 100) };
}

export async function getModuleProgressFromDB(
  module: { units: { lessons: { id: string }[] }[] },
  progress: AppState["progress"]
): Promise<{ completed: number; total: number; percentage: number }> {
  const state = await loadStateFromDB();
  if (!state) return { completed: 0, total: module.units.flatMap(u => u.lessons).length, percentage: 0 };
  
  const curriculumProgress = state.progress.find((p) => p.curriculum_id === state.last_lesson?.curriculum_id) || progress[0];
  
  if (!curriculumProgress) return { completed: 0, total: module.units.flatMap(u => u.lessons).length, percentage: 0 };
  
  const allLessons = module.units.flatMap((u) => u.lessons);
  const completed = allLessons.filter((lesson) => {
    const lp = curriculumProgress.lessons[lesson.id];
    return lp?.completed === true;
  }).length;
  
  return { completed, total: allLessons.length, percentage: Math.round((completed / allLessons.length) * 100) };
}

export async function isUnitCompletedFromDB(
  unit: { lessons: { id: string }[] },
  progress: AppState["progress"]
): Promise<boolean> {
  const prog = await getUnitProgressFromDB(unit, progress);
  return prog.total > 0 && prog.completed === prog.total;
}

export async function isModuleCompletedFromDB(
  module: { units: { lessons: { id: string }[] }[] },
  progress: AppState["progress"]
): Promise<boolean> {
  const prog = await getModuleProgressFromDB(module, progress);
  return prog.total > 0 && prog.completed === prog.total;
}

export async function getStorageSizeFromDB(): Promise<string> {
  const state = await loadStateFromDB();
  if (!state) return "0 KB";
  
  const raw = JSON.stringify(state);
  const bytes = new Blob([raw]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function resetProgressInDB(): Promise<AppState> {
  const state = await loadStateFromDB();
  if (!state) throw new Error("No state found");
  
  const updated = { 
    ...state, 
    progress: [], 
    total_xp: 0, 
    streak_days: 0, 
    last_lesson: null 
  };
  await saveStateToDB(updated);
  return updated;
}
