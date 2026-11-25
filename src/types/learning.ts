/**
 * Learning Types — Milestone P2.
 *
 * Models curriculum learning materials (Renewable Energy theme)
 * separate from game progress (GameContext / wordwise_progress).
 */

export type { Lesson } from "./curriculum";

export type LessonCategory =
  | "vocabulary"
  | "reading"
  | "notes"
  | "quiz"
  | "practice";

export interface LearningLesson {
  id: string;
  title: string;
  topic: string;
  category: LessonCategory;
  estimatedMinutes: number;
  description: string;
  isCompleted?: boolean;
}

export interface LearningProgressSummary {
  totalLessons: number;
  completedLessons: number;
  lessonsRemaining: number;
  progressPercentage: number;
}
