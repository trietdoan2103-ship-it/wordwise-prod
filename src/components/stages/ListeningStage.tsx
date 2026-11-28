"use client";

import { useState, useEffect, useCallback } from "react";
import { useGame } from "@/context/GameContext";
import { listeningItems as defaultListeningItems } from "@/data/listening";
import type { ListeningItem } from "@/types/game";
import { XP } from "@/lib/xp";
import { speak, stopSpeech, isTTSAvailable } from "@/lib/audio";

interface ListeningStageProps {
  onComplete: () => void;
  /** Live country-specific listening items (falls back to static data when empty). */
  items?: ListeningItem[];
}

type AudioState = "idle" | "playing" | "done" | "unavailable";

export default function ListeningStage({ onComplete, items }: ListeningStageProps) {
  const listeningItems =
    items && items.length > 0 ? items : defaultListeningItems;
  const { addXP } = useGame();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [audioState, setAudioState] = useState<AudioState>(() =>
    isTTSAvailable() ? "idle" : "unavailable",
  );

  // Stop any speech when the component unmounts or question changes
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Reset audio state when question changes
  useEffect(() => {
    setAudioState(isTTSAvailable() ? "idle" : "unavailable");
  }, [currentIndex]);

  const isComplete = currentIndex >= listeningItems.length;

  const handlePlay = useCallback(() => {
    if (audioState === "playing") return;
    const item = listeningItems[currentIndex];
    if (!item) return;

    setAudioState("playing");
    speak(item.sentence, () => {
      setAudioState("done");
    });
  }, [audioState, currentIndex]);

  if (isComplete) {
    return (
      <div className="stage-shell stage-theme--listening mx-auto w-full max-w-3xl">
        <div className="stage-shell-card">
          <span className="stage-shell-icon" aria-hidden="true">
            🎉
          </span>
          <h2 className="stage-shell-title">Listening Complete!</h2>
          <p className="stage-shell-desc">
            {listeningItems.length} / {listeningItems.length} questions
            completed
          </p>
          <div className="listen-earned-xp">+{earnedXP} XP</div>
        </div>
        <button
          type="button"
          className="btn-stage-continue"
          onClick={onComplete}
        >
          Continue to Sentence →
        </button>
      </div>
    );
  }

  const item = listeningItems[currentIndex];
  const isCorrect = isSubmitted && selectedOption === item.correctIndex;

  const handleSelect = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null || isSubmitted) return;
    // Stop audio before showing result
    stopSpeech();
    setAudioState("done");
    setIsSubmitted(true);

    if (selectedOption === item.correctIndex) {
      addXP(XP.LISTENING_CORRECT);
      setEarnedXP((prev) => prev + XP.LISTENING_CORRECT);
    }
  };

  const handleNext = () => {
    stopSpeech();
    setSelectedOption(null);
    setIsSubmitted(false);
    setCurrentIndex((prev) => prev + 1);
  };

  return (
    <div className="listen-container stage-theme--listening mx-auto w-full max-w-3xl overflow-x-hidden">
      {/* ── Stage header ── */}
      <div className="listen-header">
        <span className="listen-icon" aria-hidden="true">
          🎧
        </span>
        <span className="listen-title-text">Listening</span>
      </div>

      <div className="listen-progress">
        Question {currentIndex + 1} / {listeningItems.length}
      </div>

      {/* ── Main card ── */}
      <div className="listen-card relative z-10 pointer-events-auto">
        {/* Scenario label */}
        <p className="listen-scenario">
          <span aria-hidden="true">☕</span> {item.scenario}
        </p>

        {/* Audio player section */}
        <div className="listen-audio-section">
          <p className="listen-audio-label">Listen to the conversation:</p>

          {audioState === "unavailable" ? (
            <div className="listen-tts-unavailable" role="status">
              <span aria-hidden="true">🔇</span>
              <span>
                Audio not available in your browser. Read the sentence and
                answer the question below.
              </span>
              <blockquote className="listen-transcript-fallback">
                &ldquo;{item.sentence}&rdquo;
              </blockquote>
            </div>
          ) : (
            <div className="listen-audio-controls">
              <button
                type="button"
                className={`btn-listen-play btn-listen-play--${audioState}`}
                onClick={handlePlay}
                disabled={audioState === "playing"}
                aria-label={
                  audioState === "playing"
                    ? "Audio is playing"
                    : audioState === "done"
                      ? "Replay audio"
                      : "Play audio"
                }
              >
                {audioState === "idle" && (
                  <>
                    <span className="play-icon" aria-hidden="true">
                      ▶
                    </span>
                    Play Audio
                  </>
                )}
                {audioState === "playing" && (
                  <>
                    <span className="play-icon playing-anim" aria-hidden="true">
                      🔊
                    </span>
                    Playing…
                  </>
                )}
                {audioState === "done" && (
                  <>
                    <span className="play-icon" aria-hidden="true">
                      ↻
                    </span>
                    Replay Audio
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Question */}
        <h3 className="listen-question">{item.question}</h3>

        {/* Options */}
        <div className="listen-options">
          {item.options.map((opt, i) => {
            const isSelected = selectedOption === i;
            const isCorrectOption = i === item.correctIndex;

            let btnClass = "vocab-option relative z-10 pointer-events-auto"; // reuse Vocabulary option styles
            if (isSelected && !isSubmitted) {
              btnClass += " vocab-option--selected";
            } else if (isSubmitted) {
              if (isCorrectOption) {
                btnClass += " vocab-option--correct";
              } else if (isSelected) {
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

      {/* ── Actions ── */}
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
                isCorrect
                  ? "vocab-feedback--correct"
                  : "vocab-feedback--incorrect"
              }`}
            >
              {isCorrect ? (
                <>
                  <span className="feedback-icon">✓</span> Correct!{" "}
                  <span className="feedback-xp">
                    +{XP.LISTENING_CORRECT} XP
                  </span>
                </>
              ) : (
                <>
                  <span className="feedback-icon">✗</span> Incorrect. The
                  answer is:{" "}
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
