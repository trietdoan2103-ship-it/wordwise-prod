/**
 * Curriculum Fetcher & Lesson Progress Storage — Sprint 3 (Supabase + Local Cache).
 *
 * - Queries `public.lessons`, `public.flashcards`, and `public.lesson_questions`
 *   from Supabase with a seamless fallback to `renewableEnergyLessons`.
 * - Syncs completed lesson IDs with `public.user_lesson_progress` in Supabase
 *   while maintaining a synchronous cache (`wordwise_curriculum_progress`) and
 *   dispatching `wordwise_curriculum_updated`.
 */

import { createClient } from "@/lib/supabase/client";
import { recordStreakAction } from "@/lib/streak";
import {
  renewableEnergyGlossary,
  renewableEnergyLessons,
} from "@/data/lessons";
import type {
  Flashcard,
  Lesson,
  LessonCategory,
  LessonLevel,
  QuizQuestion,
} from "@/types/curriculum";
import type {
  DbFlashcard,
  DbLesson,
  DbLessonQuestion,
} from "@/types/database";

export const CURRICULUM_PROGRESS_KEY = "wordwise_curriculum_progress";

/** Flashcard with optional extended fields persisted by the Admin Studio. */
export type ExtendedFlashcard = Flashcard & {
  definition?: string;
  partOfSpeech?: string;
  synonyms?: string[];
};

export interface StudioCard {
  term: string;
  phonetic: string;
  partOfSpeech: string;
  meaningVi: string;
  definition: string;
  example: string;
  synonyms: string; // comma separated
}

export interface StudioQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface StudioLesson {
  id: string | null; // null => create new
  lessonType: "reading" | "flashcard";
  title: string;
  subtitle: string;
  topic: string;
  difficulty: LessonLevel;
  durationMinutes: number;
  isPublished: boolean;
  paragraphs: string; // blank-line separated
  keyTakeaways: string[];
  cards: StudioCard[]; // flashcard deck rows OR interactive vocabulary
  questions: StudioQuestion[];
}

export function emptyStudioCard(): StudioCard {
  return {
    term: "",
    phonetic: "",
    partOfSpeech: "noun",
    meaningVi: "",
    definition: "",
    example: "",
    synonyms: "",
  };
}

/**
 * Looks up a term in `renewableEnergyGlossary` (exact or stem match) and returns
 * a pre-populated `StudioCard` for the Reading Module Interactive Words manager.
 */
export function lookupGlossaryStudioCard(rawTerm: string): StudioCard {
  const cleanTerm = rawTerm.trim();
  const key = cleanTerm.toLowerCase();
  const exact = renewableEnergyGlossary.find(
    (fc) => fc.term.toLowerCase() === key
  );
  const match =
    exact ||
    renewableEnergyGlossary.find(
      (fc) =>
        key.includes(fc.term.toLowerCase()) ||
        fc.term.toLowerCase().includes(key)
    );

  return {
    term: cleanTerm,
    phonetic: match?.phonetic || "/ˈtek.nɪ.kəl tɝːm/",
    partOfSpeech: "noun",
    meaningVi: match?.meaningVi || "Thuật ngữ kỹ thuật năng lượng sạch",
    definition: match
      ? `Technical STEM term used in renewable energy: ${cleanTerm}.`
      : `Key technical concept highlighted in this reading passage.`,
    example: match?.example || "",
    synonyms: "",
  };
}

/**
 * Builds the default pre-existing interactive vocabulary list for a Reading Module
 * by combining `content.highlightedTerms` and any `renewableEnergyGlossary` terms
 * that appear in the reading passage text.
 */
export function buildDefaultInteractiveCardsForReading(
  paragraphs: string[],
  highlightedTerms: string[] = []
): StudioCard[] {
  const fullTextLower = paragraphs.join(" ").toLowerCase();
  const seen = new Set<string>();
  const result: StudioCard[] = [];

  const addTerm = (termStr: string) => {
    const t = termStr.trim();
    if (!t) return;
    const lower = t.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    result.push(lookupGlossaryStudioCard(t));
  };

  highlightedTerms.forEach(addTerm);

  renewableEnergyGlossary.forEach((fc) => {
    if (fullTextLower.includes(fc.term.toLowerCase())) {
      addTerm(fc.term);
    }
  });

  return result;
}

export function emptyStudioQuestion(): StudioQuestion {
  return {
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
  };
}

export function emptyStudioLesson(): StudioLesson {
  return {
    id: null,
    lessonType: "reading",
    title: "",
    subtitle: "",
    topic: "Renewable Energy & Clean Tech",
    difficulty: "Beginner",
    durationMinutes: 5,
    isPublished: true,
    paragraphs: "",
    keyTakeaways: [],
    cards: [],
    questions: [],
  };
}

/** Loads a lesson plus its flashcards & questions (including drafts) for the Admin Studio. */
export async function fetchFullLessonForEdit(
  lessonId: string
): Promise<StudioLesson | null> {
  const supabase = createClient();
  const [l, f, q] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle(),
    supabase
      .from("flashcards")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("lesson_questions")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("sort_order", { ascending: true }),
  ]);
  const row = l.data as DbLesson | null;
  if (!row) return null;

  const level: LessonLevel =
    row.difficulty === "Intermediate" || row.difficulty === "Advanced"
      ? row.difficulty
      : "Beginner";

  const lessonType = row.lesson_type === "flashcard" ? "flashcard" : "reading";
  const paragraphsArr = Array.isArray(row.content?.paragraphs)
    ? row.content.paragraphs
    : [];
  const highlightedTermsArr = Array.isArray(row.content?.highlightedTerms)
    ? row.content.highlightedTerms
    : [];
  const rawContent = (row.content || {}) as {
    interactiveConfigured?: boolean;
    interactiveWords?: StudioCard[];
  };

  let cards: StudioCard[] = ((f.data || []) as DbFlashcard[]).map((c) => ({
    term: c.term,
    phonetic: c.phonetic || "",
    partOfSpeech: c.part_of_speech || "noun",
    meaningVi: c.vietnamese_meaning,
    definition: c.definition || "",
    example: c.example_sentence || "",
    synonyms: Array.isArray(c.synonyms) ? c.synonyms.join(", ") : "",
  }));

  if (lessonType === "reading" && cards.length === 0) {
    if (rawContent.interactiveConfigured) {
      cards = Array.isArray(rawContent.interactiveWords)
        ? rawContent.interactiveWords
        : [];
    } else {
      cards = buildDefaultInteractiveCardsForReading(
        paragraphsArr,
        highlightedTermsArr
      );
    }
  }

  return {
    id: row.id,
    lessonType,
    title: row.title,
    subtitle: row.subtitle || "",
    topic: row.topic_id || "",
    difficulty: level,
    durationMinutes: row.duration_minutes || 5,
    isPublished: row.is_published,
    paragraphs: paragraphsArr.join("\n\n"),
    keyTakeaways: Array.isArray(row.key_takeaways) ? row.key_takeaways : [],
    cards,
    questions: ((q.data || []) as DbLessonQuestion[]).map((x) => {
      const opts = Array.isArray(x.options) ? x.options : [];
      return {
        question: x.question,
        options: [opts[0] || "", opts[1] || "", opts[2] || "", opts[3] || ""],
        correctIndex:
          typeof x.correct_index === "number" ? x.correct_index : 0,
        explanation: x.explanation || "",
      };
    }),
  };
}

/**
 * Upserts a lesson and fully replaces its flashcards and lesson_questions rows.
 * Returns the lesson id, or throws on failure.
 */
export async function saveFullLessonToSupabase(
  input: StudioLesson
): Promise<string> {
  const supabase = createClient();
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");

  let id = input.id;
  let sortOrder = 0;
  if (!id) {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    id = `lesson-custom-${slug || "item"}-${Date.now().toString(36)}`;
    const { data } = await supabase
      .from("lessons")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    sortOrder = ((data?.[0] as { sort_order?: number } | undefined)?.sort_order || 0) + 1;
  }

  const isReading = input.lessonType === "reading";
  const paragraphs = input.paragraphs
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const cards = input.cards.filter((c) => c.term.trim());
  const questions = isReading
    ? input.questions.filter(
        (q) => q.question.trim() && q.options.some((o) => o.trim())
      )
    : [];

  const lessonRow: Record<string, unknown> = {
    id,
    topic_id: input.topic.trim() || "Renewable Energy & Clean Tech",
    title,
    subtitle: input.subtitle.trim(),
    category: isReading ? "reading" : "vocabulary",
    difficulty: input.difficulty,
    duration_minutes: Math.max(1, input.durationMinutes || 1),
    lesson_type: input.lessonType,
    content: {
      paragraphs: isReading ? paragraphs : [],
      highlightedTerms: isReading ? cards.map((c) => c.term.trim()) : [],
      ...(isReading
        ? {
            interactiveConfigured: true,
            interactiveWords: cards,
          }
        : {}),
    },
    key_takeaways: isReading
      ? input.keyTakeaways.map((k) => k.trim()).filter(Boolean)
      : [],
    is_published: input.isPublished,
  };
  if (input.id === null) lessonRow.sort_order = sortOrder;

  const { data: savedLessons, error: lErr } = await supabase
    .from("lessons")
    .upsert(lessonRow, { onConflict: "id" })
    .select();
  if (lErr) throw new Error(`Lesson save failed: ${lErr.message}`);
  if (!savedLessons || savedLessons.length === 0) {
    throw new Error(
      "Supabase RLS blocked saving this lesson (0 rows written). Please run the Admin RLS policy SQL in Supabase SQL Editor."
    );
  }

  const { error: dfErr } = await supabase
    .from("flashcards")
    .delete()
    .eq("lesson_id", id);
  if (dfErr) throw new Error(`Flashcard sync failed: ${dfErr.message}`);

  if (cards.length > 0) {
    const { error } = await supabase.from("flashcards").insert(
      cards.map((c, i) => ({
        id: `${id}-fc-${i + 1}`,
        lesson_id: id,
        term: c.term.trim(),
        phonetic: c.phonetic.trim(),
        part_of_speech: c.partOfSpeech.trim(),
        vietnamese_meaning: c.meaningVi.trim(),
        definition: c.definition.trim(),
        example_sentence: c.example.trim(),
        synonyms: c.synonyms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        sort_order: i + 1,
      }))
    );
    if (error) throw new Error(`Flashcard insert failed: ${error.message}`);
  }

  const { error: dqErr } = await supabase
    .from("lesson_questions")
    .delete()
    .eq("lesson_id", id);
  if (dqErr) throw new Error(`Question sync failed: ${dqErr.message}`);

  if (questions.length > 0) {
    const { error } = await supabase.from("lesson_questions").insert(
      questions.map((q, i) => ({
        id: `${id}-q-${i + 1}`,
        lesson_id: id,
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correct_index: q.correctIndex,
        explanation: q.explanation.trim(),
        sort_order: i + 1,
      }))
    );
    if (error) throw new Error(`Question insert failed: ${error.message}`);
  }

  cachedLessons = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wordwise_curriculum_updated", {
        detail: getCompletedLessonIds(),
      })
    );
  }
  return id;
}

export interface CurriculumProgressData {
  userId?: string;
  completedLessonIds: string[];
}

let memoryCompletedIds: string[] | null = null;
let memoryProgressUserId: string | undefined = undefined;
let cachedLessons: Lesson[] | null = null;

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
 * Fetches curriculum lessons, flashcards, and comprehension questions from Supabase,
 * ordered by `sort_order`. Gracefully falls back to `renewableEnergyLessons` if
 * Supabase is unconfigured, returns 0 rows, or encounters an error.
 */
export async function fetchCurriculumLessons(): Promise<Lesson[]> {
  if (!isSupabaseConfigured()) {
    return renewableEnergyLessons;
  }

  try {
    const supabase = createClient();

    const [lessonsRes, flashcardsRes, questionsRes] = await Promise.all([
      supabase
        .from("lessons")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("flashcards")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("lesson_questions")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    const allDbLessons = (lessonsRes.data || []) as DbLesson[];
    if (lessonsRes.error || allDbLessons.length === 0) {
      return renewableEnergyLessons;
    }

    const dbLessons = allDbLessons.filter((row) => row.is_published !== false);

    const dbFlashcards = ((flashcardsRes.data || []) as DbFlashcard[]);
    const dbQuestions = ((questionsRes.data || []) as DbLessonQuestion[]);

    const mappedLessons: Lesson[] = dbLessons.map((row) => {
      const lessonType =
        row.lesson_type === "flashcard" ? "flashcard" : "reading";

      const cards: Flashcard[] = dbFlashcards
        .filter((fc) => fc.lesson_id === row.id)
        .map((fc) => ({
          term: fc.term,
          phonetic: fc.phonetic || "",
          meaningVi: fc.vietnamese_meaning,
          example: fc.example_sentence || "",
          definition: fc.definition || "",
          partOfSpeech: fc.part_of_speech || "",
          synonyms: Array.isArray(fc.synonyms) ? fc.synonyms : [],
        }));

      const quizQuestions: QuizQuestion[] = dbQuestions
        .filter((q) => q.lesson_id === row.id)
        .map((q) => ({
          question: q.question,
          options: Array.isArray(q.options) ? q.options : [],
          correctIndex:
            typeof q.correct_index === "number" ? q.correct_index : 0,
          explanation: q.explanation || "",
        }));

      const paragraphs = Array.isArray(row.content?.paragraphs)
        ? row.content.paragraphs
        : [];
      let highlightedTerms = Array.isArray(row.content?.highlightedTerms)
        ? row.content.highlightedTerms
        : [];
      const rawContent = (row.content || {}) as {
        interactiveConfigured?: boolean;
        interactiveWords?: StudioCard[];
      };

      let finalCards: Flashcard[] = cards;
      if (lessonType === "reading" && finalCards.length === 0) {
        const defaultStudioCards = rawContent.interactiveConfigured
          ? Array.isArray(rawContent.interactiveWords)
            ? rawContent.interactiveWords
            : []
          : buildDefaultInteractiveCardsForReading(
              paragraphs,
              highlightedTerms
            );
        finalCards = defaultStudioCards.map((c) => ({
          term: c.term,
          phonetic: c.phonetic || "",
          meaningVi: c.meaningVi,
          example: c.example || "",
          definition: c.definition || "",
          partOfSpeech: c.partOfSpeech || "",
          synonyms: [],
        }));
      }
      if (lessonType === "reading" && rawContent.interactiveConfigured) {
        highlightedTerms = finalCards.map((c) => c.term);
      } else if (lessonType === "reading" && finalCards.length > 0) {
        highlightedTerms = Array.from(
          new Set([...highlightedTerms, ...finalCards.map((c) => c.term)])
        );
      }

      const keyTakeaways = Array.isArray(row.key_takeaways)
        ? row.key_takeaways
        : [];

      const durationMins =
        typeof row.duration_minutes === "number" && row.duration_minutes > 0
          ? row.duration_minutes
          : 6;

      const readingTime =
        lessonType === "flashcard"
          ? `${cards.length} flashcards`
          : `${durationMins} mins`;

      const validLevel: LessonLevel =
        row.difficulty === "Beginner" ||
        row.difficulty === "Intermediate" ||
        row.difficulty === "Advanced"
          ? row.difficulty
          : "Beginner";

      const validCategory: LessonCategory =
        row.category === "reading" ||
        row.category === "vocabulary" ||
        row.category === "notes" ||
        row.category === "quiz" ||
        row.category === "practice"
          ? row.category
          : lessonType === "flashcard"
          ? "vocabulary"
          : "reading";

      const summaryText = row.subtitle || "";

      return {
        id: row.id,
        title: row.title,
        topic: row.topic_id || "Renewable Energy & Clean Tech",
        lessonType,
        category: validCategory,
        readingTime,
        estimatedMinutes: durationMins,
        level: validLevel,
        summary: summaryText,
        description: summaryText,
        readingText: {
          paragraphs,
          highlightedTerms,
        },
        content: {
          paragraphs,
          highlightedTerms,
        },
        flashcards: finalCards,
        quiz: quizQuestions,
        comprehensionQuestions: quizQuestions,
        keyTakeaways,
        isCompleted: false,
      };
    });

    cachedLessons = mappedLessons;
    return mappedLessons;
  } catch {
    return cachedLessons || renewableEnergyLessons;
  }
}

function getStoredCurriculumProgressPayload(): {
  userId?: string;
  completedLessonIds: string[];
} {
  if (typeof window === "undefined") {
    return {
      userId: memoryProgressUserId,
      completedLessonIds: memoryCompletedIds || [],
    };
  }
  try {
    const raw = localStorage.getItem(CURRICULUM_PROGRESS_KEY);
    if (!raw) {
      return {
        userId: memoryProgressUserId,
        completedLessonIds: memoryCompletedIds || [],
      };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.completedLessonIds)) {
      const ids = parsed.completedLessonIds.filter(
        (id: unknown): id is string => typeof id === "string"
      );
      const uid =
        typeof parsed?.userId === "string" ? parsed.userId : undefined;
      memoryCompletedIds = ids;
      memoryProgressUserId = uid;
      return { userId: uid, completedLessonIds: ids };
    }
    if (Array.isArray(parsed)) {
      const ids = parsed.filter(
        (id: unknown): id is string => typeof id === "string"
      );
      memoryCompletedIds = ids;
      return { userId: undefined, completedLessonIds: ids };
    }
    return {
      userId: memoryProgressUserId,
      completedLessonIds: memoryCompletedIds || [],
    };
  } catch {
    return {
      userId: memoryProgressUserId,
      completedLessonIds: memoryCompletedIds || [],
    };
  }
}

/**
 * Synchronously reads completed lesson IDs from memory/localStorage cache.
 */
export function getCompletedLessonIds(): string[] {
  return getStoredCurriculumProgressPayload().completedLessonIds;
}

/** Backward-compatible alias */
export const getCurriculumProgress = getCompletedLessonIds;

/**
 * Persists completed lesson IDs to local cache and dispatches `wordwise_curriculum_updated`.
 */
export function saveCurriculumProgress(
  completedLessonIds: string[],
  userId?: string
): void {
  const effectiveUserId = userId ?? memoryProgressUserId;
  memoryCompletedIds = completedLessonIds;
  memoryProgressUserId = effectiveUserId;
  if (typeof window === "undefined") return;
  try {
    const data: CurriculumProgressData = {
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
      completedLessonIds,
    };
    localStorage.setItem(CURRICULUM_PROGRESS_KEY, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("wordwise_curriculum_updated", {
        detail: completedLessonIds,
      })
    );
  } catch (err) {
    console.warn("Wordwise: could not save curriculum progress cache.", err);
  }
}

/**
 * Persists the learner's completed modules count (`0..6`) directly to `public.profiles`
 * (`completed_modules` column + schema-safe `freeze_count` carrier) so all viewers
 * on the Leaderboard see the exact same `X/6 Modules` and composite XP.
 */
export async function syncCompletedModulesToProfile(
  userId: string,
  completedModulesCount: number
): Promise<void> {
  if (!userId || !isSupabaseConfigured()) return;

  try {
    const supabase = createClient();
    const clampedModules = Math.min(6, Math.max(0, completedModulesCount));

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle<{
        freeze_count?: number | null;
        completed_modules?: number | null;
      }>();

    const rawFreeze =
      typeof prof?.freeze_count === "number" ? prof.freeze_count : 1;
    const actualFreeze = rawFreeze >= 100 ? rawFreeze % 100 : rawFreeze;
    const avatarPrefix =
      rawFreeze >= 10000 ? Math.floor(rawFreeze / 10000) * 10000 : 0;
    const encodedFreeze =
      avatarPrefix + 1000 + clampedModules * 100 + (actualFreeze % 100);

    const { error } = await supabase
      .from("profiles")
      .update({
        completed_modules: clampedModules,
        freeze_count: encodedFreeze,
      })
      .eq("id", userId);

    if (error) {
      await supabase
        .from("profiles")
        .update({
          freeze_count: encodedFreeze,
        })
        .eq("id", userId);
    }
  } catch (err) {
    console.warn(
      "Wordwise: failed to sync completed_modules to profiles.",
      err
    );
  }
}

/**
 * Queries `SELECT lesson_id FROM user_lesson_progress WHERE user_id = user.id`
 * from Supabase, reconciles with user-owned local progress, persists `completed_modules`
 * to `public.profiles`, caches the result locally, and dispatches `wordwise_curriculum_updated`.
 */
export async function fetchCompletedLessonIds(): Promise<string[]> {
  const localPayload = getStoredCurriculumProgressPayload();
  const fallback = localPayload.completedLessonIds;
  if (!isSupabaseConfigured()) return fallback;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return fallback;

    const [lessonsRes, profRes] = await Promise.all([
      supabase
        .from("user_lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id),
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle<{
          xp?: number | null;
          completed_modules?: number | null;
          freeze_count?: number | null;
        }>(),
    ]);

    const dbIds = Array.isArray(lessonsRes.data)
      ? Array.from(
          new Set(
            lessonsRes.data
              .map((row: { lesson_id?: unknown }) => row.lesson_id)
              .filter((id): id is string => typeof id === "string")
          )
        )
      : [];

    const profXp =
      typeof profRes.data?.xp === "number" ? profRes.data.xp : 0;
    const canClaimLocalIds =
      localPayload.userId === user.id ||
      (!localPayload.userId &&
        fallback.length > 0 &&
        (dbIds.length > 0 || profXp > 0));

    const mergedIds = canClaimLocalIds
      ? Array.from(new Set([...dbIds, ...fallback]))
      : dbIds;

    // Backfill any missing lesson rows into user_lesson_progress
    const missingInDb = mergedIds.filter((id) => !dbIds.includes(id));
    if (missingInDb.length > 0) {
      await supabase.from("user_lesson_progress").upsert(
        missingInDb.map((lessonId) => ({
          user_id: user.id,
          lesson_id: lessonId,
          completed_at: new Date().toISOString(),
        })),
        { onConflict: "user_id,lesson_id" }
      );
    }

    // Immediately persist completed_modules count to public.profiles so all leaderboard viewers see it
    await syncCompletedModulesToProfile(user.id, mergedIds.length);

    saveCurriculumProgress(mergedIds, user.id);
    return mergedIds;
  } catch {
    return fallback;
  }
}

/**
 * Marks a lesson as completed:
 * - Optimistically updates the local cache & dispatches `wordwise_curriculum_updated`
 * - Upserts `{ user_id: user.id, lesson_id: lessonId }` into `public.user_lesson_progress`
 * - Immediately updates `completed_modules` in `public.profiles`
 * - Triggers `recordStreakAction()`
 */
export function markLessonCompleted(lessonId: string): string[] {
  const current = getCompletedLessonIds();
  const updated = current.includes(lessonId)
    ? current
    : [...current, lessonId];

  saveCurriculumProgress(updated);
  recordStreakAction();

  if (isSupabaseConfigured()) {
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        saveCurriculumProgress(updated, user.id);

        await Promise.all([
          supabase.from("user_lesson_progress").upsert(
            {
              user_id: user.id,
              lesson_id: lessonId,
              completed_at: new Date().toISOString(),
            },
            { onConflict: "user_id,lesson_id" }
          ),
          syncCompletedModulesToProfile(user.id, updated.length),
        ]);
      } catch (err) {
        console.warn(
          "Wordwise: failed to upsert user_lesson_progress to Supabase.",
          err
        );
      }
    })();
  }

  return updated;
}

/** Alias for markLessonCompleted */
export const completeLesson = markLessonCompleted;

/**
 * Removes a lesson from the completed list and deletes the row in Supabase.
 */
export function uncompleteLesson(lessonId: string): string[] {
  const current = getCompletedLessonIds();
  const updated = current.filter((id) => id !== lessonId);
  saveCurriculumProgress(updated);

  if (isSupabaseConfigured()) {
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        saveCurriculumProgress(updated, user.id);

        await Promise.all([
          supabase
            .from("user_lesson_progress")
            .delete()
            .eq("user_id", user.id)
            .eq("lesson_id", lessonId),
          syncCompletedModulesToProfile(user.id, updated.length),
        ]);
      } catch (err) {
        console.warn(
          "Wordwise: failed to delete user_lesson_progress from Supabase.",
          err
        );
      }
    })();
  }

  return updated;
}

/**
 * Toggles a lesson's completion status in local cache and Supabase.
 */
export function toggleLessonCompletion(lessonId: string): string[] {
  const current = getCompletedLessonIds();
  const exists = current.includes(lessonId);
  if (exists) {
    return uncompleteLesson(lessonId);
  }
  return markLessonCompleted(lessonId);
}

/**
 * Checks if a specific lesson is completed.
 */
export function isLessonCompleted(lessonId: string): boolean {
  return getCompletedLessonIds().includes(lessonId);
}

/**
 * Clears local curriculum progress cache.
 */
export function clearCurriculumProgress(): void {
  memoryCompletedIds = [];
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CURRICULUM_PROGRESS_KEY);
    window.dispatchEvent(
      new CustomEvent("wordwise_curriculum_updated", { detail: [] })
    );
  } catch {
    // ignore
  }
}
