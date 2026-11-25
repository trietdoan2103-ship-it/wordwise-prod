/**
 * Real-Action Achievements System — Sprint 5 (Supabase + Local Cache Sync).
 *
 * - Queries `public.user_achievements` for unlocked badge timestamps.
 * - Evaluates badge unlock states from live curriculum progress, mission progress,
 *   and learning streak, automatically upserting newly unlocked badges to
 *   `public.user_achievements` in Supabase.
 */

import { createClient } from "@/lib/supabase/client";
import type { UserProgress } from "@/types/game";
import type { Lesson } from "@/types/curriculum";
import type { StreakData } from "./streak";
import { renewableEnergyLessons } from "@/data/lessons";

export interface AchievementBadge {
  id: string;
  title: string;
  icon: string;
  category: "curriculum" | "mission" | "streak" | "general";
  description: string;
  actionCriteria: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressCount: number;
  totalRequired: number;
  progressPercentage: number;
  progressLabel: string;
}

const ACHIEVEMENTS_STORAGE_KEY = "wordwise_achievements_timestamps";

let memoryTimestampsCache: Record<string, string> | null = null;
const syncedBadgesInSession = new Set<string>();

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url !== "your_supabase_project_url" &&
      key !== "your_supabase_anon_key" &&
      url.startsWith("http")
  );
}

/** Get stored unlock timestamps synchronously from memory/localStorage cache */
export function getStoredUnlockTimestamps(): Record<string, string> {
  if (typeof window === "undefined") return memoryTimestampsCache || {};
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return memoryTimestampsCache || {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      memoryTimestampsCache = parsed;
      return parsed;
    }
    return memoryTimestampsCache || {};
  } catch {
    return memoryTimestampsCache || {};
  }
}

/** Persist unlock timestamps map to local cache and dispatch update event */
export function saveStoredUnlockTimestamps(
  timestamps: Record<string, string>
): void {
  memoryTimestampsCache = timestamps;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(timestamps));
    window.dispatchEvent(
      new CustomEvent("wordwise_achievements_updated", { detail: timestamps })
    );
  } catch (err) {
    console.warn("Wordwise: could not save achievement timestamps.", err);
  }
}

/**
 * Queries `SELECT badge_id, unlocked_at FROM public.user_achievements WHERE user_id = userId`,
 * formats `unlocked_at` into a readable date string (e.g. "Nov 15, 2026"),
 * updates the local cache (`wordwise_achievements_timestamps`), and dispatches `wordwise_achievements_updated`.
 */
export async function fetchUserAchievements(
  userId: string
): Promise<Record<string, string>> {
  const fallback = getStoredUnlockTimestamps();
  if (!userId || !isSupabaseConfigured()) return fallback;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_achievements")
      .select("badge_id, unlocked_at")
      .eq("user_id", userId);

    if (error || !data) {
      return fallback;
    }

    const merged: Record<string, string> = { ...fallback };
    for (const row of data as { badge_id?: string; unlocked_at?: string }[]) {
      if (row.badge_id) {
        syncedBadgesInSession.add(`${userId}:${row.badge_id}`);
        const dateObj = row.unlocked_at ? new Date(row.unlocked_at) : new Date();
        const formatted = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
        merged[row.badge_id] = formatted;
      }
    }

    saveStoredUnlockTimestamps(merged);
    return merged;
  } catch {
    return fallback;
  }
}

/** Save an unlock timestamp for a badge and upsert to `public.user_achievements` in Supabase */
export function recordBadgeUnlock(badgeId: string, timestamp?: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredUnlockTimestamps();
    const dateStr =
      timestamp ||
      current[badgeId] ||
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    if (!current[badgeId]) {
      const updated = { ...current, [badgeId]: dateStr };
      saveStoredUnlockTimestamps(updated);
    }

    if (isSupabaseConfigured()) {
      void (async () => {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const syncKey = `${user.id}:${badgeId}`;
          if (syncedBadgesInSession.has(syncKey)) return;
          syncedBadgesInSession.add(syncKey);

          await supabase.from("user_achievements").upsert(
            {
              user_id: user.id,
              badge_id: badgeId,
              unlocked_at: new Date().toISOString(),
            },
            { onConflict: "user_id,badge_id" }
          );
        } catch (err) {
          console.warn(
            "Wordwise: failed to upsert achievement unlock to Supabase.",
            err
          );
        }
      })();
    }
  } catch (err) {
    console.warn("Wordwise: could not save achievement unlock timestamp.", err);
  }
}

/** Clear all stored unlock timestamps */
export function clearStoredUnlockTimestamps(): void {
  memoryTimestampsCache = {};
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACHIEVEMENTS_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("wordwise_achievements_updated", { detail: {} })
    );
  } catch {
    // ignore
  }
}

/**
 * Calculates dynamic achievement states based on live app progress
 * and upserts any newly unlocked badges to `public.user_achievements` in Supabase.
 */
export function calculateAchievements(
  curriculumCompletedIds: string[] = [],
  gameProgress: UserProgress,
  streak: StreakData,
  lessons: Lesson[] = renewableEnergyLessons
): AchievementBadge[] {
  const timestamps = getStoredUnlockTimestamps();

  const getOrRecordTimestamp = (
    id: string,
    isUnlocked: boolean
  ): string | undefined => {
    if (!isUnlocked) return undefined;
    if (timestamps[id]) {
      // Ensure synced with Supabase if not yet synced in this session
      recordBadgeUnlock(id, timestamps[id]);
      return timestamps[id];
    }
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    recordBadgeUnlock(id, dateStr);
    return dateStr;
  };

  // 1. First Step: Completed >= 1 STEM lesson
  const firstStepUnlocked = curriculumCompletedIds.length >= 1;
  const firstStepBadge: AchievementBadge = {
    id: "first-step",
    title: "First Step",
    icon: "🏅",
    category: "curriculum",
    description: "Read and completed your first STEM clean energy lesson.",
    actionCriteria: "Complete at least 1 lesson in the Learning Library.",
    isUnlocked: firstStepUnlocked,
    unlockedAt: getOrRecordTimestamp("first-step", firstStepUnlocked),
    progressCount: Math.min(curriculumCompletedIds.length, 1),
    totalRequired: 1,
    progressPercentage: firstStepUnlocked ? 100 : 0,
    progressLabel: `${Math.min(curriculumCompletedIds.length, 1)}/1 lesson completed`,
  };

  // 2. Clean Energy Grid Pioneer: Completed USA Renewable Energy mission
  const gridPioneerUnlocked = Boolean(gameProgress.usaCompleted);
  const gridPioneerBadge: AchievementBadge = {
    id: "clean-energy-pioneer",
    title: "Clean Energy Grid Pioneer",
    icon: "☀️",
    category: "mission",
    description:
      "Completed the USA Renewable Energy mission in the Global World Map.",
    actionCriteria: "Complete the Renewable Energy mission in the USA.",
    isUnlocked: gridPioneerUnlocked,
    unlockedAt: getOrRecordTimestamp("clean-energy-pioneer", gridPioneerUnlocked),
    progressCount: gridPioneerUnlocked ? 1 : 0,
    totalRequired: 1,
    progressPercentage: gridPioneerUnlocked ? 100 : 0,
    progressLabel: `${gridPioneerUnlocked ? 1 : 0}/1 mission completed`,
  };

  // 3. Streak Starter: Maintained a 3-day study streak
  const streakStarterUnlocked = streak.currentStreak >= 3;
  const streakCount = Math.min(streak.currentStreak, 3);
  const streakStarterBadge: AchievementBadge = {
    id: "streak-starter",
    title: "Streak Starter",
    icon: "🔥",
    category: "streak",
    description: "Maintained a 3-day continuous English study streak.",
    actionCriteria: "Keep an active study streak for 3 consecutive days.",
    isUnlocked: streakStarterUnlocked,
    unlockedAt: getOrRecordTimestamp("streak-starter", streakStarterUnlocked),
    progressCount: streakCount,
    totalRequired: 3,
    progressPercentage: Math.round((streakCount / 3) * 100),
    progressLabel: `${streakCount}/3 days streak`,
  };

  // 4. Vocabulary Scholar: Mastered 4+ clean energy technical terms
  const completedLessons = lessons.filter((l) =>
    curriculumCompletedIds.includes(l.id)
  );
  const masteredTermsCount = completedLessons.reduce(
    (sum, l) => sum + (l.flashcards?.length || 4),
    0
  );
  const vocabScholarUnlocked = masteredTermsCount >= 4;
  const vocabScholarBadge: AchievementBadge = {
    id: "vocab-scholar",
    title: "Vocabulary Scholar",
    icon: "🧠",
    category: "curriculum",
    description:
      "Mastered 4+ clean energy technical terms from STEM curriculum.",
    actionCriteria: "Master at least 4 technical terms across STEM lessons.",
    isUnlocked: vocabScholarUnlocked,
    unlockedAt: getOrRecordTimestamp("vocab-scholar", vocabScholarUnlocked),
    progressCount: Math.min(masteredTermsCount, 4),
    totalRequired: 4,
    progressPercentage: Math.round((Math.min(masteredTermsCount, 4) / 4) * 100),
    progressLabel: `${Math.min(masteredTermsCount, 4)}/4 terms mastered`,
  };

  // 5. World Citizen: Collected your first passport visa stamp
  const worldCitizenUnlocked = Boolean(gameProgress.usaStampUnlocked);
  const worldCitizenBadge: AchievementBadge = {
    id: "world-citizen",
    title: "World Citizen",
    icon: "🌍",
    category: "mission",
    description:
      "Collected your first passport visa stamp in the Global World Map.",
    actionCriteria: "Earn your first visa stamp on the World Map.",
    isUnlocked: worldCitizenUnlocked,
    unlockedAt: getOrRecordTimestamp("world-citizen", worldCitizenUnlocked),
    progressCount: worldCitizenUnlocked ? 1 : 0,
    totalRequired: 1,
    progressPercentage: worldCitizenUnlocked ? 100 : 0,
    progressLabel: `${worldCitizenUnlocked ? 1 : 0}/1 stamp collected`,
  };

  // 6. Clean Tech Master: Completed all 6 STEM lessons
  const totalLessons = lessons.length || 6;
  const cleanTechUnlocked =
    curriculumCompletedIds.length >= totalLessons && totalLessons > 0;
  const cleanTechBadge: AchievementBadge = {
    id: "clean-tech-master",
    title: "Clean Tech Master",
    icon: "⚡",
    category: "curriculum",
    description: "Completed all 6 Renewable Energy curriculum modules.",
    actionCriteria: "Complete all 6 STEM lessons in the Renewable Energy topic.",
    isUnlocked: cleanTechUnlocked,
    unlockedAt: getOrRecordTimestamp("clean-tech-master", cleanTechUnlocked),
    progressCount: Math.min(curriculumCompletedIds.length, totalLessons),
    totalRequired: totalLessons,
    progressPercentage: Math.round(
      (Math.min(curriculumCompletedIds.length, totalLessons) / totalLessons) *
        100
    ),
    progressLabel: `${curriculumCompletedIds.length}/${totalLessons} lessons completed`,
  };

  // 7. Sentence Architect: Completed Sentence Builder stage
  const sentenceUnlocked = gameProgress.completedStages.includes("sentence");
  const sentenceBadge: AchievementBadge = {
    id: "sentence-architect",
    title: "Sentence Architect",
    icon: "🎯",
    category: "mission",
    description:
      "Assembled perfect technical sentences in the Sentence Builder stage.",
    actionCriteria: "Complete the Sentence Builder stage in any mission.",
    isUnlocked: sentenceUnlocked,
    unlockedAt: getOrRecordTimestamp("sentence-architect", sentenceUnlocked),
    progressCount: sentenceUnlocked ? 1 : 0,
    totalRequired: 1,
    progressPercentage: sentenceUnlocked ? 100 : 0,
    progressLabel: `${sentenceUnlocked ? 1 : 0}/1 stage completed`,
  };

  return [
    firstStepBadge,
    gridPioneerBadge,
    streakStarterBadge,
    vocabScholarBadge,
    worldCitizenBadge,
    cleanTechBadge,
    sentenceBadge,
  ];
}

/** Alias for calculateAchievements */
export const evaluateAchievements = calculateAchievements;
