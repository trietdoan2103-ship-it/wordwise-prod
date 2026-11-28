"use client";

import { useState, useEffect, useRef } from "react";
import { useGame } from "@/context/GameContext";
import { sentenceItems as defaultSentenceItems } from "@/data/sentences";
import type { SentenceItem } from "@/types/game";

interface SentenceStageProps {
  onComplete: () => void;
  /** Live country-specific sentence assembler rounds (falls back to static data when empty). */
  items?: SentenceItem[];
}

// ─── State machine states ─────────────────────────────────────────────────────
// "playing"   — timer running, player selecting chunks
// "correct"   — player submitted a correct answer; timer stopped
// "incorrect" — player submitted a wrong answer; correct arrangement shown
// "timeout"   — timer expired; correct arrangement shown
// "gameover"  — all lives lost
// "complete"  — all 10 rounds finished with lives remaining
type Phase = "playing" | "correct" | "incorrect" | "timeout" | "gameover" | "complete";

export default function SentenceStage({ onComplete, items }: SentenceStageProps) {
  const sentenceItems =
    items && items.length > 0 ? items : defaultSentenceItems;
  const { addXP, completeStage } = useGame();

  // ── Round index (0-based) ──────────────────────────────────────────────────
  const [roundIndex, setRoundIndex] = useState(0);

  // ── Selection — indices into item.words ───────────────────────────────────
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // ── Lives ─────────────────────────────────────────────────────────────────
  const [lives, setLives] = useState(3);

  // ── Local score (displayed in the top bar; separate from global XP) ───────
  const [score, setScore] = useState(0);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(sentenceItems[0].timeLimit);

  // ── Phase ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("playing");

  // Guard against awarding XP more than once per correct answer
  const xpAwardedRef = useRef(false);

  // ── Derived values ────────────────────────────────────────────────────────
  const item = sentenceItems[roundIndex];
  const totalRounds = sentenceItems.length;

  // ── Reset round state when advancing ─────────────────────────────────────
  // Called whenever roundIndex changes from within handlers (not on initial mount)
  // We do this by re-initialising all round-level state together.

  // ─────────────────────────────────────────────────────────────────────────
  // TIMER — tick every second while "playing"
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, roundIndex]); // restart on each new round

  // ─────────────────────────────────────────────────────────────────────────
  // TIMEOUT side-effect — separated from the tick to avoid stale closure
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && phase === "playing") {
      const newLives = lives - 1;
      setLives(newLives);
      setPhase(newLives <= 0 ? "gameover" : "timeout");
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: deliberately only on timeLeft so we don't need phase/lives in deps
  // and accidentally re-trigger. The guard `phase === "playing"` is read from
  // a stable closure per-render and is sufficient here.

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleBankWordClick = (index: number) => {
    if (phase !== "playing") return;
    if (!selectedIndices.includes(index)) {
      setSelectedIndices((prev) => [...prev, index]);
    }
  };

  const handleAnswerWordClick = (indexInAnswer: number) => {
    if (phase !== "playing") return;
    setSelectedIndices((prev) => {
      const next = [...prev];
      next.splice(indexInAnswer, 1);
      return next;
    });
  };

  const handleSubmit = () => {
    if (phase !== "playing" || selectedIndices.length === 0) return;

    const assembled = selectedIndices.map((i) => item.words[i]).join(" ");
    const isCorrect = assembled.trim() === item.targetSentence.trim();

    if (isCorrect) {
      // Award points — guard with ref to prevent double-award on re-render
      if (!xpAwardedRef.current) {
        xpAwardedRef.current = true;
        setScore((prev) => prev + item.points);
        addXP(item.points);
      }
      setPhase("correct");
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setPhase(newLives <= 0 ? "gameover" : "incorrect");
    }
  };

  const handleContinue = () => {
    const nextIndex = roundIndex + 1;

    if (nextIndex >= totalRounds) {
      // All rounds finished — mark stage complete and show completion screen
      completeStage("sentence");
      setPhase("complete");
    } else {
      // Reset per-round state and advance
      xpAwardedRef.current = false;
      setSelectedIndices([]);
      setTimeLeft(sentenceItems[nextIndex].timeLimit);
      setPhase("playing");
      setRoundIndex(nextIndex);
    }
  };

  const handleRestart = () => {
    xpAwardedRef.current = false;
    setRoundIndex(0);
    setSelectedIndices([]);
    setLives(3);
    setScore(0);
    setTimeLeft(sentenceItems[0].timeLimit);
    setPhase("playing");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SCREENS — complete / gameover
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === "complete") {
    return (
      <div className="stage-shell stage-theme--sentence mx-auto w-full max-w-3xl">
        <div className="stage-shell-card">
          <span className="stage-shell-icon" aria-hidden="true">🎉</span>
          <h2 className="stage-shell-title">Sentence Complete!</h2>
          <p className="stage-shell-desc">
            {totalRounds} / {totalRounds} sentences assembled
          </p>
          <div className="sentence-final-score">
            <span className="sentence-final-score-label">Final Score</span>
            <span className="sentence-final-score-value">{score} pts</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-stage-continue"
          onClick={onComplete}
        >
          Continue →
        </button>
      </div>
    );
  }

  if (phase === "gameover") {
    return (
      <div className="stage-shell stage-theme--sentence mx-auto w-full max-w-3xl">
        <div className="stage-shell-card">
          <span className="stage-shell-icon" aria-hidden="true">💔</span>
          <h2 className="stage-shell-title">Game Over</h2>
          <p className="stage-shell-desc">
            You ran out of lives. Don&apos;t worry — give it another try!
          </p>
          <div className="sentence-final-score">
            <span className="sentence-final-score-label">Score this run</span>
            <span className="sentence-final-score-value">{score} pts</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-stage-continue"
          onClick={handleRestart}
        >
          Try Again ↺
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isSubmitted = phase !== "playing";

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN GAME SCREEN
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="sentence-container stage-theme--sentence mx-auto w-full max-w-3xl overflow-x-hidden">

      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div className="sentence-topbar">
        <div className="sentence-topbar-title">
          <span className="sentence-topbar-icon" aria-hidden="true">🧩</span>
          <span className="sentence-topbar-name">Sentence Assembler</span>
        </div>
        <div className="sentence-topbar-meta">
          <span className="sentence-topic-pill">☀️ Renewable Energy</span>
          <div className="sentence-score-pill" aria-label={`Score: ${score}`}>
            ⭐ {score}
          </div>
          <div className="sentence-lives" aria-label={`Lives remaining: ${lives}`}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < lives ? "life-active" : "life-lost"}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Round Progress + Timer ─────────────────────────────────────── */}
      <div className="sentence-stats-row">
        <div className="sentence-progress">
          Round {item.round} / {totalRounds}
        </div>
        <div className={`sentence-timer ${timeLeft <= 5 ? "timer-warning" : ""}`}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>

      {/* ── Main Card ─────────────────────────────────────────────────── */}
      <div className="sentence-card">
        <p className="sentence-instruction">Build the sentence:</p>

        {/* Assembly Line */}
        <div className="sentence-answer-area" aria-label="Assembly line">
          {selectedIndices.length === 0 ? (
            <span className="sentence-answer-placeholder">
              Tap words below to build your sentence…
            </span>
          ) : (
            selectedIndices.map((originalIndex, i) => (
              <button
                key={`answer-${i}`}
                type="button"
                className="sentence-chip sentence-chip--selected"
                onClick={() => handleAnswerWordClick(i)}
                disabled={isSubmitted}
                aria-label={`Remove "${item.words[originalIndex]}" from answer`}
              >
                {item.words[originalIndex]}
              </button>
            ))
          )}
        </div>

        {/* Correct arrangement reveal (shown on incorrect / timeout) */}
        {(phase === "incorrect" || phase === "timeout") && (
          <div className="sentence-correct-reveal" aria-live="polite">
            <span className="sentence-correct-reveal-label">Correct answer:</span>
            <div className="sentence-correct-reveal-chips">
              {item.targetSentence.split(" ").map((word, i) => (
                <span key={i} className="sentence-chip sentence-chip--reveal">
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Word Bank */}
        <div className="sentence-word-bank" aria-label="Word bank">
          {item.words.map((word, i) => {
            const isSelected = selectedIndices.includes(i);
            return (
              <button
                key={`bank-${i}`}
                type="button"
                className={`sentence-chip ${isSelected ? "sentence-chip--hidden" : ""}`}
                onClick={() => handleBankWordClick(i)}
                disabled={isSelected || isSubmitted}
                aria-hidden={isSelected}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="sentence-actions">

        {/* Feedback banner */}
        {phase === "correct" && (
          <div className="sentence-feedback sentence-feedback--correct">
            <span className="feedback-icon">✓</span>
            <span>
              Perfect!{" "}
              <span className="feedback-xp">+{item.points} pts</span>
            </span>
          </div>
        )}
        {phase === "incorrect" && (
          <div className="sentence-feedback sentence-feedback--incorrect">
            <span className="feedback-icon">✕</span>
            Not quite — check the correct answer above.
          </div>
        )}
        {phase === "timeout" && (
          <div className="sentence-feedback sentence-feedback--incorrect">
            <span className="feedback-icon">⏱️</span>
            Time&apos;s up! See the correct answer above.
          </div>
        )}

        {/* Primary action button */}
        {phase === "playing" ? (
          <button
            type="button"
            className="btn-sentence-submit"
            onClick={handleSubmit}
            disabled={selectedIndices.length === 0}
          >
            Check Answer
          </button>
        ) : (
          /* After any resolved state (correct / incorrect / timeout), show Continue */
          <button
            type="button"
            className="btn-sentence-next"
            onClick={handleContinue}
          >
            {roundIndex === totalRounds - 1 ? "Finish →" : "Next Round →"}
          </button>
        )}
      </div>
    </div>
  );
}
