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
- **Zero data loss** — Seamless migration preserves all progress

### Backup Your Progress

We recommend **exporting your progress regularly** (Settings → Export Progress) to prevent data loss from:
- Browser data clearing
- Browser updates
- Device changes

### Storage Architecture

```typescript
// IndexedDB Tables
- state: { key, state: AppState }      // User progress, XP, streaks, curriculums
- tabs:  { curriculumId, tabs }         // Expanded modules/units per curriculum
- meta:  { key, migrated, timestamp }   // Migration tracking
```

### API Pattern

```typescript
// Async-first (uses IndexedDB)
await loadStateAsync()
await saveStateAsync(state)
await completeLessonAsync(...)

// Sync fallback (uses localStorage, legacy only)
loadState()
saveState(state)
```

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

## Project Structure

```
linguapath/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # User dashboard with stats
│   │   ├── curriculum/         # Curriculum list and detail
│   │   ├── lesson/             # Lesson player (all types)
│   │   ├── reviews/            # Spaced repetition reviews
│   │   ├── import/             # Import curriculum JSON
│   │   ├── settings/           # Export/import, clear data
│   │   └── onboarding/         # Level selection, placement test
│   ├── lib/
│   │   ├── db.ts               # Dexie IndexedDB layer
│   │   ├── store.ts            # State management (async + sync)
│   │   ├── config.ts           # CEFR levels, lesson type config
│   │   └── sampleData.ts       # Sample curriculum, placement test
│   ├── components/
│   │   ├── AppLayout.tsx       # Main layout with sidebar
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── ui/                 # shadcn/ui components
│   └── types/
│       └── curriculum.ts       # TypeScript type definitions
├── public/
│   └── curriculum-template.json
└── package.json
```

## Key Features

### IndexedDB Migration

On first load after install/update:
1. Checks if localStorage has existing data
2. Copies all data to IndexedDB (state + tabs)
3. Marks migration complete in meta table
4. All subsequent operations use IndexedDB

```typescript
// AppLayout.tsx - Initializes DB on app start
useEffect(() => {
  async function init() {
    await ensureDB()        // Migrate if needed
    const s = await loadStateAsync()  // Read from IndexedDB
    setState(s)
  }
  init()
}, [])
```

### Export/Import Format

```json
{
  "version": 1,
  "exported_at": "2026-03-08T12:00:00.000Z",
  "state": {
    "onboarding_complete": true,
    "current_level": "B2",
    "total_xp": 500,
    "streak_days": 7,
    "curriculums": [...],
    "progress": [...]
  }
}
```

### Spaced Repetition (SuperMemo-2)

Review scheduling based on performance rating (1-5):
- Rating ≥ 3: Increases interval using ease factor
- Rating < 3: Resets interval to 1 day
- Adjusts ease factor based on difficulty
- Tracks difficult items per lesson

---

Built with ❤️ for English learners everywhere.
