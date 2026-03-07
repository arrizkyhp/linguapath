import type { Curriculum, Lesson } from "@/types/curriculum";

const mockFlashcardLesson: Lesson = {
  id: "lesson-flashcard-1",
  title: "Vocabulary Set 1",
  xp: 10,
  type: "flashcard",
  content: {
    cards: [
      { front: "Hello", back: "Hola", example: "Hello, how are you?" },
      { front: "Goodbye", back: "Adiós", example: "Goodbye, see you later!" },
    ],
  },
};

const mockQuizLesson: Lesson = {
  id: "lesson-quiz-1",
  title: "Grammar Quiz",
  xp: 15,
  type: "quiz",
  content: {
    questions: [
      {
        question: "What is the past tense of go?",
        options: ["goed", "went", "gone", "going"],
        answer: 1,
        explanation: "Go is an irregular verb.",
      },
    ],
  },
};

const mockFillBlankLesson: Lesson = {
  id: "lesson-fillblank-1",
  title: "Fill in the Blanks",
  xp: 12,
  type: "fill_blank",
  content: {
    sentences: [
      {
        text: "I _____ to the store yesterday.",
        answer: "went",
        options: ["go", "went", "gone", "going"],
        explanation: "Past tense of go is went.",
      },
    ],
  },
};

const mockWritingLesson: Lesson = {
  id: "lesson-writing-1",
  title: "Paragraph Writing",
  xp: 20,
  type: "writing",
  content: {
    prompt: "Write a paragraph about your favorite hobby.",
    min_words: 50,
    ai_feedback: true,
  },
};

const mockSpeechLesson: Lesson = {
  id: "lesson-speech-1",
  title: "Speaking Practice",
  xp: 15,
  type: "speech",
  content: {
    prompt: "Tell me about your daily routine.",
    duration_seconds: 60,
    keywords_to_use: ["morning", "work", "exercise"],
  },
};

const mockReadingLesson: Lesson = {
  id: "lesson-reading-1",
  title: "Short Reading",
  xp: 15,
  type: "reading",
  content: {
    text: "The sun was shining brightly.",
    questions: [
      {
        question: "What was the weather like?",
        options: ["Rainy", "Cloudy", "Sunny", "Windy"],
        answer: 2,
        explanation: "The text says the sun was shining brightly.",
      },
    ],
  },
};

const mockListeningLesson: Lesson = {
  id: "lesson-listening-1",
  title: "Listening Comprehension",
  xp: 15,
  type: "listening",
  content: {
    text: "Good morning. Today we will discuss hydration.",
    voice: "af_heart",
    questions: [
      {
        question: "What will be discussed today?",
        options: ["Exercise", "Hydration", "Sleep", "Music"],
        answer: 1,
        explanation: "The speaker mentions hydration.",
      },
    ],
  },
};

export const mockCurriculum: Curriculum = {
  id: "test-curriculum",
  title: "Test Curriculum",
  description: "Curriculum for testing",
  level: "A1",
  modules: [
    {
      id: "module-1",
      title: "Module 1",
      units: [
        {
          id: "unit-1",
          title: "Unit 1",
          lessons: [
            mockFlashcardLesson,
            mockQuizLesson,
            mockFillBlankLesson,
            mockWritingLesson,
            mockSpeechLesson,
            mockReadingLesson,
            mockListeningLesson,
          ],
        },
      ],
    },
  ],
};

export const mockLessons = {
  flashcard: mockFlashcardLesson,
  quiz: mockQuizLesson,
  fill_blank: mockFillBlankLesson,
  writing: mockWritingLesson,
  speech: mockSpeechLesson,
  reading: mockReadingLesson,
  listening: mockListeningLesson,
};
