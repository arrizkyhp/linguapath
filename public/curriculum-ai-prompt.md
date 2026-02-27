# Curriculum Generation AI Prompt

Use this prompt when asking an AI (ChatGPT, Claude, etc.) to generate a curriculum JSON file.

---

## Usage

1. Pick ONE level: **A1, A2, B1, B2, C1, or C2**
2. Replace `[LEVEL]` in the prompt below with your chosen level
3. Ask the AI to generate the full JSON following the schema and requirements below

> ⚠️ **CRITICAL**: AI tends to generate too few lessons (only 2 per unit). You must STRESS that each unit needs 4-6 lessons and total must be 100+ lessons!

---

## Quick Summary (Read This!)

| Requirement | Minimum | Common AI Mistake |
|-------------|---------|-------------------|
| Modules | 12-15 | Generates only 2-3 ❌ |
| Units per module | 2-3 | OK |
| **Lessons per unit** | **4-6** | **Only generates 2 ❌** |
| Total lessons | 100+ | Generates only ~20 ❌ |
| Listening questions | 5-10 | Generates only 1 ❌ |

---

## IMPORTANT: Question Count Requirements

> ⚠️ **CRITICAL**: This app requires comprehensive content for personal use. Always generate the FULL number of questions specified below. NEVER generate only 1 question.

| Lesson Type | Question Count |
|-------------|-----------------|
| **Listening** | **5-10 questions** |
| **Quiz** | **6-10 questions** |
| **Reading** | **5-10 questions** |
| **Fill in the Blank** | **6-10 sentences** |
| **Flashcard** | **10-15 cards** |
| **Writing** | 1 prompt, min_words: 150-200 |
| **Speaking** | 1 prompt, duration: 60-90 seconds |

---

## "Beginner to Pro" Requirements

Generate a comprehensive curriculum that takes a learner from beginner to mastery of **[LEVEL]**. This means:

- **12-15 modules** covering DIFFERENT topics/themes (this is for personal use, so make it extensive!)
- **2-3 units** per module
- **4-6 lessons** per unit
- Thorough, rich content to fully cover the level
- Mix of all lesson types across the curriculum

> ⚠️ **IMPORTANT**: You MUST generate at least 12 modules. Do NOT generate only 2-3 modules. This is for personal use and needs to be comprehensive!

---

## ⚠️ STRICT: Lessons Per Unit (DO NOT IGNORE)

> **THIS IS THE MOST COMMON PROBLEM**: AI tends to generate only 2 lessons per unit, which is WRONG.

### You MUST have:
- **Minimum 4 lessons per unit** (NOT 2!)
- **Each unit MUST have 4-6 lessons**
- **Total lessons: minimum 100+ lessons** across all modules

### If you only generate 2 lessons per unit, YOU ARE FAILING the requirements.
### Think about the math:
- 12 modules × 2 units × 4 lessons = 96 lessons minimum
- 12 modules × 3 units × 6 lessons = 216 lessons maximum
- Aim for 100-200+ total lessons

### VERIFY BEFORE OUTPUTTING:
- [ ] Does each unit have 4+ lessons?
- [ ] Are there 12-15 modules?
- [ ] Is the total lesson count 100+?

---

## Full JSON Schema

```json
{
  "curriculum": {
    "id": "your-curriculum-id",
    "title": "Curriculum Title",
    "description": "Optional description",
    "level": "[LEVEL]",
    "author": "Optional author name",
    "modules": [
      {
        "id": "m1",
        "title": "Module Title",
        "units": [
          {
            "id": "u1",
            "title": "Unit Title",
            "lessons": [
              {
                "id": "l1",
                "title": "Lesson Title",
                "xp": 50,
                "type": "flashcard",
                "content": {
                  "cards": [
                    {
                      "front": "Front of card",
                      "back": "Back of card",
                      "example": "Optional example sentence"
                    }
                  ]
                }
              },
              {
                "id": "l2",
                "title": "Quiz Lesson",
                "xp": 75,
                "type": "quiz",
                "content": {
                  "questions": [
                    {
                      "question": "Question text?",
                      "options": ["Option A", "Option B", "Option C", "Option D"],
                      "answer": "Option A",
                      "explanation": "Optional explanation"
                    }
                  ]
                }
              },
              {
                "id": "l3",
                "title": "Fill in the Blank Lesson",
                "xp": 50,
                "type": "fill_blank",
                "content": {
                  "sentences": [
                    {
                      "text": "The cat ___ on the mat.",
                      "answer": "sat",
                      "options": ["sat", "sit", "sitting", "sitted"],
                      "explanation": "Past tense of 'sit'"
                    }
                  ]
                }
              },
              {
                "id": "l4",
                "title": "Writing Lesson",
                "xp": 100,
                "type": "writing",
                "content": {
                  "prompt": "Write about your favorite hobby in at least 50 words.",
                  "min_words": 150
                }
              },
              {
                "id": "l5",
                "title": "Speaking Lesson",
                "xp": 75,
                "type": "speech",
                "content": {
                  "prompt": "Introduce yourself in 30 seconds.",
                  "duration_seconds": 60,
                  "keywords_to_use": ["name", "hobby", "origin"]
                }
              },
              {
                "id": "l6",
                "title": "Reading Lesson",
                "xp": 75,
                "type": "reading",
                "content": {
                  "text": "The reading passage goes here...",
                  "questions": [
                    {
                      "question": "What is the main idea?",
                      "options": ["Option A", "Option B", "Option C"],
                      "answer": "Option A"
                    }
                  ]
                }
              },
              {
                "id": "l7",
                "title": "Listening Lesson",
                "xp": 75,
                "type": "listening",
                "content": {
                  "text": "The listening script goes here. Make it 2-3 paragraphs covering the topic.",
                  "voice": "af_heart",
                  "questions": [
                    {
                      "question": "Question text?",
                      "options": ["Option A", "Option B", "Option C", "Option D"],
                      "answer": "Option A",
                      "explanation": "Optional explanation"
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Example: Listening Lesson with 10 Questions

This is what a properly structured listening lesson should look like:

```json
{
  "id": "l7",
  "title": "Listening: Daily Routines",
  "xp": 75,
  "type": "listening",
  "content": {
    "text": "My name is Sarah and I'm a teacher. Every morning, I wake up at 6 AM. I brush my teeth and take a shower. Then I have breakfast - usually toast and coffee. I leave for work at 7:30. I teach at a school near my house, so I walk there. My first class starts at 8:30. I teach English to students of all ages. At noon, I have lunch with my colleagues. After school, I grade papers and prepare lessons for the next day. I usually finish work at 4 PM. In the evening, I cook dinner and spend time with my family. I go to bed at 10 PM.",
    "voice": "af_heart",
    "questions": [
      {
        "question": "What time does Sarah wake up?",
        "options": ["5 AM", "6 AM", "7 AM", "8 AM"],
        "answer": "6 AM"
      },
      {
        "question": "What does Sarah usually have for breakfast?",
        "options": ["Eggs and bacon", "Cereal and milk", "Toast and coffee", "Pancakes"],
        "answer": "Toast and coffee"
      },
      {
        "question": "How does Sarah get to work?",
        "options": ["By bus", "By car", "She walks", "By bike"],
        "answer": "She walks"
      },
      {
        "question": "What time does her first class start?",
        "options": ["7:30", "8:00", "8:30", "9:00"],
        "answer": "8:30"
      },
      {
        "question": "Who does Sarah have lunch with?",
        "options": ["Her students", "Her family", "Her colleagues", "Alone"],
        "answer": "Her colleagues"
      },
      {
        "question": "What does Sarah do after school?",
        "options": ["Goes shopping", "Grades papers and prepares lessons", "Visits friends", "Goes to the gym"],
        "answer": "Grades papers and prepares lessons"
      },
      {
        "question": "What time does Sarah finish work?",
        "options": ["3 PM", "4 PM", "5 PM", "6 PM"],
        "answer": "4 PM"
      },
      {
        "question": "What does Sarah do in the evening?",
        "options": ["Watches TV", "Cooks dinner and spends time with family", "Studies", "Goes out"],
        "answer": "Cooks dinner and spends time with family"
      },
      {
        "question": "What time does Sarah go to bed?",
        "options": ["9 PM", "10 PM", "11 PM", "Midnight"],
        "answer": "10 PM"
      },
      {
        "question": "What is Sarah's profession?",
        "options": ["Doctor", "Teacher", "Nurse", "Engineer"],
        "answer": "Teacher"
      }
    ]
  }
}
```

---

## AI Tips & Reminders

1. **Generate ALL questions** - Never generate only 1 question. Follow the minimum counts above.
2. **Mix lesson types** - Include flashcards, quizzes, fill in the blank, writing, speaking, reading, and listening throughout.
3. **Make content contextual** - Questions should be based on the reading/listening text, not random.
4. **Provide explanations** - Include explanations for quiz and fill in the blank answers when helpful.
5. **Thorough coverage** - This is for personal use, so make it comprehensive!
6. **Valid voice options**: `af_heart`, `af_sarah`, `am_michael`, `bf_emma`, `bm_george`
7. **MUST have 4-6 lessons per unit** - Do NOT generate only 2 lessons!
8. **Total lessons must be 100+** - This is for personal use, you want extensive practice!

---

## Example Prompt to Send to AI

Copy and paste this entire prompt to your AI:

```
Generate a complete English curriculum in JSON format for level [LEVEL]. The curriculum should be comprehensive enough to take a learner from beginner to pro (full mastery) of this level.

⚠️ CRITICAL REQUIREMENTS - THIS IS FOR PERSONAL USE:

1. MODULES: You MUST generate 12-15 modules (NOT 2-3!). This is for personal use and needs extensive content.

2. UNITS: 2-3 units per module

3. LESSONS PER UNIT: ⚠️ THIS IS MOST IMPORTANT!
   - Each unit MUST have 4-6 lessons (NOT 2!)
   - If you generate only 2 lessons per unit, YOU ARE FAILING
   - Total lessons must be 100+ across all modules
   - Think: 12 modules × 2 units × 4 lessons = 96 lessons minimum

4. QUESTION COUNTS:
   - Listening: 5-10 questions (NOT 1!)
   - Quiz: 6-10 questions
   - Reading: 5-10 questions
   - Fill in the blank: 6-10 sentences
   - Flashcard: 10-15 cards

5. Mix of lesson types: flashcard, quiz, fill_blank, writing, speech, reading, listening

Before outputting, verify:
✅ Each unit has 4+ lessons
✅ There are 12-15 modules
✅ Total lesson count is 100+

Use the JSON schema provided. Follow the listening example (10 questions).
```

---
