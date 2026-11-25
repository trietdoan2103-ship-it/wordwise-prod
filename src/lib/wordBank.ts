import { createClient } from "@/lib/supabase/client";

export interface SavedWord {
  id: string;
  term: string;
  meaning: string;
  source_video_title: string;
  created_at: string;
}

const LOCAL_KEY = "wordwise_saved_words_v1";

function readLocal(): SavedWord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedWord[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: SavedWord[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

const norm = (t: string) => t.trim().toLowerCase();

/** Saved terms (lowercased) from the local Word Bank. */
export function getSavedTermSet(): Set<string> {
  return new Set(readLocal().map((w) => norm(w.term)));
}

export function getSavedWords(): SavedWord[] {
  return readLocal();
}

/**
 * Saves a term to the Personal Word Bank. Always writes to localStorage (demo
 * mode friendly) and syncs to `public.user_saved_words` when signed in.
 */
export async function saveWordToBank(
  userId: string | undefined,
  term: string,
  meaning: string,
  sourceVideoTitle: string
): Promise<void> {
  const list = readLocal();
  if (!list.some((w) => norm(w.term) === norm(term))) {
    list.unshift({
      id: `local-${Date.now().toString(36)}`,
      term: term.trim(),
      meaning,
      source_video_title: sourceVideoTitle,
      created_at: new Date().toISOString(),
    });
    writeLocal(list);
  }
  if (!userId) return;
  try {
    await createClient()
      .from("user_saved_words")
      .upsert(
        {
          user_id: userId,
          term: term.trim(),
          meaning,
          source_video_title: sourceVideoTitle,
        },
        { onConflict: "user_id,term" }
      );
  } catch {
    /* local copy already saved */
  }
}

export async function removeWordFromBank(
  userId: string | undefined,
  term: string
): Promise<void> {
  writeLocal(readLocal().filter((w) => norm(w.term) !== norm(term)));
  if (!userId) return;
  try {
    await createClient()
      .from("user_saved_words")
      .delete()
      .eq("user_id", userId)
      .eq("term", term.trim());
  } catch {
    /* ignore */
  }
}
