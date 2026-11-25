import type { LearningLesson, LearningProgressSummary } from "@/types/learning";
import {
  CURRICULUM_PROGRESS_KEY,
  fetchCurriculumLessons,
  fetchCompletedLessonIds,
  getCompletedLessonIds,
  getCurriculumProgress,
  saveCurriculumProgress,
  markLessonCompleted,
  toggleLessonCompletion,
  completeLesson,
  uncompleteLesson,
  isLessonCompleted,
  clearCurriculumProgress,
} from "./curriculumStorage";

export {
  CURRICULUM_PROGRESS_KEY,
  fetchCurriculumLessons,
  fetchCompletedLessonIds,
  getCompletedLessonIds,
  getCurriculumProgress,
  saveCurriculumProgress,
  markLessonCompleted,
  toggleLessonCompletion,
  completeLesson,
  uncompleteLesson,
  isLessonCompleted,
  clearCurriculumProgress,
};

// Aliases for backward compatibility
export const getCompletedCurriculumLessonIds = getCompletedLessonIds;
export const saveCompletedCurriculumLessonIds = saveCurriculumProgress;
export const toggleCurriculumLessonCompletion = toggleLessonCompletion;

/**
 * Calculates learning progress metrics safely.
 */
export function calculateLearningProgress(
  lessons: LearningLesson[],
  completedLessonIds: string[] = [],
): LearningProgressSummary {
  const totalLessons = lessons.length;

  if (totalLessons === 0) {
    return {
      totalLessons: 0,
      completedLessons: 0,
      lessonsRemaining: 0,
      progressPercentage: 0,
    };
  }

  const completedSet = new Set(completedLessonIds);
  const completedLessons = lessons.filter(
    (lesson) => lesson.isCompleted || completedSet.has(lesson.id),
  ).length;

  const lessonsRemaining = Math.max(0, totalLessons - completedLessons);
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  return {
    totalLessons,
    completedLessons,
    lessonsRemaining,
    progressPercentage,
  };
}
