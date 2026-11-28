"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/context/GameContext";
import {
  DEFAULT_USA_CIRCUIT_BOARDS,
  getCircuitDefaultsForBoard,
} from "@/lib/progress";
import type { DbCountryCircuitBoard } from "@/types/database";

interface CircuitRepairGameProps {
  onComplete: () => void;
  /** Live country-specific circuit boards (falls back to default boards when empty). */
  boards?: DbCountryCircuitBoard[];
}

type CircuitPhase =
  | "playing"
  | "board-solved"
  | "timeout-solution"
  | "gameover"
  | "complete";

interface ShuffledRightNode {
  /** Shuffled display slot index (0..3) */
  rightSlot: number;
  /** Original pair index (0..3) matching the left clue at `pairIndex` */
  pairIndex: number;
  text: string;
}

function deterministicShuffleIndices(count: number, seed: number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i);
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure not identical to 0,1,2,3 when count >= 2
  if (count >= 2 && arr.every((v, idx) => v === idx)) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

export default function CircuitRepairGame({
  onComplete,
  boards,
}: CircuitRepairGameProps) {
  const { addXP, completeStage } = useGame();

  const activeBoards = useMemo(() => {
    const source =
      boards && boards.length > 0 ? boards : DEFAULT_USA_CIRCUIT_BOARDS;
    return source.slice(0, 10).map((b, idx) => {
      const defaults = getCircuitDefaultsForBoard(idx + 1);
      return {
        ...b,
        board_number: b.board_number || idx + 1,
        points: b.points > 0 ? b.points : defaults.points,
        time_limit: b.time_limit > 0 ? b.time_limit : defaults.timeLimit,
        pairs: Array.isArray(b.pairs) ? b.pairs.slice(0, 4) : [],
      };
    });
  }, [boards]);

  const [boardIndex, setBoardIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<CircuitPhase>("playing");

  const currentBoard = activeBoards[boardIndex] || activeBoards[0];
  const totalBoards = activeBoards.length;

  const [timeLeft, setTimeLeft] = useState<number>(
    currentBoard?.time_limit || 30
  );

  // Selection & connection state for the current board
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  /** Map of matched pairIndex (0..3) -> rightSlot (0..3) */
  const [matchedPairs, setMatchedPairs] = useState<Record<number, number>>({});
  const [boardMistakes, setBoardMistakes] = useState(0);
  const [sparkWire, setSparkWire] = useState<{
    leftIdx: number;
    rightSlot: number;
  } | null>(null);
  const [banner, setBanner] = useState<{
    text: string;
    tone: "surge" | "short";
  } | null>(null);

  const timeoutAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build shuffled right-hand answer nodes for the current board
  const rightNodes: ShuffledRightNode[] = useMemo(() => {
    if (!currentBoard) return [];
    const pairs = currentBoard.pairs;
    const order = deterministicShuffleIndices(
      pairs.length,
      (boardIndex + 1) * 37 + currentBoard.id.length
    );
    return order.map((pairIndex, rightSlot) => ({
      rightSlot,
      pairIndex,
      text: pairs[pairIndex]?.answer || "",
    }));
  }, [currentBoard, boardIndex]);

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutAdvanceRef.current) clearTimeout(timeoutAdvanceRef.current);
    };
  }, []);

  // Countdown tick while "playing"
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, boardIndex]);

  // Handle timer reaching 0 -> Short Circuit + 2-second green solution wires reveal
  useEffect(() => {
    if (timeLeft === 0 && phase === "playing") {
      const nextLives = lives - 1;
      setLives(nextLives);
      setSelectedLeft(null);
      setSelectedRight(null);
      setBanner({
        text: "⚡ Time Expired — Short Circuit! -1 Battery (Revealing Solution Circuit...)",
        tone: "short",
      });
      setPhase("timeout-solution");

      if (timeoutAdvanceRef.current) clearTimeout(timeoutAdvanceRef.current);
      timeoutAdvanceRef.current = setTimeout(() => {
        if (nextLives <= 0) {
          setPhase("gameover");
        } else {
          advanceToNextBoard();
        }
      }, 2000);
    }
  }, [timeLeft, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetBoardState(nextIdx: number) {
    const nextB = activeBoards[nextIdx] || activeBoards[0];
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs({});
    setBoardMistakes(0);
    setSparkWire(null);
    setBanner(null);
    setTimeLeft(nextB?.time_limit || 20);
    setPhase("playing");
  }

  function advanceToNextBoard() {
    if (timeoutAdvanceRef.current) {
      clearTimeout(timeoutAdvanceRef.current);
      timeoutAdvanceRef.current = null;
    }
    const nextIdx = boardIndex + 1;
    if (nextIdx >= totalBoards) {
      completeStage("circuit_repair");
      setPhase("complete");
    } else {
      setBoardIndex(nextIdx);
      resetBoardState(nextIdx);
    }
  }

  function handleRestart() {
    if (timeoutAdvanceRef.current) {
      clearTimeout(timeoutAdvanceRef.current);
      timeoutAdvanceRef.current = null;
    }
    setLives(3);
    setScore(0);
    setBoardIndex(0);
    resetBoardState(0);
  }

  function attemptConnection(leftPairIdx: number, rightSlotIdx: number) {
    if (phase !== "playing" || !currentBoard) return;
    const targetNode = rightNodes[rightSlotIdx];
    if (!targetNode) return;

    setSelectedLeft(null);
    setSelectedRight(null);

    if (targetNode.pairIndex === leftPairIdx) {
      // Correct connection!
      const nextMatched = {
        ...matchedPairs,
        [leftPairIdx]: rightSlotIdx,
      };
      setMatchedPairs(nextMatched);

      const solvedCount = Object.keys(nextMatched).length;
      const requiredCount = currentBoard.pairs.length;

      if (solvedCount >= requiredCount) {
        // Board finished! Calculate points + Perfect Circuit bonus (+5 pts if 0 mistakes)
        const basePts = currentBoard.points;
        const perfectBonus = boardMistakes === 0 ? 5 : 0;
        const totalEarned = basePts + perfectBonus;

        setScore((s) => s + totalEarned);
        addXP(totalEarned);
        setBanner({
          text:
            perfectBonus > 0
              ? `⚡ Electric Surge! +${basePts} pts (+5 Perfect Circuit Bonus!)`
              : `⚡ Electric Surge! +${basePts} points`,
          tone: "surge",
        });
        setPhase("board-solved");
      } else {
        setBanner({
          text: "⚡ Circuit node locked!",
          tone: "surge",
        });
      }
    } else {
      // Wrong connection! Short circuit effect + -1 Battery life
      const nextMistakes = boardMistakes + 1;
      const nextLives = lives - 1;
      setBoardMistakes(nextMistakes);
      setLives(nextLives);
      setSparkWire({ leftIdx: leftPairIdx, rightSlot: rightSlotIdx });
      setBanner({
        text: "💥 Short Circuit! -1 Battery",
        tone: "short",
      });

      setTimeout(() => {
        setSparkWire(null);
      }, 650);

      if (nextLives <= 0) {
        // Reveal green solution wires for 2 seconds before Game Over
        setPhase("timeout-solution");
        if (timeoutAdvanceRef.current) clearTimeout(timeoutAdvanceRef.current);
        timeoutAdvanceRef.current = setTimeout(() => {
          setPhase("gameover");
        }, 2000);
      }
    }
  }

  function handleLeftClueClick(leftIdx: number) {
    if (phase !== "playing") return;
    if (matchedPairs[leftIdx] !== undefined) return;

    if (selectedRight !== null) {
      attemptConnection(leftIdx, selectedRight);
    } else {
      setSelectedLeft((prev) => (prev === leftIdx ? null : leftIdx));
    }
  }

  function handleRightNodeClick(rightSlot: number) {
    if (phase !== "playing") return;
    const alreadyUsed = Object.values(matchedPairs).includes(rightSlot);
    if (alreadyUsed) return;

    if (selectedLeft !== null) {
      attemptConnection(selectedLeft, rightSlot);
    } else {
      setSelectedRight((prev) => (prev === rightSlot ? null : rightSlot));
    }
  }

  // ── Complete / Game Over Screens ──────────────────────────────────────────
  if (phase === "complete") {
    return (
      <div className="stage-shell stage-theme--sentence mx-auto w-full max-w-3xl">
        <div className="stage-shell-card">
          <span className="stage-shell-icon" aria-hidden="true">
            ⚡
          </span>
          <h2 className="stage-shell-title">All Circuits Repaired!</h2>
          <p className="stage-shell-desc">
            {totalBoards} / {totalBoards} circuit boards energized
          </p>
          <div className="sentence-final-score">
            <span className="sentence-final-score-label">Final Power Score</span>
            <span className="sentence-final-score-value">{score} pts</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-stage-continue cursor-pointer"
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
          <span className="stage-shell-icon" aria-hidden="true">
            🪫
          </span>
          <h2 className="stage-shell-title">Power Depleted — Game Over</h2>
          <p className="stage-shell-desc">
            All 3 battery cells shorted out. Recharge and try repairing the circuit again!
          </p>
          <div className="sentence-final-score">
            <span className="sentence-final-score-label">Score this run</span>
            <span className="sentence-final-score-value">{score} pts</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-stage-continue cursor-pointer"
          onClick={handleRestart}
        >
          Try Again ↺
        </button>
      </div>
    );
  }

  const energyPct = currentBoard
    ? Math.max(
        0,
        Math.min(100, Math.round((timeLeft / currentBoard.time_limit) * 100))
      )
    : 100;

  // Build wires to render in the center SVG
  // Y-positions for the 4 rows inside viewBox="0 0 200 320": 40, 120, 200, 280
  const rowY = (idx: number) => 40 + idx * 80;

  const activeWires: {
    leftIdx: number;
    rightSlot: number;
    kind: "matched" | "solution" | "spark";
  }[] =
    phase === "timeout-solution"
      ? // Auto-draw all 4 green solution wires!
        rightNodes.map((node) => ({
          leftIdx: node.pairIndex,
          rightSlot: node.rightSlot,
          kind: "solution" as const,
        }))
      : [
          ...Object.entries(matchedPairs).map(([lIdx, rSlot]) => ({
            leftIdx: Number(lIdx),
            rightSlot: rSlot,
            kind: "matched" as const,
          })),
          ...(sparkWire
            ? [
                {
                  leftIdx: sparkWire.leftIdx,
                  rightSlot: sparkWire.rightSlot,
                  kind: "spark" as const,
                },
              ]
            : []),
        ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 overflow-x-hidden rounded-3xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl sm:p-5 md:p-7">
      {/* ── Top Bar — Status ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1.5 text-sm font-extrabold text-amber-300 ring-1 ring-amber-400/40">
            <span aria-hidden="true">🔌</span>
            <span>Circuit Repair</span>
          </span>
          <span className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300">
            Topic: {currentBoard?.topic || "Renewable Energy & Smart Grid"}
          </span>
          <span className="rounded-xl bg-slate-800 px-2.5 py-1 text-xs font-extrabold text-orange-300">
            Board {boardIndex + 1} / {totalBoards}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Score */}
          <div
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-extrabold text-amber-300 ring-1 ring-amber-400/30"
            aria-label={`Score: ${score}`}
          >
            ⚡ {score} pts
          </div>

          {/* 3 Battery Pin Icons (● ● ●) */}
          <div
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5"
            aria-label={`Battery lives remaining: ${lives} of 3`}
          >
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Battery
            </span>
            {[0, 1, 2].map((i) => {
              const active = i < lives;
              return (
                <span
                  key={i}
                  className={`inline-block h-3.5 w-3.5 rounded-full transition-all ${
                    active
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                      : "bg-slate-700"
                  }`}
                  title={active ? "Battery Charged" : "Battery Depleted"}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Energy / Countdown Bar ── */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Energy
        </span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800 p-0.5 ring-1 ring-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              timeLeft <= 5
                ? "bg-rose-500"
                : timeLeft <= 10
                  ? "bg-amber-400"
                  : "bg-gradient-to-r from-emerald-400 to-amber-400"
            }`}
            style={{ width: `${energyPct}%` }}
          />
        </div>
        <span
          className={`min-w-[54px] text-right font-mono text-xs font-extrabold ${
            timeLeft <= 5 ? "animate-pulse text-rose-400" : "text-amber-300"
          }`}
        >
          ⏱️ {timeLeft}s
        </span>
      </div>

      {/* ── Instruction Helper ── */}
      <p className="text-center text-xs font-medium text-slate-400">
        Tap a <strong className="text-amber-300">Left Clue Chip</strong> and then tap its matching{" "}
        <strong className="text-emerald-300">Right Answer Node</strong> to wire the circuit!
      </p>

      {/* ── Play Area — Electronic Circuit Board ── */}
      <div className="relative grid grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-stretch gap-0 rounded-2xl border border-slate-700/90 bg-slate-950/90 p-3 shadow-inner sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] sm:p-4 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)] md:p-6">
        {/* Left Column: 4 Clue Chips */}
        <div className="flex min-w-0 flex-col justify-between gap-3 py-1">
          {currentBoard?.pairs.map((pair, leftIdx) => {
            const isMatched = matchedPairs[leftIdx] !== undefined;
            const isSelected = selectedLeft === leftIdx;
            const isSolutionShown = phase === "timeout-solution";

            return (
              <button
                key={`left-${leftIdx}`}
                type="button"
                disabled={isMatched || phase !== "playing"}
                onClick={() => handleLeftClueClick(leftIdx)}
                className={`group relative flex min-h-[60px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition sm:text-sm cursor-pointer ${
                  isMatched || isSolutionShown
                    ? "border-emerald-500/80 bg-emerald-950/50 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : isSelected
                      ? "border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/60"
                      : "border-slate-700 bg-slate-900/90 text-slate-100 hover:border-amber-400/70 hover:bg-slate-800"
                }`}
              >
                <span className="line-clamp-2">{pair.clue}</span>
                {/* Right terminal pin */}
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition ${
                    isMatched || isSolutionShown
                      ? "border-emerald-300 bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : isSelected
                        ? "border-amber-200 bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                        : "border-slate-500 bg-slate-700 group-hover:border-amber-400"
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Center Column: SVG Connecting Wires */}
        <div className="relative flex items-center justify-center">
          <svg
            viewBox="0 0 200 320"
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Background PCB trace lines */}
            {[0, 1, 2, 3].map((i) => (
              <line
                key={`trace-${i}`}
                x1="0"
                y1={rowY(i)}
                x2="200"
                y2={rowY(i)}
                stroke="rgba(51,65,85,0.35)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
            ))}

            {/* Active / Solution / Spark Wires */}
            {activeWires.map((w, idx) => {
              const y1 = rowY(w.leftIdx);
              const y2 = rowY(w.rightSlot);
              const stroke =
                w.kind === "spark"
                  ? "#EF4444"
                  : w.kind === "solution"
                    ? "#22C55E"
                    : "#10B981";
              return (
                <g key={`wire-${idx}`}>
                  {/* Outer glow */}
                  <path
                    d={`M 0,${y1} C 95,${y1} 105,${y2} 200,${y2}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="9"
                    strokeOpacity="0.25"
                    strokeLinecap="round"
                  />
                  {/* Core wire */}
                  <path
                    d={`M 0,${y1} C 95,${y1} 105,${y2} 200,${y2}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Column: 4 Shuffled Answer Nodes */}
        <div className="flex min-w-0 flex-col justify-between gap-3 py-1">
          {rightNodes.map((node) => {
            const isMatched = Object.values(matchedPairs).includes(
              node.rightSlot
            );
            const isSelected = selectedRight === node.rightSlot;
            const isSolutionShown = phase === "timeout-solution";

            return (
              <button
                key={`right-${node.rightSlot}`}
                type="button"
                disabled={isMatched || phase !== "playing"}
                onClick={() => handleRightNodeClick(node.rightSlot)}
                className={`group relative flex min-h-[60px] items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition sm:text-sm cursor-pointer ${
                  isMatched || isSolutionShown
                    ? "border-emerald-500/80 bg-emerald-950/50 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : isSelected
                      ? "border-amber-400 bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/60"
                      : "border-slate-700 bg-slate-900/90 text-slate-100 hover:border-emerald-400/70 hover:bg-slate-800"
                }`}
              >
                {/* Left terminal pin */}
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition ${
                    isMatched || isSolutionShown
                      ? "border-emerald-300 bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : isSelected
                        ? "border-amber-200 bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                        : "border-slate-500 bg-slate-700 group-hover:border-emerald-400"
                  }`}
                  aria-hidden="true"
                />
                <span className="line-clamp-2">{node.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Feedback & Action Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {banner ? (
          <div
            role="status"
            className={`rounded-xl border px-4 py-2 text-xs font-extrabold sm:text-sm ${
              banner.tone === "surge"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "border-rose-500/40 bg-rose-500/15 text-rose-300"
            }`}
          >
            {banner.text}
          </div>
        ) : (
          <span className="text-xs text-slate-400">
             Solve all 4 connections with 0 mistakes for a{" "}
            <strong className="text-amber-300">+5 pts Perfect Circuit</strong>{" "}
            bonus!
          </span>
        )}

        {phase === "board-solved" && (
          <button
            type="button"
            onClick={advanceToNextBoard}
            className="ml-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:from-emerald-600 hover:to-teal-600 sm:text-sm cursor-pointer"
          >
            {boardIndex === totalBoards - 1
              ? "Finish Circuit →"
              : "Next Circuit Board →"}
          </button>
        )}
      </div>
    </div>
  );
}
