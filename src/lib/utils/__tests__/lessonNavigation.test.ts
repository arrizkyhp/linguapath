import { describe, it, expect } from 'vitest'
import { findNextLesson } from '../lessonNavigation'
import type { Curriculum, Lesson, Module, Unit } from '@/types/curriculum'

describe('findNextLesson', () => {
  const mockCurriculum: Curriculum = {
    id: 'test-curriculum',
    title: 'Test Curriculum',
    description: 'Test',
    level: 'A1',
    modules: [
      {
        id: 'module-1',
        title: 'Module 1',
        units: [
          {
            id: 'unit-1',
            title: 'Unit 1',
            lessons: [
              { id: 'lesson-1', title: 'Lesson 1', xp: 10, type: 'quiz', content: { questions: [] } },
              { id: 'lesson-2', title: 'Lesson 2', xp: 10, type: 'quiz', content: { questions: [] } },
              { id: 'lesson-3', title: 'Lesson 3', xp: 10, type: 'quiz', content: { questions: [] } },
            ] as Lesson[],
          },
          {
            id: 'unit-2',
            title: 'Unit 2',
            lessons: [
              { id: 'lesson-4', title: 'Lesson 4', xp: 10, type: 'quiz', content: { questions: [] } },
            ] as Lesson[],
          },
        ] as Unit[],
      },
      {
        id: 'module-2',
        title: 'Module 2',
        units: [
          {
            id: 'unit-3',
            title: 'Unit 3',
            lessons: [
              { id: 'lesson-5', title: 'Lesson 5', xp: 10, type: 'quiz', content: { questions: [] } },
            ] as Lesson[],
          },
        ] as Unit[],
      },
    ] as Module[],
  }

  it('finds next lesson in same unit', () => {
    const result = findNextLesson(mockCurriculum, 'module-1', 'unit-1', 'lesson-1')
    expect(result).toEqual({
      curriculumId: 'test-curriculum',
      lessonId: 'lesson-2',
    })
  })

  it('finds next lesson in next unit', () => {
    const result = findNextLesson(mockCurriculum, 'module-1', 'unit-1', 'lesson-3')
    expect(result).toEqual({
      curriculumId: 'test-curriculum',
      lessonId: 'lesson-4',
    })
  })

  it('finds next lesson in next module', () => {
    const result = findNextLesson(mockCurriculum, 'module-1', 'unit-2', 'lesson-4')
    expect(result).toEqual({
      curriculumId: 'test-curriculum',
      lessonId: 'lesson-5',
    })
  })

  it('returns null when no next lesson', () => {
    const result = findNextLesson(mockCurriculum, 'module-2', 'unit-3', 'lesson-5')
    expect(result).toBeNull()
  })

  it('returns null for last lesson in curriculum', () => {
    // Create curriculum with only 1 lesson
    const singleLessonCurriculum: Curriculum = {
      id: 'test',
      title: 'Test',
      description: 'Test',
      level: 'A1',
      modules: [
        {
          id: 'module-1',
          title: 'Module 1',
          units: [
            {
              id: 'unit-1',
              title: 'Unit 1',
              lessons: [
                { id: 'only-lesson', title: 'Only Lesson', xp: 10, type: 'quiz', content: { questions: [] } },
              ] as Lesson[],
            },
          ] as Unit[],
        },
      ] as Module[],
    }

    const result = findNextLesson(singleLessonCurriculum, 'module-1', 'unit-1', 'only-lesson')
    expect(result).toBeNull()
  })
})
