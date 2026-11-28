/**
 * Leaderboard & Community Rankings Data + Supabase Single-Source-of-Truth Fetcher.
 *
 * Queries `public.profiles`, `public.user_lesson_progress`, and `public.user_mission_progress`
 * to rank 100% real learners by composite score (`xp + completedModules * 50`).
 * Every client renders strictly from the live Supabase response so all browsers/devices
 * see identical XP, `X/6 Modules`, avatar, school, and rank.
 */

import { createClient } from "@/lib/supabase/client";
import {
  getDeterministicAvatar,
  sanitizeDisplayName,
  validateSchoolName,
} from "@/context/SessionContext";
import {
  fetchCompletedLessonIds,
  syncCompletedModulesToProfile,
} from "@/lib/curriculumStorage";
import { fetchUserGameProgress } from "@/lib/progress";

export interface StudentRankEntry {
  id: string;
  rank: number;
  name: string;
  school: string;
  province: string;
  avatar: string;
  modulesCompleted: number;
  totalModules: number;
  xp: number;
  trend: "up" | "down" | "same";
  trendAmount: number;
  badge?: string;
  isRealUser?: boolean;
  missionsCompleted?: number;
}

export type RankingCategory = "national" | "weekly";

export interface LiveLeaderboardResult {
  national: StudentRankEntry[];
  weekly: StudentRankEntry[];
  totalUsersCount: number;
  uniqueSchoolsCount: number;
}

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

/**
 * Decodes `completed_modules` stored in `public.profiles` (`completed_modules` column
 * or schema-safe `freeze_count` carrier).
 */
export function decodeProfileCompletedModules(prof: {
  completed_modules?: number | null;
  freeze_count?: number | null;
}): number {
  const fromCol =
    typeof prof.completed_modules === "number"
      ? Math.max(0, prof.completed_modules)
      : 0;

  const rawFreeze =
    typeof prof.freeze_count === "number" ? prof.freeze_count : 0;
  const fromFreeze =
    rawFreeze >= 1000
      ? Math.floor((rawFreeze % 1000) / 100)
      : rawFreeze >= 100
        ? Math.floor((rawFreeze % 10000) / 100)
        : 0;

  return Math.min(6, Math.max(fromCol, fromFreeze));
}

/**
 * Flushes the currently authenticated user's XP and completed modules to `public.profiles`
 * before querying the global leaderboard so Supabase is the single source of truth.
 */
export async function syncCurrentUserLeaderboardProfile(
  userId?: string | null
): Promise<void> {
  if (!userId || !isSupabaseConfigured()) return;
  try {
    await Promise.all([
      fetchUserGameProgress(userId),
      fetchCompletedLessonIds(),
    ]);
  } catch {
    // ignore transient errors
  }
}

export function assignRanksAndBadges(
  entries: StudentRankEntry[],
  mode: "national" | "weekly"
): StudentRankEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.modulesCompleted !== a.modulesCompleted) {
      return b.modulesCompleted - a.modulesCompleted;
    }
    return a.id.localeCompare(b.id);
  });
  return sorted.map((entry, idx) => {
    const rank = idx + 1;
    const badge =
      mode === "national"
        ? rank <= 2
          ? "Gold League"
          : rank <= 5
            ? "Silver League"
            : "Bronze League"
        : rank === 1
          ? "Weekly Champion"
          : rank <= 3
            ? "Rising Star"
            : "Active";
    return {
      ...entry,
      rank,
      badge,
    };
  });
}

/**
 * Queries real users from `public.profiles`, `public.user_lesson_progress`, and
 * `public.user_mission_progress` on Supabase and computes each user's composite score
 * (`xp + completedModules * 50`). Returns an empty leaderboard when no real users exist.
 */
export async function fetchLiveLeaderboard(): Promise<LiveLeaderboardResult> {
  if (!isSupabaseConfigured()) {
    return {
      national: [],
      weekly: [],
      totalUsersCount: 0,
      uniqueSchoolsCount: 0,
    };
  }

  try {
    const supabase = createClient();

    const [profilesRes, lessonsProgRes, missionsProgRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("xp", { ascending: false }),
      supabase
        .from("user_lesson_progress")
        .select("user_id, lesson_id"),
      supabase
        .from("user_mission_progress")
        .select("user_id, country_id, mission_completed"),
    ]);

    const profileRows = (profilesRes.data || []) as {
      id: string;
      display_name: string | null;
      school_name: string | null;
      avatar_url?: string | null;
      xp: number | null;
      completed_modules?: number | null;
      current_streak: number | null;
      freeze_count?: number | null;
    }[];

    if (profilesRes.error || profileRows.length === 0) {
      return {
        national: [],
        weekly: [],
        totalUsersCount: 0,
        uniqueSchoolsCount: 0,
      };
    }

    const lessonRows = (lessonsProgRes.data || []) as {
      user_id: string;
      lesson_id: string;
    }[];
    const missionRows = (missionsProgRes.data || []) as {
      user_id: string;
      country_id: string;
      mission_completed: boolean | null;
    }[];

    const lessonsCountByUser = new Map<string, Set<string>>();
    for (const row of lessonRows) {
      if (!row.user_id || !row.lesson_id) continue;
      if (!lessonsCountByUser.has(row.user_id)) {
        lessonsCountByUser.set(row.user_id, new Set());
      }
      lessonsCountByUser.get(row.user_id)!.add(row.lesson_id);
    }

    const missionsCountByUser = new Map<string, number>();
    for (const row of missionRows) {
      if (!row.user_id || !row.mission_completed) continue;
      missionsCountByUser.set(
        row.user_id,
        (missionsCountByUser.get(row.user_id) || 0) + 1
      );
    }

    const realEntries: StudentRankEntry[] = profileRows.map((prof, idx) => {
      const fromProfile = decodeProfileCompletedModules(prof);
      const fromLessonTable = lessonsCountByUser.get(prof.id)?.size || 0;
      const completedLessonsCount = Math.min(
        6,
        Math.max(fromProfile, fromLessonTable)
      );

      // If user_lesson_progress has a higher count than the profile row, sync it back
      if (fromLessonTable > fromProfile) {
        void syncCompletedModulesToProfile(prof.id, fromLessonTable);
      }

      const baseXp = typeof prof.xp === "number" ? Math.max(0, prof.xp) : 0;
      const compositeScore = baseXp + completedLessonsCount * 50;
      const streak =
        typeof prof.current_streak === "number" ? prof.current_streak : 1;

      const safeName = sanitizeDisplayName(prof.display_name, "STEM Explorer");
      const rawSchool = (prof.school_name || "").trim();
      const safeSchool =
        rawSchool && validateSchoolName(rawSchool) === null
          ? rawSchool
          : "High School Student";

      return {
        id: prof.id,
        rank: idx + 1,
        name: safeName,
        school: safeSchool,
        province: "Việt Nam",
        avatar: getDeterministicAvatar(
          prof.id,
          prof.avatar_url,
          prof.freeze_count
        ),
        modulesCompleted: completedLessonsCount,
        totalModules: 6,
        xp: compositeScore,
        trend: streak >= 2 ? "up" : "same",
        trendAmount: Math.max(1, Math.min(5, streak)),
        isRealUser: true,
        missionsCompleted: missionsCountByUser.get(prof.id) || 0,
      };
    });

    const rankedNational = assignRanksAndBadges(realEntries, "national");
    const rankedWeekly = assignRanksAndBadges(
      realEntries.map((r) => ({ ...r })),
      "weekly"
    );

    const uniqueSchoolsCount = new Set(
      rankedNational
        .map((e) => e.school.trim().toLowerCase())
        .filter(Boolean)
    ).size;

    return {
      national: rankedNational,
      weekly: rankedWeekly,
      totalUsersCount: rankedNational.length,
      uniqueSchoolsCount,
    };
  } catch {
    return {
      national: [],
      weekly: [],
      totalUsersCount: 0,
      uniqueSchoolsCount: 0,
    };
  }
}
