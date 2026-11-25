"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Flashcard } from "@/types/curriculum";
import { speak } from "@/lib/audio";

interface FlashcardDeckProps {
  flashcards: Flashcard[];
  lessonTopic: string;
}

export default function FlashcardDeck({
  flashcards,
  lessonTopic,
}: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const total = flashcards.length;
  const currentCard = flashcards[currentIndex];

  // Reset flip when card index changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, total]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === " " || e.key === "Enter") {
        // Only flip if not focused on another interactive button
        const target = e.target as HTMLElement;
        if (target && target.tagName !== "BUTTON") {
          e.preventDefault();
          handleFlip();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleFlip]);

  function handlePronounce(e: React.MouseEvent, text: string) {
    e.stopPropagation(); // Avoid flipping the card when clicking the audio icon
    setIsSpeaking(true);
    speak(text, () => {
      setIsSpeaking(false);
    });
  }

  if (!currentCard || total === 0) {
    return (
      <div className="flashcards-empty-box">
        <p>No flashcards available for this lesson.</p>
      </div>
    );
  }

  const progressPct = Math.round(((currentIndex + 1) / total) * 100);

  return (
    <div className="flashcard-deck-container">
      {/* ── Top Bar: Counter & Progress ── */}
      <div className="flashcard-top-bar">
        <div className="flashcard-counter-info">
          <span className="flashcard-counter-label">Card</span>
          <span className="flashcard-counter-number">
            {currentIndex + 1} <span className="flashcard-counter-total">/ {total}</span>
          </span>
        </div>

        <div className="flashcard-progress-track" aria-hidden="true">
          <div
            className="flashcard-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flashcard-pct-label">{progressPct}%</div>
      </div>

      {/* ── 3D Flip Card Scene ── */}
      <div
        className="flashcard-scene"
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={`Flashcard: ${currentCard.term}. Tap or press space to flip.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleFlip();
          }
        }}
      >
        <div className={`flashcard-flipper ${isFlipped ? "flashcard-flipper--flipped" : ""}`}>
          {/* ── FRONT FACE ── */}
          <div className="flashcard-face flashcard-face--front">
            <div className="flashcard-badge-row">
              <span className="flashcard-topic-tag">{lessonTopic}</span>
              <button
                type="button"
                className={`flashcard-audio-btn ${isSpeaking ? "flashcard-audio-btn--active" : ""}`}
                onClick={(e) => handlePronounce(e, currentCard.term)}
                aria-label={`Listen to pronunciation for ${currentCard.term}`}
                title="Pronounce term"
              >
                <span aria-hidden="true">🔊</span>
                <span>Listen</span>
              </button>
            </div>

            <div className="flashcard-front-center">
              <h3 className="flashcard-term-heading">{currentCard.term}</h3>
              <p className="flashcard-phonetic-text">{currentCard.phonetic}</p>
            </div>

            <div className="flashcard-flip-prompt">
              <span aria-hidden="true" className="flashcard-flip-icon">↺</span>
              <span>Tap to flip for Vietnamese explanation</span>
            </div>
          </div>

          {/* ── BACK FACE ── */}
          <div className="flashcard-face flashcard-face--back">
            <div className="flashcard-badge-row">
              <span className="flashcard-meaning-tag">Tiếng Việt</span>
              <button
                type="button"
                className="flashcard-audio-btn"
                onClick={(e) => handlePronounce(e, currentCard.example)}
                aria-label="Listen to example sentence"
                title="Pronounce example sentence"
              >
                <span aria-hidden="true">🔊</span>
                <span>Example</span>
              </button>
            </div>

            <div className="flashcard-back-center">
              <h3 className="flashcard-meaning-heading">{currentCard.meaningVi}</h3>
              <div className="flashcard-example-box">
                <span className="flashcard-example-label">Example in Context:</span>
                <p className="flashcard-example-text">
                  &ldquo;{currentCard.example}&rdquo;
                </p>
              </div>
            </div>

            <div className="flashcard-flip-prompt">
              <span aria-hidden="true" className="flashcard-flip-icon">↺</span>
              <span>Tap to flip back to English</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card Thumbnail Indicators ── */}
      <div className="flashcard-dots-row" aria-label="Flashcard list">
        {flashcards.map((card, idx) => (
          <button
            key={idx}
            type="button"
            className={`flashcard-dot-btn ${idx === currentIndex ? "flashcard-dot-btn--active" : ""}`}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to card ${idx + 1}: ${card.term}`}
            title={card.term}
          >
            <span className="flashcard-dot-num">{idx + 1}</span>
          </button>
        ))}
      </div>

      {/* ── Controls Row ── */}
      <div className="flashcard-controls-row">
        <button
          type="button"
          className="btn-flashcard-nav"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous flashcard"
        >
          <span aria-hidden="true">←</span>
          <span>Previous</span>
        </button>

        <button
          type="button"
          className="btn-flashcard-flip"
          onClick={handleFlip}
          aria-label="Flip flashcard"
        >
          <span aria-hidden="true">↺</span>
          <span>Flip Card</span>
        </button>

        <button
          type="button"
          className="btn-flashcard-nav"
          onClick={handleNext}
          disabled={currentIndex === total - 1}
          aria-label="Next flashcard"
        >
          <span>Next</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <p className="flashcard-keyboard-hint">
        💡 Tip: Use Left / Right arrow keys to navigate, Spacebar to flip.
      </p>
    </div>
  );
}
