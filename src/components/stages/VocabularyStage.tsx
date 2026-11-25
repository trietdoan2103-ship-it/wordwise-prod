"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { vocabularyItems as defaultVocabularyItems } from "@/data/vocabulary";
import type { VocabularyItem } from "@/types/game";
import { XP } from "@/lib/xp";

interface VocabularyStageProps {
  onComplete: () => void;
  /** Live country-specific vocabulary (falls back to static data when empty). */
  items?: VocabularyItem[];
}

export default function VocabularyStage({ onComplete, items }: VocabularyStageProps) {
  const vocabularyItems =
    items && items.length > 0 ? items : defaultVocabularyItems;
  const { addXP } = useGame();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  const isComplete = currentIndex >= vocabularyItems.length;

  if (isComplete) {
    return (
      <div className="stage-shell stage-theme--vocabulary">
        <div className="stage-shell-card">
          <span className="stage-shell-icon" aria-hidden="true">
            🎉
          </span>
          <h2 className="stage-shell-title">Vocabulary Complete!</h2>
          <p className="stage-shell-desc">
            {vocabularyItems.length} / {vocabularyItems.length} questions completed
          </p>
          <div className="vocab-earned-xp">+{earnedXP} XP</div>
        </div>
        <button
          type="button"
          className="btn-stage-continue"
          onClick={onComplete}
        >
          Continue to Listening →
        </button>
      </div>
    );
  }

  const item = vocabularyItems[currentIndex];

  const handleSelect = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null || isSubmitted) return;
    setIsSubmitted(true);

    if (selectedOption === item.correctIndex) {
      addXP(XP.VOCABULARY_CORRECT);
      setEarnedXP((prev) => prev + XP.VOCABULARY_CORRECT);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const isCorrect = isSubmitted && selectedOption === item.correctIndex;

  return (
    <div className="vocab-container stage-theme--vocabulary">
      <div className="vocab-header">
        <span className="vocab-icon" aria-hidden="true">📖</span>
        <span className="vocab-title-text">Vocabulary</span>
      </div>

      <div className="vocab-progress">
        Question {currentIndex + 1} / {vocabularyItems.length}
      </div>

      <div className="vocab-card relative z-10 pointer-events-auto">
        <h3 className="vocab-question">{item.question}</h3>

        <div className="vocab-options">
          {item.options.map((opt, i) => {
            const isSelected = selectedOption === i;
            const isCorrectOption = i === item.correctIndex;

            let btnClass = "vocab-option relative z-10 pointer-events-auto";
            if (isSelected && !isSubmitted) {
              btnClass += " vocab-option--selected";
            } else if (isSubmitted) {
              if (isCorrectOption) {
                btnClass += " vocab-option--correct";
              } else if (isSelected && !isCorrectOption) {
                btnClass += " vocab-option--incorrect";
              } else {
                btnClass += " vocab-option--disabled";
              }
            }

            return (
              <button
                key={i}
                type="button"
                className={btnClass}
                onClick={() => handleSelect(i)}
                disabled={isSubmitted}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="vocab-actions relative z-10 pointer-events-auto">
        {!isSubmitted ? (
          <button
            type="button"
            className="btn-vocab-submit"
            onClick={handleSubmit}
            disabled={selectedOption === null}
          >
            Check Answer
          </button>
        ) : (
          <div className="vocab-feedback-area">
            <div
              className={`vocab-feedback ${
                isCorrect ? "vocab-feedback--correct" : "vocab-feedback--incorrect"
              }`}
            >
              {isCorrect ? (
                <>
                  <span className="feedback-icon">✓</span> Correct!{" "}
                  <span className="feedback-xp">+{XP.VOCABULARY_CORRECT} XP</span>
                </>
              ) : (
                <>
                  <span className="feedback-icon">✗</span> Incorrect. The answer is:{" "}
                  <strong className="feedback-correct-text">
                    {item.options[item.correctIndex]}
                  </strong>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn-vocab-next"
              onClick={handleNext}
            >
              Next Question →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
