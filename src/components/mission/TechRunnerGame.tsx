"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/context/GameContext";
import { DEFAULT_USA_TECH_RUNNER_QUESTIONS } from "@/lib/progress";
import type { DbCountryTechRunnerQuestion } from "@/types/database";

interface TechRunnerGameProps {
  onComplete: () => void;
  /** Live country-specific Tech Runner questions across Tiers 1, 2, and 3. */
  questions?: DbCountryTechRunnerQuestion[];
  topicLabel?: string;
}

interface MissedReviewItem {
  prompt: string;
  chosenAnswer: string;
  correctAnswer: string;
  tier: 1 | 2 | 3;
}

export default function TechRunnerGame({
  onComplete,
  questions,
  topicLabel = "Renewable Energy & Smart Grid",
}: TechRunnerGameProps) {
  const { addXP, completeStage } = useGame();

  const pool = useMemo(() => {
    const src =
      questions && questions.length > 0
        ? questions
        : DEFAULT_USA_TECH_RUNNER_QUESTIONS;
    return src.map((q) => {
      const opts = Array.isArray(q.options) ? q.options : ["", "", ""];
      return {
        ...q,
        tier: (q.tier === 1 || q.tier === 2 || q.tier === 3 ? q.tier : 1) as
          | 1
          | 2
          | 3,
        options: [
          opts[0] || "Option A",
          opts[1] || "Option B",
          opts[2] || "Option C",
        ] as [string, string, string],
        correct_index: (q.correct_index === 0 ||
        q.correct_index === 1 ||
        q.correct_index === 2
          ? q.correct_index
          : 0) as 0 | 1 | 2,
      };
    });
  }, [questions]);

  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [runnerLane, setRunnerLane] = useState<0 | 1 | 2>(1);
  const [questionCursor, setQuestionCursor] = useState(0);

  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [missedItems, setMissedItems] = useState<MissedReviewItem[]>([]);

  const [gateState, setGateState] = useState<
    | { status: "active" }
    | { status: "correct"; chosenLane: 0 | 1 | 2; gained: number }
    | {
        status: "incorrect";
        chosenLane: 0 | 1 | 2;
        correctLane: 0 | 1 | 2;
      }
  >({ status: "active" });

  const isGameOver = timeLeft <= 0;
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Determine difficulty tier based on remaining 60-second clock (Spec 3.6)
  // First 20s (60..41): Tier 1 | Middle 20s (40..21): Tier 2 | Final 20s (20..1): Tier 3
  const currentTier: 1 | 2 | 3 =
    timeLeft > 40 ? 1 : timeLeft > 20 ? 2 : 3;

  // Select current question matching the active difficulty tier (or cycle through full pool)
  const currentQuestion = useMemo(() => {
    const tierMatches = pool.filter((q) => q.tier === currentTier);
    const activeList = tierMatches.length > 0 ? tierMatches : pool;
    return activeList[questionCursor % activeList.length] || pool[0];
  }, [pool, currentTier, questionCursor]);

  const isOverdrive = combo >= 3;

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    };
  }, []);

  // 60-second countdown timer
  useEffect(() => {
    if (isGameOver) {
      completeStage("tech_runner");
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameOver, completeStage]);

  const submitGate = useCallback(
    (lane: 0 | 1 | 2) => {
      if (isGameOver || gateState.status !== "active" || !currentQuestion) {
        return;
      }
      setRunnerLane(lane);
      setAnsweredCount((n) => n + 1);

      const isCorrect = lane === currentQuestion.correct_index;

      if (isCorrect) {
        const nextCombo = combo + 1;
        // Spec 3.8: +100 base points; Overdrive (streak >= 3) awards +200 bonus (+300 total)
        const gained = nextCombo >= 3 ? 300 : 100;
        setCombo(nextCombo);
        setScore((s) => s + gained);
        setCorrectCount((c) => c + 1);
        addXP(10);
        setGateState({ status: "correct", chosenLane: lane, gained });

        if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
        nextTimerRef.current = setTimeout(() => {
          setGateState({ status: "active" });
          setQuestionCursor((c) => c + 1);
        }, 700);
      } else {
        setCombo(0);
        setMissedItems((prev) => [
          ...prev,
          {
            prompt: currentQuestion.prompt,
            chosenAnswer: currentQuestion.options[lane],
            correctAnswer:
              currentQuestion.options[currentQuestion.correct_index],
            tier: currentQuestion.tier,
          },
        ]);
        setGateState({
          status: "incorrect",
          chosenLane: lane,
          correctLane: currentQuestion.correct_index,
        });

        // Spec 3.7: highlight correct answer for ~1 second before next gate
        if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
        nextTimerRef.current = setTimeout(() => {
          setGateState({ status: "active" });
          setQuestionCursor((c) => c + 1);
        }, 1050);
      }
    },
    [isGameOver, gateState.status, currentQuestion, combo, addXP]
  );

  // Keyboard controls (Left / Right arrows + Up/Enter/Space to dash through current lane, or 1/2/3 keys)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isGameOver) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        setRunnerLane((l) => (l > 0 ? ((l - 1) as 0 | 1 | 2) : 0));
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        setRunnerLane((l) => (l < 2 ? ((l + 1) as 0 | 1 | 2) : 2));
      } else if (
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        submitGate(runnerLane);
      } else if (e.key === "1") {
        submitGate(0);
      } else if (e.key === "2") {
        submitGate(1);
      } else if (e.key === "3") {
        submitGate(2);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameOver, runnerLane, submitGate]);

  function handleRestart() {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    setTimeLeft(60);
    setScore(0);
    setCombo(0);
    setRunnerLane(1);
    setQuestionCursor(0);
    setAnsweredCount(0);
    setCorrectCount(0);
    setMissedItems([]);
    setGateState({ status: "active" });
  }

  // ── End / Results Screen (00:00) ───────────────────────────────────────────
  if (isGameOver) {
    const incorrectCount = answeredCount - correctCount;
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 overflow-x-hidden rounded-3xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl sm:p-6 md:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl" aria-hidden="true">
            🏁
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Tech Runner Complete!
          </h2>
          <p className="text-sm text-slate-300">
            60-second sprint finished — here is your performance breakdown:
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-amber-400/30 bg-slate-800/90 p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Score
            </p>
            <p className="mt-1 text-2xl font-extrabold text-amber-300">
              {score}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/30 bg-slate-800/90 p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Correct Gates
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-300">
              {correctCount} / {answeredCount}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-400/30 bg-slate-800/90 p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Missed Gates
            </p>
            <p className="mt-1 text-2xl font-extrabold text-rose-300">
              {incorrectCount}
            </p>
          </div>
        </div>

        {/* Reviewable Missed Questions */}
        {missedItems.length > 0 && (
          <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              📋 Review Missed Questions ({missedItems.length})
            </h3>
            <ul className="divide-y divide-slate-800">
              {missedItems.map((m, idx) => (
                <li key={idx} className="py-2.5 text-xs">
                  <p className="font-bold text-slate-100">{m.prompt}</p>
                  <p className="mt-1 text-slate-400">
                    Your lane:{" "}
                    <span className="font-semibold text-rose-400 line-through">
                      {m.chosenAnswer}
                    </span>{" "}
                    • Correct gate:{" "}
                    <span className="font-extrabold text-emerald-300">
                      ✓ {m.correctAnswer}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            Run Again ↺
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-md hover:from-orange-600 hover:to-amber-600 cursor-pointer"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  const tierLabel =
    currentTier === 1
      ? "Tier 1 • Basic Vocab"
      : currentTier === 2
        ? "Tier 2 • Phrases & Prepositions"
        : "Tier 3 • Advanced Grammar & STEM";

  return (
    <div
      className={`mx-auto flex w-full max-w-4xl flex-col gap-4 overflow-x-hidden rounded-3xl border bg-slate-900 p-4 text-white shadow-2xl transition-transform sm:p-5 md:p-7 ${
        gateState.status === "incorrect"
          ? "border-rose-500/80 animate-pulse"
          : isOverdrive
            ? "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.25)]"
            : "border-slate-700"
      }`}
    >
      {/* ── Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500/20 px-3 py-1.5 text-sm font-extrabold text-orange-300 ring-1 ring-orange-400/40">
            <span aria-hidden="true">🏃</span>
            <span>Tech Runner</span>
          </span>
          <span className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300">
            Topic: {topicLabel}
          </span>
          <span className="rounded-xl bg-slate-800 px-2.5 py-1 text-xs font-extrabold text-amber-300">
            {tierLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isOverdrive && (
            <span className="animate-bounce rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow">
              🔥 OVERDRIVE x{combo} (+300 pts)
            </span>
          )}
          <span className="rounded-xl bg-slate-800 px-3 py-1.5 font-mono text-xs font-extrabold text-emerald-300">
            Time: {String(timeLeft).padStart(2, "0")}s
          </span>
          <span className="rounded-xl bg-slate-800 px-3 py-1.5 font-mono text-xs font-extrabold text-amber-300 ring-1 ring-amber-400/30">
            Score: {String(score).padStart(4, "0")}
          </span>
        </div>
      </div>

      {/* ── Question Banner Ahead of the Runner ── */}
      <div className="rounded-2xl border border-orange-400/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 text-center shadow-inner">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-300">
          Incoming Gate Question #{answeredCount + 1} • Streak: {combo}
        </p>
        <p className="mt-1 text-base font-extrabold text-white md:text-lg">
          {currentQuestion?.prompt}
        </p>
      </div>

      {/* ── 3-Lane Running Track Play Area ([ LEFT ] [ CENTER ] [ RIGHT ]) ── */}
      <div
        className="relative grid grid-cols-3 gap-2 rounded-2xl border border-slate-700 bg-slate-950 p-2.5 sm:gap-3 sm:p-4 md:p-6"
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current === null) return;
          const dx =
            (e.changedTouches[0]?.clientX ?? touchStartXRef.current) -
            touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(dx) > 35) {
            if (dx < 0) {
              setRunnerLane((l) => (l > 0 ? ((l - 1) as 0 | 1 | 2) : 0));
            } else {
              setRunnerLane((l) => (l < 2 ? ((l + 1) as 0 | 1 | 2) : 2));
            }
          }
        }}
      >
        {([0, 1, 2] as const).map((laneIdx) => {
          const laneTitle =
            laneIdx === 0 ? "LEFT" : laneIdx === 1 ? "CENTER" : "RIGHT";
          const optionText = currentQuestion?.options[laneIdx] || "";
          const isRunnerHere = runnerLane === laneIdx;

          const isCorrectGate =
            (gateState.status === "correct" &&
              gateState.chosenLane === laneIdx) ||
            (gateState.status === "incorrect" &&
              gateState.correctLane === laneIdx);
          const isWrongChosen =
            gateState.status === "incorrect" &&
            gateState.chosenLane === laneIdx;

          return (
            <button
              key={laneIdx}
              type="button"
              onClick={() => submitGate(laneIdx)}
              disabled={gateState.status !== "active"}
              className={`group relative flex min-h-[200px] min-w-0 flex-col items-center justify-between rounded-2xl border-2 p-2 text-center transition-all sm:min-h-[220px] sm:p-3.5 cursor-pointer ${
                isCorrectGate
                  ? "border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  : isWrongChosen
                    ? "border-rose-500 bg-rose-950/60"
                    : isRunnerHere
                      ? "border-amber-400/90 bg-slate-900/90 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                      : "border-slate-800 bg-slate-900/50 hover:border-orange-400/70 hover:bg-slate-900"
              }`}
              aria-label={`Lane ${laneTitle}: ${optionText}`}
            >
              {/* Lane Header */}
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                [ {laneTitle} ]
              </span>

              {/* Answer Gate Archway */}
              <div
                className={`my-2 flex w-full flex-col items-center justify-center rounded-xl border px-3 py-4 transition-transform ${
                  isCorrectGate
                    ? "border-emerald-300 bg-emerald-500/25 text-emerald-200 scale-105"
                    : isWrongChosen
                      ? "border-rose-400 bg-rose-500/25 text-rose-200"
                      : "border-orange-400/50 bg-orange-500/10 text-white group-hover:scale-105 group-hover:border-orange-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300/90">
                  Gate {laneIdx + 1}
                </span>
                <span className="mt-1 break-words text-xs font-extrabold sm:text-base">
                  {optionText}
                </span>
              </div>

              {/* Dashed Speed Track Lines */}
              <div
                className="h-8 w-0.5 border-l-2 border-dashed border-slate-700"
                aria-hidden="true"
              />

              {/* Runner Character */}
              <div className="flex h-12 items-center justify-center">
                {isRunnerHere ? (
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border-2 text-2xl shadow-lg transition-transform ${
                      isOverdrive
                        ? "border-amber-300 bg-gradient-to-br from-amber-400 to-orange-500 scale-110"
                        : "border-orange-300 bg-orange-500/30"
                    }`}
                    title="Your Runner"
                  >
                    🤖
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-600 group-hover:text-orange-300">
                    Tap to Dash
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Controls & Instant Feedback Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setRunnerLane((l) => (l > 0 ? ((l - 1) as 0 | 1 | 2) : 0))
            }
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            ← Move Left
          </button>
          <button
            type="button"
            onClick={() => submitGate(runnerLane)}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1.5 text-xs font-extrabold text-white shadow cursor-pointer"
          >
            ⚡ Dash Current Lane
          </button>
          <button
            type="button"
            onClick={() =>
              setRunnerLane((l) => (l < 2 ? ((l + 1) as 0 | 1 | 2) : 2))
            }
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            Move Right →
          </button>
        </div>

        {gateState.status === "correct" && (
          <span className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-extrabold text-emerald-300">
            ✓ Speed Boost! +{gateState.gained} pts
          </span>
        )}
        {gateState.status === "incorrect" && (
          <span className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-3.5 py-1.5 text-xs font-extrabold text-rose-300">
            ✕ Impact! Correct gate:{" "}
            {currentQuestion?.options[gateState.correctLane]}
          </span>
        )}
        {gateState.status === "active" && (
          <span className="text-xs text-slate-400">
            Click/tap any lane gate (or use ←/→ + Enter) • 3 in a row activates{" "}
            <strong className="text-amber-300">Overdrive (+300 pts)</strong>
          </span>
        )}
      </div>
    </div>
  );
}
