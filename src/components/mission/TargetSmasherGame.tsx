"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGame } from "@/context/GameContext";
import { DEFAULT_USA_TARGET_SMASHER_ITEMS } from "@/lib/progress";
import type { DbCountryTargetSmasherItem } from "@/types/database";

interface TargetSmasherGameProps {
  onComplete: () => void;
  /** Live country-specific Target Smasher items across Tiers 1, 2 and 3. */
  items?: DbCountryTargetSmasherItem[];
  topicLabel?: string;
}

type Tier = 1 | 2 | 3;

interface MovingTarget {
  id: number;
  word: string;
  isCorrect: boolean;
  /** Position as % of the play area (center of the target). */
  x: number;
  y: number;
  /** Velocity in % per second. */
  vx: number;
  vy: number;
  /** Set once the player has clicked this (wrong) target in the current round. */
  burst?: boolean;
}

interface MissedItem {
  icon: string;
  prompt: string;
  chosen: string;
  correct: string;
}

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  good: boolean;
}

const ROUND_SECONDS = 60;
const X_MIN = 12;
const X_MAX = 88;
const Y_MIN = 20;
const Y_MAX = 80;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function tierForTime(timeLeft: number): Tier {
  // 0–20s elapsed = Tier 1, 20–40s = Tier 2, 40–60s = Tier 3
  return timeLeft > 40 ? 1 : timeLeft > 20 ? 2 : 3;
}

function buildTargets(
  item: DbCountryTargetSmasherItem,
  tier: Tier,
  idRef: { current: number }
): MovingTarget[] {
  const distractors = shuffle(
    (Array.isArray(item.distractors) ? item.distractors : []).filter(Boolean)
  );
  // Tier 1 → 3 targets, Tiers 2–3 → 4 targets
  const count = tier === 1 ? 3 : 4;
  const words = shuffle([
    { word: item.correct_word, isCorrect: true },
    ...distractors
      .slice(0, count - 1)
      .map((w) => ({ word: w, isCorrect: false })),
  ]);

  const baseSpeed = tier === 1 ? 4 : tier === 2 ? 14 : 30;

  return words.map((w, i) => {
    const x = X_MIN + ((X_MAX - X_MIN) * (i + 0.5)) / words.length;
    const y = rand(Y_MIN + 8, Y_MAX - 8);
    let vx = 0;
    let vy = 0;
    if (tier === 1) {
      // stationary / very slow drift
      vx = (Math.random() < 0.5 ? -1 : 1) * rand(0, baseSpeed);
    } else if (tier === 2) {
      // horizontal movement
      vx = (Math.random() < 0.5 ? -1 : 1) * rand(baseSpeed * 0.7, baseSpeed);
    } else {
      // fast, multi-directional
      vx = (Math.random() < 0.5 ? -1 : 1) * rand(baseSpeed * 0.6, baseSpeed);
      vy = (Math.random() < 0.5 ? -1 : 1) * rand(baseSpeed * 0.3, baseSpeed * 0.7);
    }
    return {
      id: ++idRef.current,
      word: w.word,
      isCorrect: w.isCorrect,
      x,
      y,
      vx,
      vy,
    };
  });
}

export default function TargetSmasherGame({
  onComplete,
  items,
  topicLabel = "Renewable Energy & Smart Grid",
}: TargetSmasherGameProps) {
  const { addXP, completeStage } = useGame();

  const pool = useMemo(() => {
    const src =
      items && items.length > 0 ? items : DEFAULT_USA_TARGET_SMASHER_ITEMS;
    return src
      .filter((it) => it.correct_word)
      .map((it) => ({
        ...it,
        tier: (it.tier === 1 || it.tier === 2 || it.tier === 3
          ? it.tier
          : 1) as Tier,
        icon: it.icon || "🎯",
      }));
  }, [items]);

  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hits, setHits] = useState(0);
  const [missed, setMissed] = useState<MissedItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [targets, setTargets] = useState<MovingTarget[]>([]);
  const [roundMissed, setRoundMissed] = useState(false);
  const [flashCorrect, setFlashCorrect] = useState(false);
  const [shake, setShake] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [banner, setBanner] = useState<{ text: string; good: boolean } | null>(
    null
  );

  const idRef = useRef(0);
  const popupIdRef = useRef(0);
  const targetsRef = useRef<MovingTarget[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timeLeftRef = useRef(ROUND_SECONDS);
  const orderRef = useRef<Record<Tier, number[]>>({ 1: [], 2: [], 3: [] });

  const isGameOver = timeLeft <= 0;
  const tier = tierForTime(timeLeft);
  const isFever = combo >= 5;

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  }, []);

  // Pick the next item for the current tier (cycling through a shuffled order)
  const currentItem = useMemo(() => {
    const matches = pool.filter((p) => p.tier === tier);
    const list = matches.length > 0 ? matches : pool;
    return list[cursor % list.length] ?? pool[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, tier, cursor]);

  // Spawn a fresh group of targets whenever the item (or tier) changes
  const currentItemId = currentItem?.id;
  useEffect(() => {
    if (!currentItem || isGameOver) return;
    const next = buildTargets(currentItem, tier, idRef);
    targetsRef.current = next;
    setTargets(next);
    setRoundMissed(false);
    setFlashCorrect(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId, tier, isGameOver, cursor]);

  // Clear pending timeouts on unmount
  useEffect(() => {
    const list = timeoutsRef.current;
    return () => {
      list.forEach(clearTimeout);
    };
  }, []);

  // 60-second countdown
  useEffect(() => {
    if (isGameOver) {
      completeStage("target_smasher");
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        const n = Math.max(0, t - 1);
        timeLeftRef.current = n;
        return n;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameOver, completeStage]);

  // Animation loop — moves targets around the arcade gallery
  useEffect(() => {
    if (isGameOver) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      const list = targetsRef.current;
      const currentTier = tierForTime(timeLeftRef.current);

      for (const t of list) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        if (t.x < X_MIN) {
          t.x = X_MIN;
          t.vx = Math.abs(t.vx);
        } else if (t.x > X_MAX) {
          t.x = X_MAX;
          t.vx = -Math.abs(t.vx);
        }
        if (t.y < Y_MIN) {
          t.y = Y_MIN;
          t.vy = Math.abs(t.vy);
        } else if (t.y > Y_MAX) {
          t.y = Y_MAX;
          t.vy = -Math.abs(t.vy);
        }
        // Final phase: targets occasionally change direction
        if (currentTier === 3 && Math.random() < dt * 0.6) {
          t.vx = -t.vx * rand(0.8, 1.2);
          t.vy = (Math.random() < 0.5 ? -1 : 1) * rand(8, 22);
        }
      }

      // ~30 fps React updates keeps mobile light
      if (acc >= 1 / 30) {
        acc = 0;
        setTargets(list.map((t) => ({ ...t })));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isGameOver]);

  function addPopup(x: number, y: number, text: string, good: boolean) {
    const id = ++popupIdRef.current;
    setPopups((p) => [...p, { id, x, y, text, good }]);
    later(() => setPopups((p) => p.filter((q) => q.id !== id)), 800);
  }

  function showBanner(text: string, good: boolean, ms = 900) {
    setBanner({ text, good });
    later(() => setBanner(null), ms);
  }

  function handleHit(t: MovingTarget) {
    if (isGameOver || !currentItem || t.burst) return;

    if (t.isCorrect) {
      if (roundMissed) {
        // Learner found the answer after a miss — no points, move on
        addPopup(t.x, t.y, "Got it!", true);
        showBanner("Now you know it! 💡", true, 700);
        setCursor((c) => c + 1);
        return;
      }
      const gained = combo >= 5 ? 300 : 100; // +200 Fever bonus on top of 100
      setAttempts((a) => a + 1);
      setHits((h) => h + 1);
      setCombo((c) => c + 1);
      setScore((s) => s + gained);
      addXP(10);
      addPopup(t.x, t.y, `Bullseye! +${gained}`, true);
      showBanner(
        combo >= 5 ? "🔥 FEVER! Bullseye!" : "Bullseye! ⭐",
        true,
        700
      );
      // Immediately spawn the next target group
      setCursor((c) => c + 1);
      return;
    }

    // Wrong target
    if (!roundMissed) {
      setAttempts((a) => a + 1);
      setMissed((m) => [
        ...m,
        {
          icon: currentItem.icon,
          prompt: currentItem.prompt,
          chosen: t.word,
          correct: currentItem.correct_word,
        },
      ]);
    }
    setCombo(0);
    setRoundMissed(true);
    setShake(true);
    setFlashCorrect(true);
    addPopup(t.x, t.y, "Boing!", false);
    showBanner("Boing! Find the glowing target ✨", false, 1100);
    // mark the wrong target as dead so it can't be clicked again
    const dead = targetsRef.current.find((x) => x.id === t.id);
    if (dead) {
      dead.burst = true;
      dead.vx = 0;
      dead.vy = 0;
    }
    later(() => setShake(false), 450);
    later(() => setFlashCorrect(false), 1000);
  }

  function handleRestart() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    timeLeftRef.current = ROUND_SECONDS;
    setTimeLeft(ROUND_SECONDS);
    setScore(0);
    setCombo(0);
    setAttempts(0);
    setHits(0);
    setMissed([]);
    setCursor(0);
    setPopups([]);
    setBanner(null);
    setShake(false);
    setFlashCorrect(false);
    setRoundMissed(false);
  }

  // ── Results (00:00) ───────────────────────────────────────────────────────
  if (isGameOver) {
    const accuracy = attempts > 0 ? Math.round((hits / attempts) * 100) : 0;
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl md:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl" aria-hidden="true">
            🎯
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Target Smasher — Results
          </h2>
          <p className="text-sm text-slate-300">
            60 seconds are up! Here is how you did:
          </p>
        </div>

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
              Accuracy
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-300">
              {accuracy}%
            </p>
            <p className="text-[11px] text-slate-400">
              {hits} / {attempts} first-try
            </p>
          </div>
          <div className="rounded-2xl border border-rose-400/30 bg-slate-800/90 p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Missed Words
            </p>
            <p className="mt-1 text-2xl font-extrabold text-rose-300">
              {missed.length}
            </p>
          </div>
        </div>

        {missed.length > 0 && (
          <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              📋 Review Missed Words ({missed.length})
            </h3>
            <ul className="divide-y divide-slate-800">
              {missed.map((m, idx) => (
                <li key={idx} className="flex items-start gap-3 py-2.5 text-xs">
                  <span className="text-2xl" aria-hidden="true">
                    {m.icon}
                  </span>
                  <div>
                    <p className="font-bold text-slate-100">{m.prompt}</p>
                    <p className="mt-1 text-slate-400">
                      You hit:{" "}
                      <span className="font-semibold text-rose-400 line-through">
                        {m.chosen}
                      </span>{" "}
                      • Answer:{" "}
                      <span className="font-extrabold text-emerald-300">
                        ✓ {m.correct}
                      </span>
                    </p>
                  </div>
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
            Play Again ↺
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
    tier === 1
      ? "Phase 1 • Slow targets"
      : tier === 2
        ? "Phase 2 • Moving targets"
        : "Phase 3 • Fast & tricky";
  const timePct = (timeLeft / ROUND_SECONDS) * 100;

  return (
    <div
      className={`mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-3xl border bg-slate-900 p-5 text-white shadow-2xl md:p-7 ${
        isFever
          ? "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]"
          : "border-slate-700"
      } ${shake ? "ts-shake" : ""}`}
    >
      <style>{`
        @keyframes ts-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .ts-shake { animation: ts-shake 0.4s ease-in-out; }
        @keyframes ts-pop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          30% { opacity: 1; transform: translate(-50%, -90%) scale(1.15); }
          100% { opacity: 0; transform: translate(-50%, -190%) scale(1); }
        }
        .ts-pop { animation: ts-pop 0.8s ease-out forwards; }
        @keyframes ts-glow {
          0%, 100% { box-shadow: 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 0 28px rgba(52,211,153,0.95); }
        }
        .ts-glow { animation: ts-glow 0.4s ease-in-out infinite; }
      `}</style>

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500/20 px-3 py-1.5 text-sm font-extrabold text-orange-300 ring-1 ring-orange-400/40">
            <span aria-hidden="true">🎯</span>
            <span>Target Smasher</span>
          </span>
          <span className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300">
            Topic: {topicLabel}
          </span>
          <span className="rounded-xl bg-slate-800 px-2.5 py-1 text-xs font-extrabold text-amber-300">
            {tierLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {isFever && (
            <span className="animate-bounce rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow">
              🔥 FEVER MODE x{combo} (+300)
            </span>
          )}
          {!isFever && combo > 0 && (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
              Streak {combo}/5
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

      {/* Countdown bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            timeLeft <= 10 ? "bg-rose-500" : "bg-emerald-400"
          }`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Objective card */}
      <div className="flex items-center justify-center gap-4 rounded-2xl border border-orange-400/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 text-center">
        <span className="text-5xl md:text-6xl" aria-hidden="true">
          {currentItem?.icon}
        </span>
        <div className="text-left">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-300">
            Smash the matching word
          </p>
          <p className="mt-1 text-base font-extrabold text-white md:text-lg">
            {currentItem?.prompt}
          </p>
        </div>
      </div>

      {/* Arcade gallery */}
      <div className="relative h-[340px] select-none overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950">
        {targets.map((t) => {
          const showHint = flashCorrect && t.isCorrect;
          return (
            <button
              key={t.id}
              type="button"
              disabled={t.burst}
              onClick={() => handleHit(t)}
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              className={`absolute flex min-w-[96px] max-w-[160px] items-center justify-center rounded-full border-2 px-4 py-3 text-center text-sm font-extrabold shadow-lg transition-colors cursor-pointer ${
                t.burst
                  ? "pointer-events-none border-rose-500/50 bg-rose-950/50 text-rose-300/60 line-through"
                  : showHint
                    ? "ts-glow border-emerald-300 bg-emerald-500/40 text-white"
                    : "border-orange-300/80 bg-orange-500/20 text-white hover:bg-orange-400/40"
              }`}
              aria-label={`Target: ${t.word}`}
            >
              🎈 {t.word}
            </button>
          );
        })}

        {popups.map((p) => (
          <span
            key={p.id}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className={`ts-pop pointer-events-none absolute z-10 whitespace-nowrap text-lg font-black drop-shadow ${
              p.good ? "text-amber-300" : "text-rose-400"
            }`}
          >
            {p.good ? "✨ " : "💥 "}
            {p.text}
          </span>
        ))}
      </div>

      {/* Feedback bar */}
      <div className="flex min-h-[2rem] flex-wrap items-center justify-between gap-2 text-xs">
        {banner ? (
          <span
            className={`rounded-xl border px-3.5 py-1.5 font-extrabold ${
              banner.good
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                : "border-rose-400/40 bg-rose-500/20 text-rose-300"
            }`}
          >
            {banner.text}
          </span>
        ) : (
          <span className="text-slate-400">
            Tap the balloon that matches the clue • 5 hits in a row triggers{" "}
            <strong className="text-amber-300">Fever Mode (+300 pts)</strong>
          </span>
        )}
        <span className="text-slate-500">
          Hits: {hits} • Misses: {missed.length}
        </span>
      </div>
    </div>
  );
}
