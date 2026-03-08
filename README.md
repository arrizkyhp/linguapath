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
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **TanStack Query**
- **pnpm**
- **IndexedDB** (via Dexie.js) — async storage with 50MB+ capacity
- **localStorage** fallback (legacy support)

### AI & ML

- **Whisper** (`onnx-community/whisper-base`) — On-device speech-to-text for speech lessons
- **Kokoro TTS** (`onnx-community/Kokoro-82M-v1.0-ONNX`) — On-device text-to-speech for listening lessons
- **LanguageTool API** — Grammar checking for writing lessons
- **Hugging Face Transformers** — Web ML inference in the browser

## Features

- 🎯 **Placement Test** — find your CEFR level (A1–C2) automatically
- 📚 **Curriculum Import** — import any curriculum via JSON file with validation
- 🔒 **Lock System** — lessons unlock progressively
- 💾 **Export/Import Progress** — backup and restore your learning data
- 7 **Lesson Types**: flashcard, quiz, fill_blank, writing, speech, reading, listening

### AI-Powered Features

- 🎤 **Speech Lessons** — Whisper AI transcription with real-time mic feedback
- 🎧 **Listening Lessons** — Kokoro TTS with adjustable speed (0.75x–1.25x)
- ✍️ **Writing Lessons** — LanguageTool grammar checking + AI feedback (ChatGPT/Claude/Gemini)
- 📖 **Reading Lessons** — Comprehension passages with questions

### Gamification

- 📊 **Progress Tracking** — XP, streaks, completion tracking
- 🎉 **Celebrations** — Confetti on lesson completion
- 🔥 **Daily Challenges** — Random writing/speaking prompts on dashboard
- 📈 **Progress Bars** — Visual completion for curriculums/modules/units

### Spaced Repetition

- 🧠 **SuperMemo-2 Algorithm** — AI-powered review scheduling
- ⭐ **Performance Rating** — Rate your recall (1–5) after each review
- 📅 **Smart Scheduling** — Reviews based on difficulty and ease factor

### Data Management

- ✅ **JSON Validator** — Schema validation with clear error messages before import
- 📤 **Export Progress** — Download your progress as JSON backup
- 📥 **Import Backup** — Restore from previously exported backup
- 💾 **IndexedDB Storage** — Async storage with 50MB+ capacity (via Dexie.js)
- 🔀 **Auto-Migration** — Seamless one-time migration from localStorage

### Settings

- ⚙️ **Level Configuration** — Change CEFR level anytime
- 🗑️ **Reset Progress** — Clear lesson completions and XP
- 🔴 **Clear All Data** — Delete everything and restart onboarding

---

## Data Storage & Migration

All user data is stored **locally in your browser** using **IndexedDB** (via Dexie.js):

- **50MB+ capacity** — 10x more than localStorage
- **Async operations** — No UI blocking
- **Automatic migration** — Existing localStorage data is migrated on first load

### Backup Your Progress

We recommend **exporting your progress regularly** (Settings → Export Progress) to prevent data loss from:
- Browser data clearing
- Browser updates
- Device changes

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

| Type | Icon | Features | Content Shape |
|------|------|----------|---------------|
| `flashcard` | 🃏 | Flip cards, shuffle, mark difficult | `{ cards: [{ front, back, example? }] }` |
| `quiz` | ❓ | Multiple choice, explanations | `{ questions: [{ question, options, answer, explanation? }] }` |
| `fill_blank` | ✏️ | Sentence completion, instant feedback | `{ sentences: [{ text, answer, options?, explanation? }] }` |
| `writing` | ✍️ | Grammar checking (LanguageTool), AI feedback | `{ prompt, min_words?, ai_feedback? }` |
| `speech` | 🎤 | Whisper transcription, timer, keyword detection | `{ prompt, duration_seconds, keywords_to_use? }` |
| `reading` | 📖 | Comprehension passages | `{ text, questions: [...] }` |
| `listening` | 🎧 | Kokoro TTS audio, speed control | `{ text, voice?, speed?, questions: [...] }` |
