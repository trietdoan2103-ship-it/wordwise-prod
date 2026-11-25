"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { GameContextValue, UserProgress } from "@/types/game";
import {
  clearProgress,
  DEFAULT_PROGRESS,
  fetchUserGameProgress,
  loadProgress,
  saveProgress,
  saveUserGameProgressToDb,
} from "@/lib/progress";
import { XP } from "@/lib/xp";
import { recordStreakAction } from "@/lib/streak";
import { useSession } from "@/context/SessionContext";

// ─── Context ──────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);

  // Hydrate from local cache first, then sync live from Supabase when session?.id is present
  useEffect(() => {
    let isMounted = true;
    setProgress(loadProgress());

    if (session?.id) {
      fetchUserGameProgress(session.id).then((dbProgress) => {
        if (isMounted) {
          setProgress(dbProgress);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [session?.id]);

  // Persist to localStorage cache on every state change
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const addXP = useCallback(
    (amount: number) => {
      setProgress((prev) => {
        const nextProgress: UserProgress = {
          ...prev,
          xp: prev.xp + amount,
        };
        saveProgress(nextProgress);
        if (session?.id) {
          void saveUserGameProgressToDb(session.id, nextProgress);
        }
        return nextProgress;
      });
    },
    [session?.id]
  );

  const completeStage = useCallback(
    (stageId: string) => {
      setProgress((prev) => {
        if (prev.completedStages.includes(stageId)) return prev;
        const nextProgress: UserProgress = {
          ...prev,
          completedStages: [...prev.completedStages, stageId],
        };
        saveProgress(nextProgress);
        if (session?.id) {
          void saveUserGameProgressToDb(session.id, nextProgress);
        }
        return nextProgress;
      });
      recordStreakAction();
    },
    [session?.id]
  );

  const completeMission = useCallback(
    (missionId: string) => {
      if (
        missionId === "renewable-energy" ||
        missionId === "ordering-coffee" ||
        missionId === "usa"
      ) {
        setProgress((prev) => {
          if (prev.usaCompleted) return prev; // Idempotent — no double reward
          const nextProgress: UserProgress = {
            ...prev,
            xp: prev.xp + XP.MISSION_COMPLETE,
            usaCompleted: true,
            usaStampUnlocked: true,
            usaBadgeUnlocked: true,
            coffeeCupUnlocked: true,
            completedStages: ["vocabulary", "listening", "sentence"],
          };
          saveProgress(nextProgress);
          if (session?.id) {
            void saveUserGameProgressToDb(session.id, nextProgress);
          }
          return nextProgress;
        });
        recordStreakAction();
      }
    },
    [session?.id]
  );

  const resetProgress = useCallback(() => {
    clearProgress();
    setProgress(DEFAULT_PROGRESS);
    if (session?.id) {
      void saveUserGameProgressToDb(session.id, DEFAULT_PROGRESS);
    }
  }, [session?.id]);

  // ─── Context Value ──────────────────────────────────────────────────────────

  const value: GameContextValue = {
    xp: progress.xp,
    completedStages: progress.completedStages,
    usaCompleted: progress.usaCompleted,
    usaStampUnlocked: progress.usaStampUnlocked,
    usaBadgeUnlocked: progress.usaBadgeUnlocked,
    coffeeCupUnlocked: progress.coffeeCupUnlocked,
    addXP,
    completeStage,
    completeMission,
    resetProgress,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within a <GameProvider>");
  }
  return ctx;
}
