import type { CEFRLevel } from "@/types/curriculum";

export const LEVEL_CONFIG: Record<CEFRLevel, { color: string; bg: string; border: string; label: string; description: string }> = {
  A1: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "A1", description: "Beginner" },
  A2: { color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4", label: "A2", description: "Elementary" },
  B1: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "B1", description: "Intermediate" },
  B2: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", label: "B2", description: "Upper Intermediate" },
  C1: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", label: "C1", description: "Advanced" },
  C2: { color: "#b45309", bg: "#fffbeb", border: "#fde68a", label: "C2", description: "Proficiency" },
};

export const LEVEL_ORDER: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const LESSON_TYPE_CONFIG = {
  flashcard: { icon: "🃏", label: "Flashcard", color: "#2563eb" },
  quiz: { icon: "❓", label: "Quiz", color: "#7c3aed" },
  fill_blank: { icon: "✏️", label: "Fill in the Blank", color: "#0d9488" },
  writing: { icon: "✍️", label: "Writing", color: "#16a34a" },
  speech: { icon: "🎤", label: "Speaking", color: "#dc2626" },
  reading: { icon: "📖", label: "Reading", color: "#b45309" },
  listening: { icon: "🎧", label: "Listening", color: "#0891b2" },
};
