import type { Curriculum } from '@/types/curriculum'

export interface NextLessonInfo {
  curriculumId: string
  lessonId: string
}

/**
 * Finds the next lesson in a curriculum structure
 * @param curriculum The full curriculum object
 * @param currentModuleId ID of the current module
 * @param currentUnitId ID of the current unit
 * @param currentLessonId ID of the current lesson
 * @returns NextLessonInfo if a next lesson exists, null otherwise
 */
export function findNextLesson(
  curriculum: Curriculum,
  currentModuleId: string,
  currentUnitId: string,
  currentLessonId: string
): NextLessonInfo | null {
  for (let m = 0; m < curriculum.modules.length; m++) {
    const module = curriculum.modules[m]
    if (module.id === currentModuleId) {
      for (let u = 0; u < module.units.length; u++) {
        const unit = module.units[u]
        if (unit.id === currentUnitId) {
          const lessonIndex = unit.lessons.findIndex((l) => l.id === currentLessonId)
          if (lessonIndex < unit.lessons.length - 1) {
            const nextLesson = unit.lessons[lessonIndex + 1]
            return {
              curriculumId: curriculum.id,
              lessonId: nextLesson.id,
            }
          }
          for (let nextUnitIdx = u + 1; nextUnitIdx < module.units.length; nextUnitIdx++) {
            const nextUnit = module.units[nextUnitIdx]
            if (nextUnit.lessons.length > 0) {
              return {
                curriculumId: curriculum.id,
                lessonId: nextUnit.lessons[0].id,
              }
            }
          }
          for (let nextModuleIdx = m + 1; nextModuleIdx < curriculum.modules.length; nextModuleIdx++) {
            const nextModule = curriculum.modules[nextModuleIdx]
            if (nextModule.units.length > 0 && nextModule.units[0].lessons.length > 0) {
              return {
                curriculumId: curriculum.id,
                lessonId: nextModule.units[0].lessons[0].id,
              }
            }
          }
        }
      }
    }
  }
  return null
}
