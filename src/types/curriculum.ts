export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type LessonType =
  | "flashcard"
  | "quiz"
  | "fill_blank"
  | "writing"
  | "speech"
  | "reading";

// ── Lesson Content Types ─────────────────────────────────────

export interface FlashcardContent {
  cards: {
    front: string;
    back: string;
    example?: string;
  }[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
}

export interface FillBlankContent {
  sentences: {
    text: string;
    answer: string;
    options?: string[];
    explanation?: string;
  }[];
}

export interface WritingContent {
  prompt: string;
  min_words?: number;
  ai_feedback?: boolean;
}

export interface SpeechContent {
  prompt: string;
  duration_seconds: number;
  keywords_to_use?: string[];
}

export interface ReadingContent {
  text: string;
  questions: QuizQuestion[];
}

export type LessonContent =
  | FlashcardContent
  | QuizContent
  | FillBlankContent
  | WritingContent
  | SpeechContent
  | ReadingContent;

// ── Curriculum Structure ─────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  xp: number;
  type: LessonType;
  content: LessonContent;
}

export interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  units: Unit[];
}

export interface Curriculum {
  id: string;
  title: string;
  description?: string;
  level: CEFRLevel;
  next_level_curriculum_id?: string;
  author?: string;
  modules: Module[];
}

export interface CurriculumFile {
  curriculum: Curriculum;
}

// ── Progress Types ───────────────────────────────────────────

export interface LessonProgress {
  completed: boolean;
  xp_earned: number;
  completed_at?: string;
}

export interface CurriculumProgress {
  curriculum_id: string;
  lessons: Record<string, LessonProgress>; // key = lesson id
}

// ── App State (localStorage) ─────────────────────────────────

export interface AppState {
  onboarding_complete: boolean;
  current_level: CEFRLevel;
  total_xp: number;
  streak_days: number;
  last_active_date: string;
  last_lesson: {
    curriculum_id: string;
    module_id: string;
    unit_id: string;
    lesson_id: string;
  } | null;
  curriculums: Curriculum[];
  progress: CurriculumProgress[];
}
