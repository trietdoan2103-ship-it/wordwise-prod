"use client";

import React, { useState } from "react";
import type { Lesson } from "@/types/curriculum";
import { completeLesson } from "@/lib/curriculumStorage";

interface LessonQuizProps {
  lesson: Lesson;
  isCompleted: boolean;
  onCompleteLesson: (lessonId: string) => void;
  onReviewReading?: () => void;
}

export default function LessonQuiz({
  lesson,
  isCompleted,
  onCompleteLesson,
  onReviewReading,
}: LessonQuizProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const questions = lesson.quiz;
  const totalQuestions = questions.length;
  const currentQ = questions[currentQuestionIdx];

  // If lesson has no quiz questions
  if (!currentQ || totalQuestions === 0) {
    return (
      <div className="quiz-empty-box">
        <p>No quiz questions available for this lesson.</p>
        {onReviewReading && (
          <button
            type="button"
            className="btn-quiz-retry"
            onClick={onReviewReading}
          >
            ← Return to Reading
          </button>
        )}
      </div>
    );
  }

  function handleSelectOption(idx: number) {
    if (isChecked) return; // Prevent changing after checking
    setSelectedOption(idx);
  }

  function handleCheckAnswer() {
    if (selectedOption === null || isChecked) return;
    setIsChecked(true);

    if (selectedOption === currentQ.correctIndex) {
      setCorrectAnswersCount((prev) => prev + 1);
    }
  }

  function handleNextQuestion() {
    if (currentQuestionIdx < totalQuestions - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsChecked(false);
    } else {
      setIsQuizFinished(true);
    }
  }

  function handleRetryQuiz() {
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsChecked(false);
    setCorrectAnswersCount(0);
    setIsQuizFinished(false);
    setSavedSuccess(false);
  }

  function handleSaveProgress() {
    completeLesson(lesson.id);
    onCompleteLesson(lesson.id);
    setSavedSuccess(true);
  }

  // ── Final Completion Screen ──
  if (isQuizFinished) {
    const percentage = Math.round((correctAnswersCount / totalQuestions) * 100);
    const isPassing = percentage >= 60;

    return (
      <div className="quiz-completion-container">
        <div className="quiz-completion-card">
          <div
            className={`quiz-score-badge ${
              isPassing ? "quiz-score-badge--pass" : "quiz-score-badge--retake"
            }`}
          >
            {isPassing ? "🎉" : "📚"}
          </div>

          <h3 className="quiz-completion-title">
            {isPassing ? "Comprehension Check Passed!" : "Keep Practicing!"}
          </h3>

          <div className="quiz-score-summary">
            <span className="quiz-score-highlight">
              Score: {correctAnswersCount} / {totalQuestions}
            </span>
            <span className="quiz-score-pct">({percentage}%)</span>
            <span className="quiz-score-verdict">
              {percentage === 100
                ? "• Excellent! 100% Mastery"
                : isPassing
                ? "• Great Job! Objective Achieved"
                : "• Score 60% or higher to complete"}
            </span>
          </div>

          <p className="quiz-completion-desc">
            {isPassing
              ? `You've demonstrated a strong understanding of "${lesson.title}". Save your progress to update your learning track.`
              : "Review the technical reading passage and retake the quiz to achieve completion."}
          </p>

          {isPassing && (
            <div className="quiz-action-save-box">
              <button
                type="button"
                className={`btn-quiz-complete-save ${
                  isCompleted || savedSuccess ? "btn-quiz-complete-save--done" : ""
                }`}
                onClick={handleSaveProgress}
                disabled={savedSuccess}
              >
                {savedSuccess || isCompleted ? (
                  <>
                    <span aria-hidden="true">✓</span>
                    <span>Progress Saved! Lesson Completed</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">🌟</span>
                    <span>Complete Lesson &amp; Save Progress</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="quiz-footer-actions">
            <button
              type="button"
              className="btn-quiz-retry"
              onClick={handleRetryQuiz}
            >
              <span aria-hidden="true">↺</span>
              <span>Retry Quiz</span>
            </button>

            {onReviewReading && (
              <button
                type="button"
                className="btn-quiz-review-reading"
                onClick={onReviewReading}
              >
                <span aria-hidden="true">📖</span>
                <span>Review Reading Passage</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Active Question Screen ──
  const isCorrect = isChecked && selectedOption === currentQ.correctIndex;

  return (
    <div className="lesson-quiz-container">
      {/* Top Question Tracker */}
      <div className="quiz-tracker-bar">
        <div className="quiz-tracker-left">
          <span className="quiz-tracker-badge">Reading Comprehension</span>
          <span className="quiz-tracker-count">
            Question <strong>{currentQuestionIdx + 1}</strong> of {totalQuestions}
          </span>
        </div>

        <div className="quiz-tracker-progress" aria-hidden="true">
          <div
            className="quiz-tracker-fill"
            style={{
              width: `${Math.round(((currentQuestionIdx + 1) / totalQuestions) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="quiz-question-card">
        <h3 className="quiz-question-text">
          {currentQ.question}
        </h3>

        {/* Options List */}
        <div className="quiz-options-grid" role="radiogroup" aria-label="Answer options">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isTargetCorrect = idx === currentQ.correctIndex;

            let optionClass = "quiz-option-btn";
            if (isChecked) {
              if (isTargetCorrect) {
                optionClass += " quiz-option--correct";
              } else if (isSelected) {
                optionClass += " quiz-option--incorrect";
              }
            } else if (isSelected) {
              optionClass += " quiz-option--selected";
            }

            return (
              <button
                key={idx}
                type="button"
                className={optionClass}
                onClick={() => handleSelectOption(idx)}
                disabled={isChecked}
                role="radio"
                aria-checked={isSelected}
              >
                <span className="quiz-option-letter">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="quiz-option-text">{option}</span>
                {isChecked && isTargetCorrect && (
                  <span className="quiz-option-status-badge quiz-option-status--correct" aria-hidden="true">
                    ✓ Correct
                  </span>
                )}
                {isChecked && isSelected && !isTargetCorrect && (
                  <span className="quiz-option-status-badge quiz-option-status--incorrect" aria-hidden="true">
                    ✕ Incorrect
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Instant Feedback Explanation */}
        {isChecked && (
          <div
            className={`quiz-feedback-box ${
              isCorrect ? "quiz-feedback-box--correct" : "quiz-feedback-box--incorrect"
            }`}
            role="alert"
          >
            <div className="quiz-feedback-icon" aria-hidden="true">
              {isCorrect ? "✅" : "💡"}
            </div>
            <div className="quiz-feedback-content">
              <strong className="quiz-feedback-title">
                {isCorrect ? "Correct!" : "Not quite right"}
              </strong>
              <p className="quiz-feedback-explanation">
                {currentQ.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="quiz-controls-row">
          {!isChecked ? (
            <button
              type="button"
              className="btn-quiz-check"
              onClick={handleCheckAnswer}
              disabled={selectedOption === null}
            >
              <span>Check Answer</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-quiz-next"
              onClick={handleNextQuestion}
            >
              <span>
                {currentQuestionIdx < totalQuestions - 1
                  ? "Next Question →"
                  : "View Quiz Results →"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
