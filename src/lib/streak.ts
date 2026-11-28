/**
 * Wordwise Learning Streak System — Supabase + Local Cache Sync (Sprint 3).
 *
 * Syncs `current_streak`, `last_active_date`, and `freeze_count` with `public.profiles`
 * in Supabase while maintaining a synchronous local cache (`wordwise_streak`) and
 * dispatching `wordwise_streak_updated` events for instant UI reactivity.
 */

import { createClient } from "@/lib/supabase/client";

export const STREAK_STORAGE_KEY = "wordwise_streak";

export interface StreakData {
  currentStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  freezeCount: number;
}

export interface CalendarDay {
  dateString: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isActive: boolean;
}

let memoryStreakCache: StreakData | null = null;

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

/** Formats a Date object to YYYY-MM-DD in local time */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns today's date formatted as YYYY-MM-DD */
export function getTodayDateString(): string {
  return formatDateKey(new Date());
}

/** Returns yesterday's date formatted as YYYY-MM-DD */
export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

/** Default initial state */
export function getDefaultStreak(): StreakData {
  return {
    currentStreak: 1,
    lastActiveDate: getTodayDateString(),
    freezeCount: 1,
  };
}

/** Read current streak synchronously from memory/localStorage cache */
export function getStreak(): StreakData {
  if (typeof window === "undefined") {
    return memoryStreakCache || getDefaultStreak();
  }
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) {
      const initial = memoryStreakCache || getDefaultStreak();
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(initial));
      memoryStreakCache = initial;
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.currentStreak === "number" &&
      typeof parsed?.lastActiveDate === "string"
    ) {
      const valid: StreakData = {
        currentStreak: Math.max(0, parsed.currentStreak),
        lastActiveDate: parsed.lastActiveDate,
        freezeCount:
          typeof parsed.freezeCount === "number" ? parsed.freezeCount : 1,
      };
      memoryStreakCache = valid;
      return valid;
    }
    return getDefaultStreak();
  } catch {
    return memoryStreakCache || getDefaultStreak();
  }
}

/** Persist streak data to local cache and dispatch custom window event */
export function saveStreak(streak: StreakData): void {
  memoryStreakCache = streak;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
    window.dispatchEvent(
      new CustomEvent("wordwise_streak_updated", { detail: streak })
    );
  } catch (err) {
    console.warn("Wordwise: could not save streak to local cache.", err);
  }
}

/**
 * Fetches `current_streak`, `last_active_date`, and `freeze_count` from `public.profiles`
 * for the authenticated user, syncs the local cache, and dispatches `wordwise_streak_updated`.
 */
export async function fetchUserStreak(): Promise<StreakData> {
  const fallback = getStreak();
  if (!isSupabaseConfigured()) return fallback;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return fallback;

    const { data, error } = await supabase
      .from("profiles")
      .select("current_streak, last_active_date, freeze_count")
      .eq("id", user.id)
      .maybeSingle<{
        current_streak: number | null;
        last_active_date: string | null;
        freeze_count: number | null;
      }>();

    if (error || !data) {
      return fallback;
    }

    const rawFreeze =
      typeof data.freeze_count === "number" ? data.freeze_count : 1;
    const actualFreeze =
      rawFreeze >= 100 ? Math.max(0, rawFreeze % 100) : Math.max(0, rawFreeze);

    const fetched: StreakData = {
      currentStreak:
        typeof data.current_streak === "number"
          ? Math.max(0, data.current_streak)
          : 1,
      lastActiveDate: data.last_active_date || getTodayDateString(),
      freezeCount: actualFreeze,
    };

    saveStreak(fetched);
    return fetched;
  } catch {
    return fallback;
  }
}

/**
 * Records a real user action today (e.g. completing a lesson or mission stage).
 * Applies streak progression logic, updates local cache immediately, and persists
 * `current_streak`, `last_active_date`, and `freeze_count` to `public.profiles` in Supabase.
 */
export function recordStreakAction(): StreakData {
  if (typeof window === "undefined") {
    return getDefaultStreak();
  }

  const current = getStreak();
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  let newStreak = current.currentStreak;

  if (current.lastActiveDate === today) {
    newStreak = Math.max(1, current.currentStreak);
  } else if (current.lastActiveDate === yesterday) {
    newStreak = current.currentStreak + 1;
  } else {
    newStreak = 1;
  }

  const updated: StreakData = {
    currentStreak: newStreak,
    lastActiveDate: today,
    freezeCount: current.freezeCount,
  };

  saveStreak(updated);

  if (isSupabaseConfigured()) {
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existingProf } = await supabase
          .from("profiles")
          .select("freeze_count")
          .eq("id", user.id)
          .maybeSingle<{ freeze_count: number | null }>();

        const existingRaw =
          typeof existingProf?.freeze_count === "number"
            ? existingProf.freeze_count
            : 1;
        const upperCarrier =
          existingRaw >= 100 ? Math.floor(existingRaw / 100) * 100 : 0;
        const preservedFreeze = upperCarrier + (updated.freezeCount % 100);

        await supabase
          .from("profiles")
          .update({
            current_streak: updated.currentStreak,
            last_active_date: updated.lastActiveDate,
            freeze_count: preservedFreeze,
          })
          .eq("id", user.id);

        saveStreak(updated);
      } catch (err) {
        console.warn("Wordwise: failed to sync streak to Supabase.", err);
      }
    })();
  }

  return updated;
}

/** Reset streak */
export function resetStreak(toInitial = true): StreakData {
  const target: StreakData = toInitial
    ? getDefaultStreak()
    : { currentStreak: 0, lastActiveDate: "", freezeCount: 1 };
  saveStreak(target);
  return target;
}

/**
 * Calculates the last 7 calendar days ending today,
 * with flags for whether each day was active during the user's streak.
 */
export function getWeeklyCalendarDays(streak: StreakData): CalendarDay[] {
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateKey(d);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNumber = d.getDate();
    const isToday = i === 0;

    let isActive = false;
    if (streak.currentStreak > 0 && streak.lastActiveDate) {
      const [ly, lm, ld] = streak.lastActiveDate.split("-").map(Number);
      const lastActive = new Date(ly, lm - 1, ld);
      lastActive.setHours(0, 0, 0, 0);

      const diffFromLastActive = Math.round(
        (lastActive.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (
        diffFromLastActive >= 0 &&
        diffFromLastActive < streak.currentStreak
      ) {
        isActive = true;
      }
    }

    days.push({
      dateString: dateStr,
      dayName,
      dayNumber,
      isToday,
      isActive,
    });
  }

  return days;
}
