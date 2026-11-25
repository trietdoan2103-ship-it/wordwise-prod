/**
 * Events & RSVP Storage — Sprint 5 (Supabase + Local Cache Sync).
 *
 * - Queries `public.events` ordered by `sort_order` with a seamless fallback to `STEM_EVENTS`.
 * - Syncs user event registrations with `public.event_registrations` in Supabase
 *   while maintaining a synchronous cache (`wordwise_registered_events`) and
 *   dispatching `wordwise_events_updated`.
 */

import { createClient } from "@/lib/supabase/client";
import { STEM_EVENTS, type STEMEvent } from "@/data/events";
import type { DbEvent } from "@/types/database";

export const REGISTERED_EVENTS_STORAGE_KEY = "wordwise_registered_events";

let memoryRegisteredIds: string[] | null = null;

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
 * Queries `public.events` ordered by `sort_order` from Supabase,
 * mapping DB rows into `STEMEvent` and falling back cleanly to `STEM_EVENTS`.
 */
export async function fetchCommunityEvents(): Promise<STEMEvent[]> {
  if (!isSupabaseConfigured()) {
    return STEM_EVENTS;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("sort_order", { ascending: true });

    const rows = (data || []) as DbEvent[];
    if (error || rows.length === 0) {
      return STEM_EVENTS;
    }

    return rows.map((row, idx) => {
      const staticMatch = STEM_EVENTS.find((e) => e.id === row.id);
      const isChallenge = row.category === "challenge";

      // Extract numeric XP reward from rewards string if present (e.g., "+ 50 XP")
      const xpMatch = row.rewards?.match(/(\d+)\s*XP/i);
      const parsedXp = xpMatch ? parseInt(xpMatch[1], 10) : undefined;

      const badge: STEMEvent["badge"] =
        staticMatch?.badge ||
        (isChallenge
          ? "CHALLENGE"
          : row.format_label?.toLowerCase().includes("speaking")
          ? "SPEAKING CLUB"
          : "MEETUP");

      return {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle || staticMatch?.subtitle || "",
        description: row.description || staticMatch?.description || "",
        format: row.format_label || staticMatch?.format || "Community Event",
        badge,
        category: isChallenge ? "challenge" : "meetup",
        date: row.date_label || staticMatch?.date || "Upcoming",
        dateBadge:
          staticMatch?.dateBadge ||
          (isChallenge ? "1 Week Sprint" : "Community Event"),
        time: row.time_label || staticMatch?.time || "TBA",
        location: row.location || staticMatch?.location || "Online",
        host: row.host || staticMatch?.host || "Wordwise Community Team",
        attendeesCount:
          typeof row.base_registered_count === "number"
            ? row.base_registered_count
            : staticMatch?.attendeesCount || 30,
        xpReward: parsedXp || staticMatch?.xpReward || 50,
        perks: row.rewards || staticMatch?.perks || "+50 XP",
        coverEmoji:
          staticMatch?.coverEmoji ||
          (isChallenge ? "🌱" : idx === 0 ? "🤝" : "☕"),
        tags:
          staticMatch?.tags ||
          (isChallenge
            ? ["Sprint", "Vocabulary", "Self-Paced"]
            : ["Community", "Meetup", "Speaking Practice"]),
      };
    });
  } catch {
    return STEM_EVENTS;
  }
}

/** Read registered event IDs synchronously from memory/localStorage cache */
export function getRegisteredEventIds(): string[] {
  if (typeof window === "undefined") return memoryRegisteredIds || [];
  try {
    const raw = localStorage.getItem(REGISTERED_EVENTS_STORAGE_KEY);
    if (!raw) return memoryRegisteredIds || [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const ids = parsed.filter(
        (id: unknown): id is string => typeof id === "string"
      );
      memoryRegisteredIds = ids;
      return ids;
    }
    return memoryRegisteredIds || [];
  } catch {
    return memoryRegisteredIds || [];
  }
}

/** Persist registered event IDs to local cache and dispatch sync event */
export function saveRegisteredEventIds(ids: string[]): void {
  memoryRegisteredIds = ids;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REGISTERED_EVENTS_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(
      new CustomEvent("wordwise_events_updated", { detail: ids })
    );
  } catch (err) {
    console.warn(
      "Wordwise: could not save registered events to localStorage.",
      err
    );
  }
}

/**
 * Queries `SELECT event_id FROM public.event_registrations WHERE user_id = userId`,
 * updates the local cache (`wordwise_registered_events`), and dispatches `wordwise_events_updated`.
 */
export async function fetchRegisteredEventIds(
  userId: string
): Promise<string[]> {
  const fallback = getRegisteredEventIds();
  if (!userId || !isSupabaseConfigured()) return fallback;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("event_registrations")
      .select("event_id")
      .eq("user_id", userId);

    if (error || !data) {
      return fallback;
    }

    const ids = Array.from(
      new Set(
        data
          .map((row: { event_id?: unknown }) => row.event_id)
          .filter((id): id is string => typeof id === "string")
      )
    );

    saveRegisteredEventIds(ids);
    return ids;
  } catch {
    return fallback;
  }
}

/** Check if an event is registered */
export function isEventRegistered(eventId: string): boolean {
  return getRegisteredEventIds().includes(eventId);
}

/**
 * Toggles registration for an event:
 * - Optimistically toggles the event ID in local cache and dispatches `wordwise_events_updated`.
 * - If authenticated, inserts into or deletes from `public.event_registrations` in Supabase.
 */
export function toggleEventRegistration(eventId: string): {
  isRegistered: boolean;
  updatedIds: string[];
} {
  const current = getRegisteredEventIds();
  const exists = current.includes(eventId);
  const updatedIds = exists
    ? current.filter((id) => id !== eventId)
    : [...current, eventId];

  saveRegisteredEventIds(updatedIds);

  if (isSupabaseConfigured()) {
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        if (!exists) {
          await supabase.from("event_registrations").upsert(
            {
              user_id: user.id,
              event_id: eventId,
              registered_at: new Date().toISOString(),
            },
            { onConflict: "user_id,event_id" }
          );
        } else {
          await supabase
            .from("event_registrations")
            .delete()
            .eq("user_id", user.id)
            .eq("event_id", eventId);
        }
      } catch (err) {
        console.warn(
          "Wordwise: failed to sync event registration with Supabase.",
          err
        );
      }
    })();
  }

  return {
    isRegistered: !exists,
    updatedIds,
  };
}

/** Clear all registered events */
export function clearRegisteredEvents(): void {
  memoryRegisteredIds = [];
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REGISTERED_EVENTS_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("wordwise_events_updated", { detail: [] })
    );
  } catch {
    // ignore
  }
}
