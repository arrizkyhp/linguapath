# LinguaPath

Personal English learning app with structured curriculum support.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 16.1.6** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **pnpm**
- **localStorage** (no backend needed)

## Features

- 🎯 **Placement Test** — find your CEFR level (A1–C2) automatically
- 📚 **Curriculum Import** — import any curriculum via JSON file
- 🔒 **Lock System** — lessons unlock progressively
- 7 **Lesson Types**: flashcard, quiz, fill_blank, writing, speech, reading, listening
- 📊 **Progress Tracking** — XP, streaks, completion tracking
- 🧠 **Spaced Repetition** — AI-powered review scheduling using SuperMemo-2 algorithm
- ⚙️ **Settings** — change level, reset progress, clear data

## Curriculum JSON Schema

```json
{
  "curriculum": {
    "id": "unique-id",
    "title": "Curriculum Title",
    "level": "B2",
    "modules": [
      {
        "id": "m1",
        "title": "Module",
        "units": [
          {
            "id": "u1",
            "title": "Unit",
            "lessons": [
              {
                "id": "l1",
                "title": "Lesson",
                "xp": 50,
                "type": "flashcard",
                "content": { "cards": [...] }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Lesson Types

| Type | Content Shape |
|------|--------------|
| `flashcard` | `{ cards: [{ front, back, example? }] }` |
| `quiz` | `{ questions: [{ question, options, answer, explanation? }] }` |
| `fill_blank` | `{ sentences: [{ text, answer, options?, explanation? }] }` |
| `writing` | `{ prompt, min_words?, ai_feedback? }` |
| `speech` | `{ prompt, duration_seconds, keywords_to_use? }` |
| `reading` | `{ text, questions: [...] }` |
| `listening` | `{ text, voice?, questions: [...] }` |
