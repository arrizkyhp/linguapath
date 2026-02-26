import type { Curriculum } from "@/types/curriculum";

export const sampleCurriculum: Curriculum = {
  id: "b2-general-english",
  title: "General English",
  description: "A comprehensive B2 curriculum covering vocabulary, grammar, writing, and more.",
  level: "B2",
  next_level_curriculum_id: "c1-advanced-english",
  author: "LinguaPath",
  modules: [
    {
      id: "m1",
      title: "Advanced Vocabulary",
      description: "Build a rich, nuanced vocabulary for B2 level.",
      units: [
        {
          id: "u1",
          title: "Collocations",
          lessons: [
            {
              id: "l1",
              title: "Make vs Do",
              xp: 40,
              type: "flashcard",
              content: {
                cards: [
                  { front: "make a decision", back: "to decide something", example: "I need to make a decision by tomorrow." },
                  { front: "do homework", back: "to complete school assignments", example: "She always does her homework on time." },
                  { front: "make a mistake", back: "to do something incorrectly", example: "Everyone makes mistakes sometimes." },
                  { front: "do research", back: "to study a subject in depth", example: "He is doing research on climate change." },
                  { front: "make progress", back: "to improve or advance", example: "You're making great progress!" },
                  { front: "do damage", back: "to cause harm", example: "The storm did a lot of damage." },
                ],
              },
            },
            {
              id: "l2",
              title: "Collocation Quiz",
              xp: 50,
              type: "quiz",
              content: {
                questions: [
                  {
                    question: "Which collocation is correct?",
                    options: ["Do a decision", "Make a decision", "Take a decision", "Have a decision"],
                    answer: 1,
                    explanation: "'Make a decision' is the standard collocation. We use 'make' with decisions, plans, and mistakes.",
                  },
                  {
                    question: "Choose the correct form:",
                    options: ["Make homework", "Do homework", "Take homework", "Have homework"],
                    answer: 1,
                    explanation: "'Do homework' is correct. We use 'do' with tasks and activities.",
                  },
                  {
                    question: "Which is correct?",
                    options: ["Do a mistake", "Have a mistake", "Make a mistake", "Take a mistake"],
                    answer: 2,
                    explanation: "'Make a mistake' is the correct collocation in English.",
                  },
                  {
                    question: "She spent the weekend _____ research for her thesis.",
                    options: ["making", "doing", "taking", "having"],
                    answer: 1,
                    explanation: "We always say 'do research', not 'make research'.",
                  },
                  {
                    question: "The company is _____ great progress this quarter.",
                    options: ["doing", "having", "making", "taking"],
                    answer: 2,
                    explanation: "'Make progress' is the fixed collocation.",
                  },
                ],
              },
            },
            {
              id: "l3",
              title: "Fill in the Blanks",
              xp: 40,
              type: "fill_blank",
              content: {
                sentences: [
                  {
                    text: "She needs to _____ a decision by Friday.",
                    answer: "make",
                    options: ["make", "do", "take", "have"],
                    explanation: "'Make a decision' is the correct collocation.",
                  },
                  {
                    text: "I have to _____ my homework before dinner.",
                    answer: "do",
                    options: ["make", "do", "take", "get"],
                    explanation: "We always say 'do homework'.",
                  },
                  {
                    text: "Don't _____ a mistake on the final exam.",
                    answer: "make",
                    options: ["do", "make", "take", "have"],
                    explanation: "'Make a mistake' is the standard phrase.",
                  },
                  {
                    text: "The scientists are _____ research on a new vaccine.",
                    answer: "doing",
                    options: ["making", "doing", "taking", "having"],
                    explanation: "We 'do research', not 'make research'.",
                  },
                ],
              },
            },
          ],
        },
        {
          id: "u2",
          title: "Idioms in Context",
          lessons: [
            {
              id: "l4",
              title: "Common Idioms",
              xp: 40,
              type: "flashcard",
              content: {
                cards: [
                  { front: "bite the bullet", back: "to endure a painful situation", example: "Just bite the bullet and apologize." },
                  { front: "hit the nail on the head", back: "to describe exactly what is causing a situation", example: "You hit the nail on the head with that analysis." },
                  { front: "under the weather", back: "feeling ill or unwell", example: "I'm feeling a bit under the weather today." },
                  { front: "break the ice", back: "to initiate conversation in an awkward situation", example: "He told a joke to break the ice." },
                  { front: "cost an arm and a leg", back: "to be very expensive", example: "That new phone costs an arm and a leg." },
                ],
              },
            },
            {
              id: "l5",
              title: "Idiom Quiz",
              xp: 50,
              type: "quiz",
              content: {
                questions: [
                  {
                    question: "What does 'bite the bullet' mean?",
                    options: ["To eat something hard", "To endure a painful situation", "To be very hungry", "To speak harshly"],
                    answer: 1,
                    explanation: "'Bite the bullet' means to bravely endure a difficult or painful situation.",
                  },
                  {
                    question: "If something 'costs an arm and a leg', it means:",
                    options: ["It's free", "It's cheap", "It's very expensive", "It's broken"],
                    answer: 2,
                    explanation: "This idiom means something is extremely expensive.",
                  },
                  {
                    question: "She was 'under the weather' yesterday. This means she was:",
                    options: ["Outside in the rain", "Feeling ill", "Very happy", "Working hard"],
                    answer: 1,
                    explanation: "'Under the weather' means feeling sick or unwell.",
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      id: "m2",
      title: "Writing Skills",
      description: "Develop clear, structured, and effective writing at B2 level.",
      units: [
        {
          id: "u3",
          title: "Essay Structure",
          lessons: [
            {
              id: "l6",
              title: "Parts of an Essay",
              xp: 40,
              type: "reading",
              content: {
                text: `A well-structured essay consists of three main parts: the introduction, the body, and the conclusion.

The introduction serves to present the topic and provide background information. It should end with a clear thesis statement — a sentence that expresses the main argument or purpose of the essay. A strong introduction captures the reader's attention and makes them want to continue reading.

The body of the essay is where you develop your argument. Each paragraph should focus on a single idea and begin with a topic sentence. Supporting evidence, examples, and analysis follow the topic sentence. Transitions between paragraphs help the essay flow logically.

The conclusion summarizes the main points and restates the thesis in different words. It should leave the reader with a final thought or call to action. Avoid introducing new information in the conclusion.

At B2 level, your writing should demonstrate a range of vocabulary, grammatical accuracy, and coherent organization. Using discourse markers like 'furthermore', 'however', and 'in contrast' will make your writing more sophisticated.`,
                questions: [
                  {
                    question: "What is the purpose of a thesis statement?",
                    options: [
                      "To summarize the conclusion",
                      "To express the main argument of the essay",
                      "To list all the evidence",
                      "To introduce the writer",
                    ],
                    answer: 1,
                    explanation: "A thesis statement expresses the main argument or central claim of the essay.",
                  },
                  {
                    question: "Where should new information NOT be introduced?",
                    options: ["Introduction", "Body paragraph", "Conclusion", "Thesis statement"],
                    answer: 2,
                    explanation: "The conclusion should only summarize existing points, not introduce new information.",
                  },
                  {
                    question: "What does a topic sentence do?",
                    options: [
                      "Ends a paragraph",
                      "Introduces the whole essay",
                      "Focuses each paragraph on a single idea",
                      "Provides statistical evidence",
                    ],
                    answer: 2,
                    explanation: "A topic sentence introduces the main idea of a paragraph.",
                  },
                ],
              },
            },
            {
              id: "l7",
              title: "Write a Short Essay",
              xp: 80,
              type: "writing",
              content: {
                prompt: "Discuss the advantages and disadvantages of working from home. Write 150-200 words. Use discourse markers like 'furthermore', 'however', and 'in contrast'.",
                min_words: 150,
                ai_feedback: false,
              },
            },
            {
              id: "l8",
              title: "Practice Speaking: Opinions",
              xp: 60,
              type: "speech",
              content: {
                prompt: "Talk for 60 seconds about whether you think remote work is better than office work. Give reasons and examples.",
                duration_seconds: 60,
                keywords_to_use: ["furthermore", "in my opinion", "on the other hand", "for instance"],
              },
            },
          ],
        },
      ],
    },
  ],
};

export const placementQuestions = [
  {
    id: "p1",
    question: "Choose the correct sentence:",
    options: [
      "She don't like coffee.",
      "She doesn't likes coffee.",
      "She doesn't like coffee.",
      "She not like coffee.",
    ],
    answer: 2,
    level_if_correct: "A2",
  },
  {
    id: "p2",
    question: "Which word best completes this sentence? 'The project was _____ completed on time.'",
    options: ["successful", "success", "successfully", "succeed"],
    answer: 2,
    level_if_correct: "B1",
  },
  {
    id: "p3",
    question: "Choose the correct form: 'By the time she arrived, they _____ dinner.'",
    options: ["finished", "have finished", "had finished", "were finishing"],
    answer: 2,
    level_if_correct: "B2",
  },
  {
    id: "p4",
    question: "What does 'ubiquitous' mean?",
    options: ["Rare and unusual", "Present everywhere", "Extremely loud", "Very old-fashioned"],
    answer: 1,
    level_if_correct: "C1",
  },
  {
    id: "p5",
    question: "Which sentence uses the subjunctive correctly?",
    options: [
      "I suggest that he goes home.",
      "I suggest that he go home.",
      "I suggest that he would go home.",
      "I suggest that he is going home.",
    ],
    answer: 1,
    level_if_correct: "C1",
  },
  {
    id: "p6",
    question: "Choose the grammatically correct sentence:",
    options: [
      "Neither of the students have finished.",
      "Neither of the students has finished.",
      "Neither of the students is finished.",
      "Neither of the students finishing.",
    ],
    answer: 1,
    level_if_correct: "B2",
  },
  {
    id: "p7",
    question: "What is the passive form of 'Someone stole my bag'?",
    options: [
      "My bag was stolen.",
      "My bag has stolen.",
      "My bag is stealing.",
      "My bag stolen was.",
    ],
    answer: 0,
    level_if_correct: "B1",
  },
  {
    id: "p8",
    question: "Which phrasal verb means 'to cancel'?",
    options: ["Call off", "Call up", "Call in", "Call out"],
    answer: 0,
    level_if_correct: "B2",
  },
  {
    id: "p9",
    question: "'She is known for her _____ attention to detail.' Choose the best word:",
    options: ["meticulous", "good", "quick", "big"],
    answer: 0,
    level_if_correct: "C1",
  },
  {
    id: "p10",
    question: "What is the correct conditional? 'If I _____ you, I would apologize.'",
    options: ["am", "was", "were", "be"],
    answer: 2,
    level_if_correct: "B2",
  },
];
