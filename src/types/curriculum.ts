/**
 * Curriculum & Lesson Types — Milestone P3.1.
 *
 * Models technical English curriculum materials (Renewable Energy theme)
 * for Vietnamese high-school students pursuing STEM and clean-tech careers.
 */

export type LessonCategory =
  | "reading"
  | "vocabulary"
  | "notes"
  | "quiz"
  | "practice";

export type LessonType = "reading" | "flashcard";

export type LessonLevel = "Beginner" | "Intermediate" | "Advanced";

export interface Flashcard {
  term: string;
  phonetic: string;
  meaningVi: string;
  example: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ReadingText {
  paragraphs: string[];
  highlightedTerms?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  topic: string;
  lessonType: LessonType;
  category: LessonCategory;
  readingTime: string; // e.g. "6 mins"
  estimatedMinutes: number; // e.g. 6 (maintains compatibility with LearningLesson)
  level: LessonLevel;
  summary: string;
  description: string; // for compatibility with LearningLesson
  readingText: ReadingText;
  content?: ReadingText;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  comprehensionQuestions?: QuizQuestion[];
  keyTakeaways?: string[];
  isCompleted?: boolean;
}

export type LibraryFilterTab = "all" | "reading" | "flashcards" | "videos";
