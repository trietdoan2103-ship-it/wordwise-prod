"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useGame } from "@/context/GameContext";
import { createClient } from "@/lib/supabase/client";
import DashboardSidebar from "./DashboardSidebar";
import {
  clearCurriculumProgress,
  emptyStudioCard,
  emptyStudioLesson,
  emptyStudioQuestion,
  fetchFullLessonForEdit,
  lookupGlossaryStudioCard,
  saveFullLessonToSupabase,
  type StudioCard,
  type StudioLesson,
  type StudioQuestion,
} from "@/lib/curriculumStorage";
import { resetStreak } from "@/lib/streak";
import { clearStoredUnlockTimestamps } from "@/lib/achievements";
import {
  cleanEventFormatLabel,
  clearRegisteredEvents,
  isDbEventPublished,
  setLocalEventPublishedState,
} from "@/lib/eventsStorage";
import { resetSubscription } from "@/lib/subscriptionStorage";
import {
  getCircuitDefaultsForBoard,
  getDefaultCulturalBriefingForCountry,
  readCountryStudioCache,
  syncCountryMissionStagesData,
  withUsaCircuitRepair,
  withUsaTargetSmasher,
  type CountryCulturalBriefing,
  type CountryModuleConfig,
} from "@/lib/progress";
import {
  DEFAULT_FORUM_RULES,
  FORUM_CATEGORIES,
  deleteForumPost,
  fetchForumData,
  fetchForumRules,
  formatRelativeTime,
  saveForumRules,
  toggleLockPost,
  togglePinPost,
  type ForumCategory,
  type ForumPost,
} from "@/lib/forum";
import type {
  CircuitPair,
  CountryGameType,
  VideoDomain,
  VideoLevel,
  VideoQuizQuestion,
  VideoTranscriptNote,
  DbCountry,
  DbCountryCircuitBoard,
  DbCountryListeningQuestion,
  DbCountryModuleConfig,
  DbCountrySentenceRound,
  DbCountrySpeakingTurn,
  DbCountryTechRunnerQuestion,
  DbCountryTargetSmasherItem,
  DbCountryVocabularyQuestion,
  DbEvent,
  DbLesson,
  DbVideo,
} from "@/types/database";

type AdminTab =
  | "lessons"
  | "videos"
  | "countries"
  | "events"
  | "community"
  | "tools";

const inputCls =
  "w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-orange-400 focus:outline-none";
const btnPrimary =
  "rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow-xs hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 cursor-pointer";
const cardCls =
  "rounded-2xl border border-orange-200/80 bg-white p-5 shadow-xs";

export const VIDEOS_STORAGE_KEY = "wordwise_videos_store_v1";
const VIDEOS_SEEDED_KEY = "wordwise_videos_seeded_v1";

import {
  DEFAULT_STEM_VIDEOS,
  VIDEO_DOMAINS,
  VIDEO_LEVELS,
  normalizeVideo,
} from "@/data/videos";

export { DEFAULT_STEM_VIDEOS };

function getLocalVideosStore(): DbVideo[] {
  if (typeof window === "undefined") return DEFAULT_STEM_VIDEOS;
  try {
    const raw = localStorage.getItem(VIDEOS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(DEFAULT_STEM_VIDEOS));
      return DEFAULT_STEM_VIDEOS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as DbVideo[]).map(normalizeVideo)
      : DEFAULT_STEM_VIDEOS;
  } catch {
    return DEFAULT_STEM_VIDEOS;
  }
}

function saveLocalVideosStore(list: DbVideo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

function getYouTubeThumbUrl(url: string): string | null {
  const trimmed = url.trim();
  const idMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  const id = idMatch ? idMatch[1] : /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const POS_OPTIONS = ["noun", "verb", "adjective", "adverb", "phrase"];
const labelCls = "mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500";
const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "into", "when", "where",
  "which", "while", "their", "there", "these", "those", "have", "has", "had",
  "were", "been", "being", "will", "would", "could", "should", "about", "after",
  "before", "between", "through", "during", "under", "over", "more", "most",
  "other", "some", "such", "no", "nor", "not", "only", "own", "same", "than",
  "too", "very", "can", "just", "also", "they", "them", "what", "each", "both",
]);

function LessonStudio({
  initial,
  onClose,
  onSaved,
  flash,
}: {
  initial: StudioLesson;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  flash: (text: string, ok?: boolean) => void;
}) {
  const [d, setD] = useState<StudioLesson>(initial);
  const [saving, setSaving] = useState(false);
  const [quickTerm, setQuickTerm] = useState("");
  const [focusedWordIndex, setFocusedWordIndex] = useState<number | null>(null);
  const isEditingExisting = Boolean(d.id);
  const isReading = d.lessonType === "reading";
  const passageLower = d.paragraphs.toLowerCase();

  // Extract candidate clickable words from the reading passage + active multi-word terms
  const passageWordChips = React.useMemo(() => {
    if (!isReading) return [];
    const seen = new Set<string>();
    const list: string[] = [];

    // Include active interactive words that appear in the passage first
    d.cards.forEach((c) => {
      const t = c.term.trim();
      if (t && passageLower.includes(t.toLowerCase())) {
        const lower = t.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          list.push(t);
        }
      }
    });

    // Extract distinct meaningful words (4+ letters) from the passage
    const matches = d.paragraphs.match(/[A-Za-z][A-Za-z-]{3,}/g) || [];
    for (const raw of matches) {
      const lower = raw.toLowerCase();
      if (STOPWORDS.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      list.push(raw);
      if (list.length >= 48) break;
    }
    return list;
  }, [isReading, d.paragraphs, d.cards, passageLower]);

  function patch(p: Partial<StudioLesson>) {
    setD((prev) => ({ ...prev, ...p }));
  }
  function patchCard(i: number, p: Partial<StudioCard>) {
    setD((prev) => ({
      ...prev,
      cards: prev.cards.map((c, idx) => (idx === i ? { ...c, ...p } : c)),
    }));
  }
  function moveCard(i: number, dir: -1 | 1) {
    setD((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.cards.length) return prev;
      const cards = [...prev.cards];
      [cards[i], cards[j]] = [cards[j], cards[i]];
      return { ...prev, cards };
    });
  }
  function removeCard(i: number) {
    setD((prev) => ({ ...prev, cards: prev.cards.filter((_, idx) => idx !== i) }));
  }
  function duplicateCard(i: number) {
    setD((prev) => {
      const cards = [...prev.cards];
      cards.splice(i + 1, 0, { ...prev.cards[i] });
      return { ...prev, cards };
    });
  }
  function addCard(term = "") {
    setD((prev) => ({
      ...prev,
      cards: [
        ...prev.cards,
        term && prev.lessonType === "reading"
          ? lookupGlossaryStudioCard(term)
          : { ...emptyStudioCard(), term },
      ],
    }));
  }
  function scrollToInteractiveRow(index: number) {
    setFocusedWordIndex(index);
    setTimeout(() => {
      const el = document.getElementById(`interactive-word-row-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector<HTMLInputElement>("input[data-field='meaningVi']");
        input?.focus();
      }
    }, 60);
    setTimeout(() => setFocusedWordIndex(null), 2200);
  }
  function handleClickPassageChip(word: string) {
    const clean = word.trim();
    if (!clean) return;
    const existingIdx = d.cards.findIndex(
      (c) => c.term.trim().toLowerCase() === clean.toLowerCase()
    );
    if (existingIdx >= 0) {
      scrollToInteractiveRow(existingIdx);
      return;
    }
    const nextIdx = d.cards.length;
    addCard(clean);
    scrollToInteractiveRow(nextIdx);
  }
  function patchQuestion(i: number, p: Partial<StudioQuestion>) {
    setD((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => (idx === i ? { ...q, ...p } : q)),
    }));
  }
  function patchOption(qi: number, oi: number, value: string) {
    setD((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => {
        if (idx !== qi) return q;
        const options = [...q.options] as StudioQuestion["options"];
        options[oi] = value;
        return { ...q, options };
      }),
    }));
  }
  function bulkImport() {
    const raw = window.prompt(
      "Paste one card per line: term | Vietnamese meaning | English definition | example"
    );
    if (!raw) return;
    const rows = raw
      .split("\n")
      .map((line) => line.split("|").map((x) => x.trim()))
      .filter((p) => p[0]);
    setD((prev) => ({
      ...prev,
      cards: [
        ...prev.cards,
        ...rows.map((p) => ({
          ...emptyStudioCard(),
          term: p[0],
          meaningVi: p[1] || "",
          definition: p[2] || "",
          example: p[3] || "",
        })),
      ],
    }));
  }
  function extractFromPassage() {
    const sel = window.getSelection()?.toString().trim() || "";
    const term = quickTerm.trim() || sel;
    if (!term) {
      flash("Type a word/phrase or select text in the passage box first.", false);
      return;
    }
    const existingIdx = d.cards.findIndex(
      (c) => c.term.trim().toLowerCase() === term.toLowerCase()
    );
    if (existingIdx >= 0) {
      setQuickTerm("");
      scrollToInteractiveRow(existingIdx);
      flash(`"${term}" is already interactive — scrolled to its row.`);
      return;
    }
    const nextIdx = d.cards.length;
    addCard(term);
    setQuickTerm("");
    scrollToInteractiveRow(nextIdx);
  }
  function onPassageSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    const t = e.currentTarget;
    const s = t.value.slice(t.selectionStart, t.selectionEnd).trim();
    if (s && s.length <= 60 && !s.includes("\n")) setQuickTerm(s);
  }

  async function handleSave() {
    if (!d.title.trim()) return flash("Title is required.", false);
    if (isReading && !d.paragraphs.trim()) {
      return flash("Reading passage is required.", false);
    }
    if (!isReading && d.cards.filter((c) => c.term.trim()).length === 0) {
      return flash("Add at least one flashcard to this deck.", false);
    }
    setSaving(true);
    try {
      await saveFullLessonToSupabase(d);
      flash(`Saved "${d.title.trim()}".`);
      await onSaved();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Save failed.", false);
    }
    setSaving(false);
  }

  return (
    <section className={`${cardCls} flex flex-col gap-6`}>
      {/* Top Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-extrabold text-slate-900">
            {isEditingExisting
              ? isReading
                ? "✏️ Edit Reading Module"
                : "✏️ Edit Flashcard Deck"
              : "+ Create New Lesson"}
          </h2>
          {isEditingExisting && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                isReading
                  ? "border-orange-300 bg-orange-100 text-orange-800"
                  : "border-amber-300 bg-amber-100 text-amber-800"
              }`}
            >
              {isReading ? "📖 Reading Module Editor" : "🗂️ Flashcard Deck Editor"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={btnPrimary}
          >
            {saving ? "Saving..." : "💾 Save Lesson"}
          </button>
        </div>
      </div>

      {/* Type Switcher ONLY when creating a new lesson */}
      {!isEditingExisting && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mr-1">
            Lesson Type:
          </span>
          {(["reading", "flashcard"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => patch({ lessonType: t })}
              className={`rounded-xl border px-4 py-2 text-sm font-bold cursor-pointer ${
                d.lessonType === t
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
              }`}
            >
              {t === "reading" ? "📖 Reading Module" : "🗂️ Flashcard Deck"}
            </button>
          ))}
        </div>
      )}

      {/* Common Metadata */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Title *</label>
          <input
            className={inputCls}
            value={d.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Summary / Subtitle</label>
          <input
            className={inputCls}
            value={d.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <input
            className={inputCls}
            list="studio-categories"
            placeholder="e.g. Solar Energy, Clean Tech"
            value={d.topic}
            onChange={(e) => patch({ topic: e.target.value })}
          />
          <datalist id="studio-categories">
            <option value="Solar Energy" />
            <option value="Clean Tech" />
            <option value="Renewable Energy & Clean Tech" />
          </datalist>
        </div>
        <div>
          <label className={labelCls}>Difficulty</label>
          <select
            className={inputCls}
            value={d.difficulty}
            onChange={(e) =>
              patch({ difficulty: e.target.value as StudioLesson["difficulty"] })
            }
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Duration (minutes)</label>
          <input
            className={inputCls}
            type="number"
            min={1}
            value={d.durationMinutes}
            onChange={(e) => patch({ durationMinutes: Number(e.target.value) || 1 })}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-orange-500"
            checked={d.isPublished}
            onChange={(e) => patch({ isPublished: e.target.checked })}
          />
          Published
        </label>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODE A: READING MODULE EDITOR ONLY
         ══════════════════════════════════════════════════════════════════ */}
      {isReading ? (
        <>
          {/* 1. Reading Passage Paragraphs */}
          <div>
            <label className={labelCls}>
              Reading Passage (blank line or new line = new paragraph)
            </label>
            <textarea
              className={inputCls}
              rows={10}
              value={d.paragraphs}
              onChange={(e) => patch({ paragraphs: e.target.value })}
              onSelect={onPassageSelect}
              placeholder="Write or paste the reading passage..."
            />
          </div>

          {/* 2. Key Takeaways */}
          <div>
            <label className={labelCls}>Key Takeaways</label>
            <div className="flex flex-col gap-2">
              {d.keyTakeaways.map((k, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputCls}
                    value={k}
                    placeholder={`Takeaway ${i + 1}`}
                    onChange={(e) =>
                      patch({
                        keyTakeaways: d.keyTakeaways.map((x, idx) =>
                          idx === i ? e.target.value : x
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        keyTakeaways: d.keyTakeaways.filter((_, idx) => idx !== i),
                      })
                    }
                    className="rounded-lg border border-rose-200 px-3 text-sm text-rose-700 hover:bg-rose-50 cursor-pointer"
                    aria-label="Remove takeaway"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <div>
                <button
                  type="button"
                  onClick={() => patch({ keyTakeaways: [...d.keyTakeaways, ""] })}
                  className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                >
                  + Add Takeaway
                </button>
              </div>
            </div>
          </div>

          {/* 3. Interactive Passage Vocabulary Manager */}
          <div className="flex flex-col gap-4 rounded-2xl border border-orange-200/90 bg-orange-50/25 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  🔊 Interactive Words List ({d.cards.length} Active Words)
                </h3>
                <p className="text-xs text-slate-600">
                  Words in this list are highlighted with ✦ inside the reading passage so learners can click them for Vietnamese meaning &amp; TTS pronunciation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextIdx = d.cards.length;
                  addCard("");
                  scrollToInteractiveRow(nextIdx);
                }}
                className="rounded-xl border border-orange-300 bg-white px-3.5 py-2 text-xs font-extrabold text-orange-700 hover:bg-orange-50 cursor-pointer"
              >
                + Add Interactive Word
              </button>
            </div>

            {/* Clickable Word-Chip Helper from Reading Passage + Quick Extract */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="flex flex-wrap gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Type a word/phrase from the passage (or highlight text in the passage box above)"
                  value={quickTerm}
                  onChange={(e) => setQuickTerm(e.target.value)}
                />
                <button type="button" onClick={extractFromPassage} className={btnPrimary}>
                  ✨ Extract / Click Word from Passage
                </button>
              </div>

              {passageWordChips.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-amber-900/80">
                    Click any passage word below: active words (✦) jump to their row; plain words become interactive immediately:
                  </p>
                  <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {passageWordChips.map((word) => {
                      const isActive = d.cards.some(
                        (c) => c.term.trim().toLowerCase() === word.toLowerCase()
                      );
                      return (
                        <button
                          key={word}
                          type="button"
                          onClick={() => handleClickPassageChip(word)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                            isActive
                              ? "border-orange-400 bg-orange-500 text-white shadow-2xs"
                              : "border-orange-200/80 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50"
                          }`}
                          title={
                            isActive
                              ? `"${word}" is already interactive — click to edit its row`
                              : `Click to make "${word}" interactive in this passage`
                          }
                        >
                          <span>{word}</span>
                          {isActive && <span aria-hidden="true">✦</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Active Interactive Words List */}
            {d.cards.length === 0 ? (
              <p className="rounded-xl border border-dashed border-orange-200 bg-white p-4 text-center text-sm text-slate-500">
                No interactive words configured for this passage yet. Click any word chip above or click <strong>+ Add Interactive Word</strong>.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {d.cards.map((c, i) => {
                  const termTrim = c.term.trim();
                  const matchesPassage =
                    Boolean(termTrim) &&
                    passageLower.includes(termTrim.toLowerCase());
                  const isFocused = focusedWordIndex === i;

                  return (
                    <div
                      key={i}
                      id={`interactive-word-row-${i}`}
                      className={`rounded-2xl border bg-white p-3.5 transition-all ${
                        isFocused
                          ? "border-orange-500 ring-2 ring-orange-300"
                          : "border-orange-200/90"
                      }`}
                    >
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-800">
                            Word #{i + 1}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                              matchesPassage
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                          >
                            {matchesPassage
                              ? "✓ Matches text in passage"
                              : "⚠️ Not found in passage"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCard(i)}
                          className="rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                        >
                          🗑️ Remove Interactive
                        </button>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className={labelCls}>Term in Passage *</label>
                          <input
                            className={inputCls}
                            placeholder="e.g. photovoltaic"
                            value={c.term}
                            onChange={(e) => patchCard(i, { term: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Phonetic</label>
                          <input
                            className={inputCls}
                            placeholder="/ˌfəʊtəʊvɒlˈteɪɪk/"
                            value={c.phonetic}
                            onChange={(e) => patchCard(i, { phonetic: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Part of Speech</label>
                          <select
                            className={inputCls}
                            value={c.partOfSpeech}
                            onChange={(e) =>
                              patchCard(i, { partOfSpeech: e.target.value })
                            }
                          >
                            {POS_OPTIONS.concat(
                              POS_OPTIONS.includes(c.partOfSpeech) || !c.partOfSpeech
                                ? []
                                : [c.partOfSpeech]
                            ).map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Vietnamese Meaning *</label>
                          <input
                            data-field="meaningVi"
                            className={inputCls}
                            placeholder="Nghĩa tiếng Việt"
                            value={c.meaningVi}
                            onChange={(e) => patchCard(i, { meaningVi: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>English Definition</label>
                          <input
                            className={inputCls}
                            placeholder="Short English definition"
                            value={c.definition}
                            onChange={(e) =>
                              patchCard(i, { definition: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Example Sentence</label>
                          <input
                            className={inputCls}
                            placeholder="Example sentence"
                            value={c.example}
                            onChange={(e) => patchCard(i, { example: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Comprehension Quiz Questions Builder (A/B/C/D) */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-extrabold text-slate-900">
              ✏️ Comprehension Quiz ({d.questions.length})
            </h3>
            {d.questions.map((q, qi) => (
              <div
                key={qi}
                className="rounded-2xl border border-orange-200 bg-white p-4 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-800">
                    Question {qi + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        questions: d.questions.filter((_, idx) => idx !== qi),
                      })
                    }
                    className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 cursor-pointer"
                    aria-label="Remove question"
                  >
                    🗑️ Remove
                  </button>
                </div>
                <input
                  className={inputCls}
                  placeholder="Question prompt"
                  value={q.question}
                  onChange={(e) => patchQuestion(qi, { question: e.target.value })}
                />
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={q.correctIndex === oi}
                      onChange={() => patchQuestion(qi, { correctIndex: oi })}
                      className="h-4 w-4 accent-orange-500"
                      aria-label={`Mark ${"ABCD"[oi]} as correct`}
                    />
                    <span className="w-5 text-sm font-extrabold text-slate-700">
                      {"ABCD"[oi]}
                    </span>
                    <input
                      className={inputCls}
                      placeholder={`Option ${"ABCD"[oi]}`}
                      value={opt}
                      onChange={(e) => patchOption(qi, oi, e.target.value)}
                    />
                  </div>
                ))}
                <input
                  className={inputCls}
                  placeholder="Explanation (shown after answering)"
                  value={q.explanation}
                  onChange={(e) =>
                    patchQuestion(qi, { explanation: e.target.value })
                  }
                />
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={() =>
                  patch({ questions: [...d.questions, emptyStudioQuestion()] })
                }
                className="rounded-2xl border-2 border-dashed border-orange-300 bg-white px-5 py-3 text-sm font-extrabold text-orange-700 hover:bg-orange-50 cursor-pointer"
              >
                + Add Question
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
           MODE B: QUIZLET-STYLE FLASHCARD DECK EDITOR ONLY
           ══════════════════════════════════════════════════════════════════ */
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-slate-900">
              🗂️ Flashcard Deck Cards ({d.cards.length})
            </h3>
            <button
              type="button"
              onClick={bulkImport}
              className="rounded-xl border border-orange-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-orange-50 cursor-pointer"
            >
              📋 Bulk Import
            </button>
          </div>

          {d.cards.map((c, i) => (
            <div
              key={i}
              className="rounded-2xl border border-orange-200 bg-orange-50/30"
            >
              <div className="flex items-center justify-between border-b border-orange-100 px-4 py-2">
                <span className="text-sm font-extrabold text-slate-800">
                  Card #{i + 1}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveCard(i, -1)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-40 cursor-pointer"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === d.cards.length - 1}
                    onClick={() => moveCard(i, 1)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-40 cursor-pointer"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateCard(i)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs cursor-pointer"
                    aria-label="Duplicate card"
                    title="Duplicate"
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCard(i)}
                    className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700 cursor-pointer"
                    aria-label="Delete card"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className={labelCls}>Term *</label>
                    <input
                      className={inputCls}
                      value={c.term}
                      onChange={(e) => patchCard(i, { term: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Phonetic</label>
                    <input
                      className={inputCls}
                      placeholder="/ˌfəʊtəʊvɒlˈteɪɪk/"
                      value={c.phonetic}
                      onChange={(e) => patchCard(i, { phonetic: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Part of Speech</label>
                    <select
                      className={inputCls}
                      value={c.partOfSpeech}
                      onChange={(e) =>
                        patchCard(i, { partOfSpeech: e.target.value })
                      }
                    >
                      {POS_OPTIONS.concat(
                        POS_OPTIONS.includes(c.partOfSpeech) || !c.partOfSpeech
                          ? []
                          : [c.partOfSpeech]
                      ).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div>
                    <label className={labelCls}>Vietnamese Meaning *</label>
                    <input
                      className={inputCls}
                      value={c.meaningVi}
                      onChange={(e) => patchCard(i, { meaningVi: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>English Definition</label>
                    <input
                      className={inputCls}
                      value={c.definition}
                      onChange={(e) => patchCard(i, { definition: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Example Sentence</label>
                    <input
                      className={inputCls}
                      value={c.example}
                      onChange={(e) => patchCard(i, { example: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Synonyms (comma separated)</label>
                    <input
                      className={inputCls}
                      value={c.synonyms}
                      onChange={(e) => patchCard(i, { synonyms: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addCard()}
              className="flex-1 rounded-2xl border-2 border-dashed border-orange-300 bg-white py-3 text-sm font-extrabold text-orange-700 hover:bg-orange-50 cursor-pointer"
            >
              + Add Card
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-orange-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={btnPrimary}
        >
          {saving ? "Saving..." : "💾 Save Lesson"}
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Granular Country Content Studio — full CRUD over individual questions
   and rounds for a country's 3 sequential stages:
   1. Vocabulary Questions (`public.country_vocabulary_questions`)
   2. Listening Questions (`public.country_listening_questions`)
   3. Sentence Assembler Rounds (`public.country_sentence_rounds`)
   ───────────────────────────────────────────────────────────────────────── */

type CountrySubTab =
  | "vocab"
  | "listening"
  | "sentence"
  | "circuit"
  | "tech_runner"
  | "target_smasher"
  | "speaking"
  | "cultural";

interface TargetSmasherForm {
  tier: 1 | 2 | 3;
  icon: string;
  prompt: string;
  correctWord: string;
  distractors: [string, string, string];
}

const emptyTargetSmasherForm = (tier: 1 | 2 | 3 = 1): TargetSmasherForm => ({
  tier,
  icon: "🎯",
  prompt: "",
  correctWord: "",
  distractors: ["", "", ""],
});

interface TechRunnerQuestionForm {
  tier: 1 | 2 | 3;
  prompt: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
}

const emptyTechRunnerQuestionForm = (
  tier: 1 | 2 | 3 = 1
): TechRunnerQuestionForm => ({
  tier,
  prompt: "",
  options: ["", "", ""],
  correctIndex: 0,
});

interface CircuitBoardForm {
  boardNumber: number;
  topic: string;
  points: number;
  timeLimit: number;
  pairs: [CircuitPair, CircuitPair, CircuitPair, CircuitPair];
}

const emptyCircuitBoardForm = (nextBoardNum = 1): CircuitBoardForm => {
  const defs = getCircuitDefaultsForBoard(nextBoardNum);
  return {
    boardNumber: nextBoardNum,
    topic: "Renewable Energy & Smart Grid",
    points: defs.points,
    timeLimit: defs.timeLimit,
    pairs: [
      { clue: "", answer: "" },
      { clue: "", answer: "" },
      { clue: "", answer: "" },
      { clue: "", answer: "" },
    ],
  };
};

const COUNTRY_GAME_OPTIONS: {
  id: CountryGameType;
  label: string;
  icon: string;
}[] = [
  { id: "sentence_assembler", label: "Sentence Assembler", icon: "🧩" },
  { id: "circuit_repair", label: "Circuit Repair", icon: "🔌" },
  { id: "tech_runner", label: "Tech Runner", icon: "🏃" },
  { id: "target_smasher", label: "Target Smasher", icon: "🎯" },
];

interface SpeakingTurnForm {
  speakerRole: string;
  npcPrompt: string;
  targetLine: string;
  vietnameseTranslation: string;
  coachTip: string;
}

const emptySpeakingTurnForm = (): SpeakingTurnForm => ({
  speakerRole: "GRID ENGINEER SAYS",
  npcPrompt: "",
  targetLine: "",
  vietnameseTranslation: "",
  coachTip: "",
});

interface VocabQuestionForm {
  word: string;
  questionText: string;
  options: [string, string, string, string];
  correctIndex: number;
}

const emptyVocabQuestionForm = (): VocabQuestionForm => ({
  word: "",
  questionText: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

interface ListeningQuestionForm {
  title: string;
  transcript: string;
  questionText: string;
  options: [string, string, string, string];
  correctIndex: number;
}

const emptyListeningQuestionForm = (): ListeningQuestionForm => ({
  title: "Solar Grid Lab",
  transcript: "",
  questionText: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

interface SentenceRoundForm {
  roundNumber: number;
  targetSentence: string;
  wordChunksText: string;
  points: number;
  timeLimit: number;
}

const emptySentenceRoundForm = (nextRound = 1): SentenceRoundForm => ({
  roundNumber: nextRound,
  targetSentence: "",
  wordChunksText: "",
  points: 20,
  timeLimit: 20,
});

function shuffleTokens(sentence: string): string[] {
  const tokens = sentence
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length <= 1) return tokens;
  const copy = [...tokens];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  if (copy.join(" ") === tokens.join(" ") && copy.length > 1) {
    [copy[0], copy[copy.length - 1]] = [copy[copy.length - 1], copy[0]];
  }
  return copy;
}

function parseWordChunks(chunksInput: string, targetSentence: string): string[] {
  const raw = chunksInput.trim();
  if (!raw) {
    return shuffleTokens(targetSentence);
  }
  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return raw.split(/\s+/).filter(Boolean);
}

function CountryStudio({
  country,
  onClose,
  flash,
}: {
  country: DbCountry;
  onClose: () => void;
  flash: (text: string, ok?: boolean) => void;
}) {
  const cid = country.id.toLowerCase();
  const [subTab, setSubTab] = useState<CountrySubTab>("vocab");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vocabQuestions, setVocabQuestions] = useState<
    DbCountryVocabularyQuestion[]
  >([]);
  const [listeningQuestions, setListeningQuestions] = useState<
    DbCountryListeningQuestion[]
  >([]);
  const [sentenceRounds, setSentenceRounds] = useState<DbCountrySentenceRound[]>(
    []
  );
  const [speakingTurns, setSpeakingTurns] = useState<DbCountrySpeakingTurn[]>(
    []
  );
  const [circuitBoards, setCircuitBoards] = useState<DbCountryCircuitBoard[]>(
    []
  );
  const [techRunnerQuestions, setTechRunnerQuestions] = useState<
    DbCountryTechRunnerQuestion[]
  >([]);
  const [targetSmasherItems, setTargetSmasherItems] = useState<
    DbCountryTargetSmasherItem[]
  >([]);
  const [moduleConfig, setModuleConfig] = useState<CountryModuleConfig>({
    vocabularyEnabled: true,
    listeningEnabled: true,
    speakingEnabled: true,
    enabledGames: ["sentence_assembler"],
  });
  const [culturalBriefing, setCulturalBriefing] =
    useState<CountryCulturalBriefing>(() =>
      getDefaultCulturalBriefingForCountry(cid)
    );

  // Tab 1 form state
  const [vForm, setVForm] = useState<VocabQuestionForm>(
    emptyVocabQuestionForm()
  );
  const [editingVocabId, setEditingVocabId] = useState<string | null>(null);

  // Tab 2 form state
  const [lForm, setLForm] = useState<ListeningQuestionForm>(
    emptyListeningQuestionForm()
  );
  const [editingListeningId, setEditingListeningId] = useState<string | null>(
    null
  );

  // Tab 3 form state
  const [sForm, setSForm] = useState<SentenceRoundForm>(
    emptySentenceRoundForm(1)
  );
  const [editingSentenceId, setEditingSentenceId] = useState<string | null>(
    null
  );

  // Tab 4 form state (Speaking AI Dialogue)
  const [spForm, setSpForm] = useState<SpeakingTurnForm>(
    emptySpeakingTurnForm()
  );
  const [editingSpeakingId, setEditingSpeakingId] = useState<string | null>(
    null
  );

  // Tab 5 form state (Circuit Repair Boards)
  const [cbForm, setCbForm] = useState<CircuitBoardForm>(
    emptyCircuitBoardForm(1)
  );
  const [editingCircuitId, setEditingCircuitId] = useState<string | null>(null);

  // Tab 6 form state (Tech Runner Questions)
  const [trForm, setTrForm] = useState<TechRunnerQuestionForm>(
    emptyTechRunnerQuestionForm(1)
  );
  const [editingTechRunnerId, setEditingTechRunnerId] = useState<string | null>(
    null
  );

  // Tab 7 form state (Target Smasher Items)
  const [tsForm, setTsForm] = useState<TargetSmasherForm>(
    emptyTargetSmasherForm(1)
  );
  const [editingTargetSmasherId, setEditingTargetSmasherId] = useState<
    string | null
  >(null);

  // Hydrate initial rows from Supabase (auto-seeding USA defaults on first load)
  useEffect(() => {
    let alive = true;
    (async () => {
      const fallbackCache = readCountryStudioCache(cid);
      const seededKey = `wordwise_country_studio_seeded_${cid}_v4`;
      const alreadySeeded =
        typeof window !== "undefined" && Boolean(localStorage.getItem(seededKey));

      const supabase = createClient();
      const [vqRes, lqRes, srRes, spRes, cbRes, trRes, tsRes, mcRes] = await Promise.all([
        supabase
          .from("country_vocabulary_questions")
          .select("*")
          .eq("country_id", cid)
          .order("sort_order", { ascending: true }),
        supabase
          .from("country_listening_questions")
          .select("*")
          .eq("country_id", cid)
          .order("sort_order", { ascending: true }),
        supabase
          .from("country_sentence_rounds")
          .select("*")
          .eq("country_id", cid)
          .order("sort_order", { ascending: true }),
        supabase
          .from("country_speaking_turns")
          .select("*")
          .eq("country_id", cid)
          .order("sort_order", { ascending: true }),
        supabase
          .from("country_circuit_boards")
          .select("*")
          .eq("country_id", cid)
          .order("sort_order", { ascending: true }),
        supabase
          .from("country_tech_runner_questions")
          .select("*")
          .eq("country_id", cid)
          .order("sort_order", { ascending: true }),
        supabase
          .from("country_target_smasher_items")
          .select("*")
          .eq("country_id", cid)
          .order("sort_order", { ascending: true }),
        supabase
          .from("country_module_configs")
          .select("*")
          .eq("country_id", cid)
          .maybeSingle<DbCountryModuleConfig>(),
      ]);

      if (!alive) return;

      let vRows = (vqRes.data || []) as DbCountryVocabularyQuestion[];
      let lRows = (lqRes.data || []) as DbCountryListeningQuestion[];
      let sRows = (srRes.data || []) as DbCountrySentenceRound[];
      let spRows = (spRes.data || []) as DbCountrySpeakingTurn[];
      let cbRows = (cbRes.data || []) as DbCountryCircuitBoard[];
      let trRows = (trRes.data || []) as DbCountryTechRunnerQuestion[];
      let tsRows = (tsRes.data || []) as DbCountryTargetSmasherItem[];
      let mCfg: CountryModuleConfig = mcRes.data
        ? {
            vocabularyEnabled: Boolean(mcRes.data.vocabulary_enabled),
            listeningEnabled: Boolean(mcRes.data.listening_enabled),
            speakingEnabled: Boolean(mcRes.data.speaking_enabled),
            enabledGames: Array.isArray(mcRes.data.enabled_games)
              ? mcRes.data.enabled_games
              : fallbackCache.moduleConfig.enabledGames,
          }
        : fallbackCache.moduleConfig;

      mCfg = {
        ...mCfg,
        enabledGames: withUsaTargetSmasher(
          cid,
          withUsaCircuitRepair(cid, mCfg.enabledGames)
        ),
      };

      // Ensure USA has tech_runner enabled in local/initial view if not yet seeded
      if (cid === "usa" && !alreadySeeded && !mCfg.enabledGames.includes("tech_runner")) {
        mCfg = {
          ...mCfg,
          enabledGames: [...mCfg.enabledGames, "tech_runner"],
        };
      }

      // If tables exist and are empty on first load, seed default country items
      if (
        !vqRes.error &&
        !lqRes.error &&
        !srRes.error &&
        vRows.length === 0 &&
        lRows.length === 0 &&
        sRows.length === 0 &&
        !alreadySeeded &&
        (fallbackCache.vocabQuestions.length > 0 ||
          fallbackCache.listeningQuestions.length > 0 ||
          fallbackCache.sentenceRounds.length > 0)
      ) {
        if (typeof window !== "undefined") {
          localStorage.setItem(seededKey, "1");
        }
        await Promise.all([
          fallbackCache.vocabQuestions.length > 0
            ? supabase
                .from("country_vocabulary_questions")
                .upsert(fallbackCache.vocabQuestions, { onConflict: "id" })
            : Promise.resolve(),
          fallbackCache.listeningQuestions.length > 0
            ? supabase
                .from("country_listening_questions")
                .upsert(fallbackCache.listeningQuestions, { onConflict: "id" })
            : Promise.resolve(),
          fallbackCache.sentenceRounds.length > 0
            ? supabase
                .from("country_sentence_rounds")
                .upsert(fallbackCache.sentenceRounds, { onConflict: "id" })
            : Promise.resolve(),
          fallbackCache.speakingTurns.length > 0
            ? supabase
                .from("country_speaking_turns")
                .upsert(fallbackCache.speakingTurns, { onConflict: "id" })
            : Promise.resolve(),
          fallbackCache.circuitBoards.length > 0
            ? supabase
                .from("country_circuit_boards")
                .upsert(fallbackCache.circuitBoards, { onConflict: "id" })
            : Promise.resolve(),
          fallbackCache.techRunnerQuestions.length > 0
            ? supabase
                .from("country_tech_runner_questions")
                .upsert(fallbackCache.techRunnerQuestions, { onConflict: "id" })
            : Promise.resolve(),
        ]);
        vRows = fallbackCache.vocabQuestions;
        lRows = fallbackCache.listeningQuestions;
        sRows = fallbackCache.sentenceRounds;
        spRows = fallbackCache.speakingTurns;
        cbRows = fallbackCache.circuitBoards;
        trRows = fallbackCache.techRunnerQuestions;
      } else {
        if (vqRes.error) vRows = fallbackCache.vocabQuestions;
        if (lqRes.error) lRows = fallbackCache.listeningQuestions;
        if (srRes.error) sRows = fallbackCache.sentenceRounds;
        if (spRes.error || (spRows.length === 0 && !alreadySeeded)) {
          spRows = fallbackCache.speakingTurns;
        }
        if (cbRes.error || (cbRows.length === 0 && !alreadySeeded)) {
          cbRows = fallbackCache.circuitBoards;
        }
        if (trRes.error || (trRows.length === 0 && !alreadySeeded)) {
          trRows = fallbackCache.techRunnerQuestions;
          if (!trRes.error && trRows.length > 0) {
            await supabase
              .from("country_tech_runner_questions")
              .upsert(trRows, { onConflict: "id" });
          }
        }
      }

      // Target Smasher items: seed defaults once per country (own seeded key)
      const tsSeededKey = `wordwise_country_ts_seeded_${cid}_v1`;
      const tsSeeded =
        typeof window !== "undefined" &&
        Boolean(localStorage.getItem(tsSeededKey));
      if (tsRes.error) {
        tsRows = fallbackCache.targetSmasherItems;
      } else if (tsRows.length === 0 && !tsSeeded) {
        tsRows = fallbackCache.targetSmasherItems;
        if (typeof window !== "undefined") {
          localStorage.setItem(tsSeededKey, "1");
        }
        if (tsRows.length > 0) {
          await supabase
            .from("country_target_smasher_items")
            .upsert(tsRows, { onConflict: "id" });
        }
      }

      setVocabQuestions(vRows);
      setListeningQuestions(lRows);
      setSentenceRounds(sRows);
      setSpeakingTurns(spRows);
      setCircuitBoards(cbRows);
      setTechRunnerQuestions(trRows);
      setTargetSmasherItems(tsRows);
      setModuleConfig(mCfg);
      setCulturalBriefing(
        fallbackCache.culturalBriefing ||
          getDefaultCulturalBriefingForCountry(cid)
      );
      setSForm(emptySentenceRoundForm(sRows.length + 1));
      setCbForm(emptyCircuitBoardForm(cbRows.length + 1));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [cid]);

  async function persistAllSync(
    nextVocab: DbCountryVocabularyQuestion[],
    nextListen: DbCountryListeningQuestion[],
    nextSentences: DbCountrySentenceRound[],
    nextSpeaking: DbCountrySpeakingTurn[] = speakingTurns,
    nextModConfig: CountryModuleConfig = moduleConfig,
    nextCircuits: DbCountryCircuitBoard[] = circuitBoards,
    nextTechRunner: DbCountryTechRunnerQuestion[] = techRunnerQuestions,
    nextTargetSmasher: DbCountryTargetSmasherItem[] = targetSmasherItems,
    nextCultural: CountryCulturalBriefing = culturalBriefing
  ) {
    if (typeof window !== "undefined") {
      localStorage.setItem(`wordwise_country_studio_seeded_${cid}_v4`, "1");
    }
    await syncCountryMissionStagesData(cid, {
      vocabQuestions: nextVocab,
      listeningQuestions: nextListen,
      sentenceRounds: nextSentences,
      speakingTurns: nextSpeaking,
      circuitBoards: nextCircuits,
      techRunnerQuestions: nextTechRunner,
      targetSmasherItems: nextTargetSmasher,
      moduleConfig: nextModConfig,
      culturalBriefing: nextCultural,
    });
  }

  async function handleToggleModuleConfig(nextCfg: CountryModuleConfig) {
    setModuleConfig(nextCfg);
    await persistAllSync(
      vocabQuestions,
      listeningQuestions,
      sentenceRounds,
      speakingTurns,
      nextCfg
    );
    flash(`Updated active modules & games for ${country.name}.`);
  }

  function toggleGameInConfig(gameId: CountryGameType) {
    const exists = moduleConfig.enabledGames.includes(gameId);
    const nextGames = exists
      ? moduleConfig.enabledGames.filter((g) => g !== gameId)
      : [...moduleConfig.enabledGames, gameId];
    void handleToggleModuleConfig({
      ...moduleConfig,
      enabledGames: nextGames,
    });
  }

  /* ── Tab 1: Vocabulary Questions CRUD ── */
  function patchVocabOption(oi: number, val: string) {
    setVForm((prev) => {
      const nextOpts = [...prev.options] as [string, string, string, string];
      nextOpts[oi] = val;
      return { ...prev, options: nextOpts };
    });
  }

  async function handleSaveVocabQuestion(e: React.FormEvent) {
    e.preventDefault();
    const wordTrim = vForm.word.trim();
    const qText =
      vForm.questionText.trim() ||
      (wordTrim ? `"${wordTrim}" có nghĩa là gì?` : "");
    if (!qText) {
      return flash("Question text is required.", false);
    }
    const cleanOpts = vForm.options.map((o) => o.trim());
    if (cleanOpts.filter(Boolean).length < 2) {
      return flash("Please provide at least 2 answer options.", false);
    }

    setSaving(true);
    const supabase = createClient();
    const inferredWord =
      wordTrim || qText.match(/"([^"]+)"/)?.[1] || qText.slice(0, 24);
    const inferredMeaning =
      cleanOpts[vForm.correctIndex] || cleanOpts[0] || "";

    if (editingVocabId) {
      const updatedRow: DbCountryVocabularyQuestion = {
        id: editingVocabId,
        country_id: cid,
        word: inferredWord,
        meaning: inferredMeaning,
        question_text: qText,
        options: cleanOpts,
        correct_index: vForm.correctIndex,
        sort_order:
          vocabQuestions.find((x) => x.id === editingVocabId)?.sort_order || 1,
      };
      const nextList = vocabQuestions.map((x) =>
        x.id === editingVocabId ? updatedRow : x
      );
      setVocabQuestions(nextList);
      await supabase
        .from("country_vocabulary_questions")
        .upsert(updatedRow, { onConflict: "id" });
      await persistAllSync(nextList, listeningQuestions, sentenceRounds);
      flash("Vocabulary question updated.");
      setEditingVocabId(null);
      setVForm(emptyVocabQuestionForm());
    } else {
      const maxOrder = vocabQuestions.reduce(
        (m, r) => Math.max(m, r.sort_order || 0),
        0
      );
      const newRow: DbCountryVocabularyQuestion = {
        id: `cvq-${cid}-${slugify(inferredWord) || "q"}-${Date.now().toString(36)}`,
        country_id: cid,
        word: inferredWord,
        meaning: inferredMeaning,
        question_text: qText,
        options: cleanOpts,
        correct_index: vForm.correctIndex,
        sort_order: maxOrder + 1,
      };
      const nextList = [...vocabQuestions, newRow];
      setVocabQuestions(nextList);
      await supabase
        .from("country_vocabulary_questions")
        .upsert(newRow, { onConflict: "id" });
      await persistAllSync(nextList, listeningQuestions, sentenceRounds);
      flash("Vocabulary question added.");
      setVForm(emptyVocabQuestionForm());
    }
    setSaving(false);
  }

  function startEditVocabQuestion(r: DbCountryVocabularyQuestion) {
    setEditingVocabId(r.id);
    const opts = Array.isArray(r.options) ? r.options : [];
    setVForm({
      word: r.word || "",
      questionText: r.question_text,
      options: [opts[0] || "", opts[1] || "", opts[2] || "", opts[3] || ""],
      correctIndex: typeof r.correct_index === "number" ? r.correct_index : 0,
    });
  }

  async function handleDeleteVocabQuestion(r: DbCountryVocabularyQuestion) {
    if (!window.confirm(`Delete question "${r.question_text}"?`)) return;
    const nextList = vocabQuestions.filter((x) => x.id !== r.id);
    setVocabQuestions(nextList);
    await createClient()
      .from("country_vocabulary_questions")
      .delete()
      .eq("id", r.id);
    await persistAllSync(nextList, listeningQuestions, sentenceRounds);
    flash("Vocabulary question deleted.");
    if (editingVocabId === r.id) {
      setEditingVocabId(null);
      setVForm(emptyVocabQuestionForm());
    }
  }

  /* ── Tab 2: Listening Questions CRUD ── */
  function patchListeningOption(oi: number, val: string) {
    setLForm((prev) => {
      const nextOpts = [...prev.options] as [string, string, string, string];
      nextOpts[oi] = val;
      return { ...prev, options: nextOpts };
    });
  }

  async function handleSaveListeningQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!lForm.transcript.trim()) {
      return flash("Audio transcript sentence is required.", false);
    }
    if (!lForm.questionText.trim()) {
      return flash("Comprehension question text is required.", false);
    }
    const cleanOpts = lForm.options.map((o) => o.trim());
    if (cleanOpts.filter(Boolean).length < 2) {
      return flash("Please provide at least 2 answer options.", false);
    }

    setSaving(true);
    const supabase = createClient();

    if (editingListeningId) {
      const updatedRow: DbCountryListeningQuestion = {
        id: editingListeningId,
        country_id: cid,
        title: lForm.title.trim() || "Solar Grid Lab",
        transcript: lForm.transcript.trim(),
        question_text: lForm.questionText.trim(),
        options: cleanOpts,
        correct_index: lForm.correctIndex,
        sort_order:
          listeningQuestions.find((x) => x.id === editingListeningId)
            ?.sort_order || 1,
      };
      const nextList = listeningQuestions.map((x) =>
        x.id === editingListeningId ? updatedRow : x
      );
      setListeningQuestions(nextList);
      await supabase
        .from("country_listening_questions")
        .upsert(updatedRow, { onConflict: "id" });
      await persistAllSync(vocabQuestions, nextList, sentenceRounds);
      flash("Listening question updated.");
      setEditingListeningId(null);
      setLForm(emptyListeningQuestionForm());
    } else {
      const maxOrder = listeningQuestions.reduce(
        (m, r) => Math.max(m, r.sort_order || 0),
        0
      );
      const newRow: DbCountryListeningQuestion = {
        id: `clq-${cid}-${Date.now().toString(36)}`,
        country_id: cid,
        title: lForm.title.trim() || "Solar Grid Lab",
        transcript: lForm.transcript.trim(),
        question_text: lForm.questionText.trim(),
        options: cleanOpts,
        correct_index: lForm.correctIndex,
        sort_order: maxOrder + 1,
      };
      const nextList = [...listeningQuestions, newRow];
      setListeningQuestions(nextList);
      await supabase
        .from("country_listening_questions")
        .upsert(newRow, { onConflict: "id" });
      await persistAllSync(vocabQuestions, nextList, sentenceRounds);
      flash("Listening question added.");
      setLForm(emptyListeningQuestionForm());
    }
    setSaving(false);
  }

  function startEditListeningQuestion(r: DbCountryListeningQuestion) {
    setEditingListeningId(r.id);
    const opts = Array.isArray(r.options) ? r.options : [];
    setLForm({
      title: r.title || "Solar Grid Lab",
      transcript: r.transcript,
      questionText: r.question_text,
      options: [opts[0] || "", opts[1] || "", opts[2] || "", opts[3] || ""],
      correctIndex: typeof r.correct_index === "number" ? r.correct_index : 0,
    });
  }

  async function handleDeleteListeningQuestion(r: DbCountryListeningQuestion) {
    if (!window.confirm(`Delete listening item "${r.question_text}"?`)) return;
    const nextList = listeningQuestions.filter((x) => x.id !== r.id);
    setListeningQuestions(nextList);
    await createClient()
      .from("country_listening_questions")
      .delete()
      .eq("id", r.id);
    await persistAllSync(vocabQuestions, nextList, sentenceRounds);
    flash("Listening question deleted.");
    if (editingListeningId === r.id) {
      setEditingListeningId(null);
      setLForm(emptyListeningQuestionForm());
    }
  }

  /* ── Tab 3: Sentence Assembler Rounds CRUD ── */
  function handleAutoShuffleSentence() {
    if (!sForm.targetSentence.trim()) {
      return flash("Enter a target sentence first.", false);
    }
    const shuffled = shuffleTokens(sForm.targetSentence);
    setSForm((prev) => ({
      ...prev,
      wordChunksText: shuffled.join(", "),
    }));
  }

  async function handleSaveSentenceRound(e: React.FormEvent) {
    e.preventDefault();
    const target = sForm.targetSentence.trim();
    if (!target) {
      return flash("Target sentence is required.", false);
    }
    const chunks = parseWordChunks(sForm.wordChunksText, target);
    if (chunks.length < 2) {
      return flash("Target sentence must have at least 2 words.", false);
    }

    setSaving(true);
    const supabase = createClient();

    if (editingSentenceId) {
      const updatedRow: DbCountrySentenceRound = {
        id: editingSentenceId,
        country_id: cid,
        target_sentence: target,
        word_chunks: chunks,
        round_number: Math.max(1, sForm.roundNumber || 1),
        points: Math.max(5, sForm.points || 20),
        time_limit: Math.max(5, sForm.timeLimit || 20),
        sort_order: Math.max(1, sForm.roundNumber || 1),
      };
      const nextList = sentenceRounds
        .map((x) => (x.id === editingSentenceId ? updatedRow : x))
        .sort((a, b) => a.round_number - b.round_number);
      setSentenceRounds(nextList);
      await supabase
        .from("country_sentence_rounds")
        .upsert(updatedRow, { onConflict: "id" });
      await persistAllSync(vocabQuestions, listeningQuestions, nextList);
      flash(`Sentence Round #${updatedRow.round_number} updated.`);
      setEditingSentenceId(null);
      setSForm(emptySentenceRoundForm(nextList.length + 1));
    } else {
      const roundNum = Math.max(1, sForm.roundNumber || sentenceRounds.length + 1);
      const newRow: DbCountrySentenceRound = {
        id: `csr-${cid}-r${roundNum}-${Date.now().toString(36)}`,
        country_id: cid,
        target_sentence: target,
        word_chunks: chunks,
        round_number: roundNum,
        points: Math.max(5, sForm.points || 20),
        time_limit: Math.max(5, sForm.timeLimit || 20),
        sort_order: roundNum,
      };
      const nextList = [...sentenceRounds, newRow].sort(
        (a, b) => a.round_number - b.round_number
      );
      setSentenceRounds(nextList);
      await supabase
        .from("country_sentence_rounds")
        .upsert(newRow, { onConflict: "id" });
      await persistAllSync(vocabQuestions, listeningQuestions, nextList);
      flash(`Sentence Round #${roundNum} added.`);
      setSForm(emptySentenceRoundForm(nextList.length + 1));
    }
    setSaving(false);
  }

  function startEditSentenceRound(r: DbCountrySentenceRound) {
    setEditingSentenceId(r.id);
    setSForm({
      roundNumber: r.round_number,
      targetSentence: r.target_sentence,
      wordChunksText: Array.isArray(r.word_chunks)
        ? r.word_chunks.join(", ")
        : "",
      points: r.points || 20,
      timeLimit: r.time_limit || 20,
    });
  }

  async function handleDeleteSentenceRound(r: DbCountrySentenceRound) {
    if (
      !window.confirm(
        `Delete Round #${r.round_number} ("${r.target_sentence}")?`
      )
    ) {
      return;
    }
    const nextList = sentenceRounds
      .filter((x) => x.id !== r.id)
      .map((item, idx) => ({
        ...item,
        round_number: idx + 1,
        sort_order: idx + 1,
      }));
    setSentenceRounds(nextList);
    await createClient()
      .from("country_sentence_rounds")
      .delete()
      .eq("id", r.id);
    await persistAllSync(vocabQuestions, listeningQuestions, nextList);
    flash("Sentence round deleted.");
    if (editingSentenceId === r.id) {
      setEditingSentenceId(null);
      setSForm(emptySentenceRoundForm(nextList.length + 1));
    }
  }

  /* ── Tab 4: Speaking AI Dialogue Turns CRUD ── */
  async function handleSaveSpeakingTurn(e: React.FormEvent) {
    e.preventDefault();
    if (!spForm.npcPrompt.trim() || !spForm.targetLine.trim()) {
      return flash("Both NPC prompt and learner target line are required.", false);
    }

    setSaving(true);
    const supabase = createClient();

    if (editingSpeakingId) {
      const existing = speakingTurns.find((x) => x.id === editingSpeakingId);
      const updatedRow: DbCountrySpeakingTurn = {
        id: editingSpeakingId,
        country_id: cid,
        speaker_role: spForm.speakerRole.trim() || "GRID ENGINEER SAYS",
        npc_prompt: spForm.npcPrompt.trim(),
        target_line: spForm.targetLine.trim(),
        vietnamese_translation: spForm.vietnameseTranslation.trim(),
        coach_tip: spForm.coachTip.trim(),
        sort_order: existing?.sort_order || 1,
      };
      const nextList = speakingTurns.map((x) =>
        x.id === editingSpeakingId ? updatedRow : x
      );
      setSpeakingTurns(nextList);
      await supabase
        .from("country_speaking_turns")
        .upsert(updatedRow, { onConflict: "id" });
      await persistAllSync(
        vocabQuestions,
        listeningQuestions,
        sentenceRounds,
        nextList
      );
      flash("Speaking AI dialogue turn updated.");
      setEditingSpeakingId(null);
      setSpForm(emptySpeakingTurnForm());
    } else {
      const maxOrder = speakingTurns.reduce(
        (m, r) => Math.max(m, r.sort_order || 0),
        0
      );
      const newRow: DbCountrySpeakingTurn = {
        id: `cst-${cid}-${Date.now().toString(36)}`,
        country_id: cid,
        speaker_role: spForm.speakerRole.trim() || "GRID ENGINEER SAYS",
        npc_prompt: spForm.npcPrompt.trim(),
        target_line: spForm.targetLine.trim(),
        vietnamese_translation: spForm.vietnameseTranslation.trim(),
        coach_tip: spForm.coachTip.trim(),
        sort_order: maxOrder + 1,
      };
      const nextList = [...speakingTurns, newRow];
      setSpeakingTurns(nextList);
      await supabase
        .from("country_speaking_turns")
        .upsert(newRow, { onConflict: "id" });
      await persistAllSync(
        vocabQuestions,
        listeningQuestions,
        sentenceRounds,
        nextList
      );
      flash("Speaking AI dialogue turn added.");
      setSpForm(emptySpeakingTurnForm());
    }
    setSaving(false);
  }

  function startEditSpeakingTurn(r: DbCountrySpeakingTurn) {
    setEditingSpeakingId(r.id);
    setSpForm({
      speakerRole: r.speaker_role || "GRID ENGINEER SAYS",
      npcPrompt: r.npc_prompt,
      targetLine: r.target_line,
      vietnameseTranslation: r.vietnamese_translation || "",
      coachTip: r.coach_tip || "",
    });
  }

  async function handleMoveSpeakingTurn(index: number, dir: -1 | 1) {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= speakingTurns.length) return;
    const copy = [...speakingTurns];
    [copy[index], copy[targetIdx]] = [copy[targetIdx], copy[index]];
    const reordered = copy.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));
    setSpeakingTurns(reordered);
    await createClient()
      .from("country_speaking_turns")
      .upsert(reordered, { onConflict: "id" });
    await persistAllSync(
      vocabQuestions,
      listeningQuestions,
      sentenceRounds,
      reordered
    );
  }

  async function handleDeleteSpeakingTurn(r: DbCountrySpeakingTurn) {
    if (!window.confirm(`Delete dialogue turn "${r.target_line}"?`)) return;
    const nextList = speakingTurns
      .filter((x) => x.id !== r.id)
      .map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    setSpeakingTurns(nextList);
    await createClient()
      .from("country_speaking_turns")
      .delete()
      .eq("id", r.id);
    await persistAllSync(
      vocabQuestions,
      listeningQuestions,
      sentenceRounds,
      nextList
    );
    flash("Dialogue turn deleted.");
    if (editingSpeakingId === r.id) {
      setEditingSpeakingId(null);
      setSpForm(emptySpeakingTurnForm());
    }
  }

  /* ── Tab 5: Circuit Repair Boards CRUD ── */
  function patchCircuitPair(
    pairIdx: number,
    field: "clue" | "answer",
    val: string
  ) {
    setCbForm((prev) => {
      const nextPairs = prev.pairs.map((p, i) =>
        i === pairIdx ? { ...p, [field]: val } : p
      ) as [CircuitPair, CircuitPair, CircuitPair, CircuitPair];
      return { ...prev, pairs: nextPairs };
    });
  }

  async function handleSaveCircuitBoard(e: React.FormEvent) {
    e.preventDefault();
    const validPairs = cbForm.pairs
      .map((p) => ({ clue: p.clue.trim(), answer: p.answer.trim() }))
      .filter((p) => p.clue && p.answer);
    if (validPairs.length < 4) {
      return flash(
        "Please fill in all 4 Clue–Answer pairs for the Circuit Board.",
        false
      );
    }

    setSaving(true);
    const supabase = createClient();
    const boardNum = Math.max(1, cbForm.boardNumber || 1);

    if (editingCircuitId) {
      const updatedRow: DbCountryCircuitBoard = {
        id: editingCircuitId,
        country_id: cid,
        board_number: boardNum,
        topic: cbForm.topic.trim() || "Renewable Energy & Smart Grid",
        pairs: validPairs,
        points: Math.max(5, cbForm.points || 20),
        time_limit: Math.max(5, cbForm.timeLimit || 20),
        sort_order: boardNum,
      };
      const nextList = circuitBoards
        .map((x) => (x.id === editingCircuitId ? updatedRow : x))
        .sort((a, b) => a.board_number - b.board_number);
      setCircuitBoards(nextList);
      await supabase
        .from("country_circuit_boards")
        .upsert(updatedRow, { onConflict: "id" });
      await persistAllSync(
        vocabQuestions,
        listeningQuestions,
        sentenceRounds,
        speakingTurns,
        moduleConfig,
        nextList
      );
      flash(`Circuit Board #${boardNum} updated.`);
      setEditingCircuitId(null);
      setCbForm(emptyCircuitBoardForm(nextList.length + 1));
    } else {
      const newRow: DbCountryCircuitBoard = {
        id: `ccb-${cid}-b${boardNum}-${Date.now().toString(36)}`,
        country_id: cid,
        board_number: boardNum,
        topic: cbForm.topic.trim() || "Renewable Energy & Smart Grid",
        pairs: validPairs,
        points: Math.max(5, cbForm.points || 20),
        time_limit: Math.max(5, cbForm.timeLimit || 20),
        sort_order: boardNum,
      };
      const nextList = [...circuitBoards, newRow].sort(
        (a, b) => a.board_number - b.board_number
      );
      setCircuitBoards(nextList);
      await supabase
        .from("country_circuit_boards")
        .upsert(newRow, { onConflict: "id" });
      await persistAllSync(
        vocabQuestions,
        listeningQuestions,
        sentenceRounds,
        speakingTurns,
        moduleConfig,
        nextList
      );
      flash(`Circuit Board #${boardNum} added.`);
      setCbForm(emptyCircuitBoardForm(nextList.length + 1));
    }
    setSaving(false);
  }

  function startEditCircuitBoard(r: DbCountryCircuitBoard) {
    setEditingCircuitId(r.id);
    const p = Array.isArray(r.pairs) ? r.pairs : [];
    setCbForm({
      boardNumber: r.board_number || 1,
      topic: r.topic || "Renewable Energy & Smart Grid",
      points: r.points || 20,
      timeLimit: r.time_limit || 20,
      pairs: [
        p[0] || { clue: "", answer: "" },
        p[1] || { clue: "", answer: "" },
        p[2] || { clue: "", answer: "" },
        p[3] || { clue: "", answer: "" },
      ],
    });
  }

  async function handleDeleteCircuitBoard(r: DbCountryCircuitBoard) {
    if (
      !window.confirm(`Delete Circuit Board #${r.board_number} ("${r.topic}")?`)
    ) {
      return;
    }
    const nextList = circuitBoards
      .filter((x) => x.id !== r.id)
      .map((item, idx) => ({
        ...item,
        board_number: idx + 1,
        sort_order: idx + 1,
      }));
    setCircuitBoards(nextList);
    await createClient()
      .from("country_circuit_boards")
      .delete()
      .eq("id", r.id);
    await persistAllSync(
      vocabQuestions,
      listeningQuestions,
      sentenceRounds,
      speakingTurns,
      moduleConfig,
      nextList
    );
    flash("Circuit board deleted.");
    if (editingCircuitId === r.id) {
      setEditingCircuitId(null);
      setCbForm(emptyCircuitBoardForm(nextList.length + 1));
    }
  }

  /* ── Tab 6: Tech Runner Questions CRUD ────────────────────────────────── */
  function patchTechRunnerOption(idx: 0 | 1 | 2, val: string) {
    setTrForm((prev) => {
      const next = [...prev.options] as [string, string, string];
      next[idx] = val;
      return { ...prev, options: next };
    });
  }

  async function handleSaveTechRunnerQuestion(e: React.FormEvent) {
    e.preventDefault();
    const promptText = trForm.prompt.trim();
    const opts = trForm.options.map((o) => o.trim()) as [
      string,
      string,
      string,
    ];
    if (!promptText || opts.some((o) => !o)) {
      flash(
        "Tech Runner question requires a prompt and all 3 lane options (LEFT, CENTER, RIGHT).",
        false
      );
      return;
    }

    setSaving(true);
    const id =
      editingTechRunnerId ||
      `${cid}-tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const existingIdx = techRunnerQuestions.findIndex((x) => x.id === id);
    const sortOrder =
      existingIdx >= 0 ? existingIdx + 1 : techRunnerQuestions.length + 1;

    const row: DbCountryTechRunnerQuestion = {
      id,
      country_id: cid,
      tier: trForm.tier,
      prompt: promptText,
      options: opts,
      correct_index: trForm.correctIndex,
      sort_order: sortOrder,
    };

    const nextList =
      existingIdx >= 0
        ? techRunnerQuestions.map((x) => (x.id === id ? row : x))
        : [...techRunnerQuestions, row];

    setTechRunnerQuestions(nextList);

    const supabase = createClient();
    await supabase
      .from("country_tech_runner_questions")
      .upsert(row, { onConflict: "id" });
    await persistAllSync(
      vocabQuestions,
      listeningQuestions,
      sentenceRounds,
      speakingTurns,
      moduleConfig,
      circuitBoards,
      nextList
    );

    setSaving(false);
    setEditingTechRunnerId(null);
    setTrForm(emptyTechRunnerQuestionForm(trForm.tier));
    flash(
      editingTechRunnerId
        ? `Updated Tech Runner question (Tier ${row.tier}).`
        : `Added Tech Runner question (Tier ${row.tier}).`
    );
  }

  function startEditTechRunnerQuestion(q: DbCountryTechRunnerQuestion) {
    setEditingTechRunnerId(q.id);
    const opts = Array.isArray(q.options) ? q.options : ["", "", ""];
    setTrForm({
      tier: (q.tier === 1 || q.tier === 2 || q.tier === 3 ? q.tier : 1) as
        | 1
        | 2
        | 3,
      prompt: q.prompt || "",
      options: [opts[0] || "", opts[1] || "", opts[2] || ""],
      correctIndex: (q.correct_index === 0 ||
      q.correct_index === 1 ||
      q.correct_index === 2
        ? q.correct_index
        : 0) as 0 | 1 | 2,
    });
  }

  async function handleDeleteTechRunnerQuestion(
    q: DbCountryTechRunnerQuestion
  ) {
    if (
      !window.confirm(
        `Delete Tech Runner Tier ${q.tier} question ("${q.prompt}")?`
      )
    ) {
      return;
    }
    const nextList = techRunnerQuestions
      .filter((x) => x.id !== q.id)
      .map((item, idx) => ({
        ...item,
        sort_order: idx + 1,
      }));
    setTechRunnerQuestions(nextList);
    await createClient()
      .from("country_tech_runner_questions")
      .delete()
      .eq("id", q.id);
    await persistAllSync(
      vocabQuestions,
      listeningQuestions,
      sentenceRounds,
      speakingTurns,
      moduleConfig,
      circuitBoards,
      nextList
    );
    flash("Tech Runner question deleted.");
    if (editingTechRunnerId === q.id) {
      setEditingTechRunnerId(null);
      setTrForm(emptyTechRunnerQuestionForm(1));
    }
  }

  /* ── Tab 7: Target Smasher Items CRUD ─────────────────────────────────── */
  function patchTargetDistractor(idx: 0 | 1 | 2, val: string) {
    setTsForm((prev) => {
      const next = [...prev.distractors] as [string, string, string];
      next[idx] = val;
      return { ...prev, distractors: next };
    });
  }

  async function handleSaveTargetSmasherItem(e: React.FormEvent) {
    e.preventDefault();
    const prompt = tsForm.prompt.trim();
    const correctWord = tsForm.correctWord.trim();
    const distractors = tsForm.distractors.map((d) => d.trim()) as [
      string,
      string,
      string,
    ];
    if (!prompt || !correctWord || distractors.some((d) => !d)) {
      flash(
        "Target Smasher item requires a concept prompt, the correct word, and 3 distractor words.",
        false
      );
      return;
    }

    setSaving(true);
    const id =
      editingTargetSmasherId ||
      `${cid}-ts-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const existingIdx = targetSmasherItems.findIndex((x) => x.id === id);
    const row: DbCountryTargetSmasherItem = {
      id,
      country_id: cid,
      tier: tsForm.tier,
      icon: tsForm.icon.trim() || "🎯",
      prompt,
      correct_word: correctWord,
      distractors,
      sort_order:
        existingIdx >= 0 ? existingIdx + 1 : targetSmasherItems.length + 1,
    };
    const nextList =
      existingIdx >= 0
        ? targetSmasherItems.map((x) => (x.id === id ? row : x))
        : [...targetSmasherItems, row];

    setTargetSmasherItems(nextList);
    await createClient()
      .from("country_target_smasher_items")
      .upsert(row, { onConflict: "id" });
    await persistAllSync(
      vocabQuestions,
      listeningQuestions,
      sentenceRounds,
      speakingTurns,
      moduleConfig,
      circuitBoards,
      techRunnerQuestions,
      nextList
    );

    setSaving(false);
    setEditingTargetSmasherId(null);
    setTsForm(emptyTargetSmasherForm(tsForm.tier));
    flash(
      editingTargetSmasherId
        ? `Updated Target Smasher item (Tier ${row.tier}).`
        : `Added Target Smasher item (Tier ${row.tier}).`
    );
  }

  function startEditTargetSmasherItem(it: DbCountryTargetSmasherItem) {
    setEditingTargetSmasherId(it.id);
    const d = Array.isArray(it.distractors) ? it.distractors : ["", "", ""];
    setTsForm({
      tier: (it.tier === 1 || it.tier === 2 || it.tier === 3
        ? it.tier
        : 1) as 1 | 2 | 3,
      icon: it.icon || "🎯",
      prompt: it.prompt || "",
      correctWord: it.correct_word || "",
      distractors: [d[0] || "", d[1] || "", d[2] || ""],
    });
  }

  async function handleDeleteTargetSmasherItem(
    it: DbCountryTargetSmasherItem
  ) {
    if (
      !window.confirm(
        `Delete Target Smasher item "${it.correct_word}" (Tier ${it.tier})?`
      )
    ) {
      return;
    }
    const nextList = targetSmasherItems
      .filter((x) => x.id !== it.id)
      .map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    setTargetSmasherItems(nextList);
    await createClient()
      .from("country_target_smasher_items")
      .delete()
      .eq("id", it.id);
    await persistAllSync(
      vocabQuestions,
      listeningQuestions,
      sentenceRounds,
      speakingTurns,
      moduleConfig,
      circuitBoards,
      techRunnerQuestions,
      nextList
    );
    flash("Target Smasher item deleted.");
    if (editingTargetSmasherId === it.id) {
      setEditingTargetSmasherId(null);
      setTsForm(emptyTargetSmasherForm(1));
    }
  }

  const subTabs: { id: CountrySubTab; label: string }[] = [
    {
      id: "vocab",
      label: `📝 Vocabulary Questions (${vocabQuestions.length})`,
    },
    {
      id: "listening",
      label: `🎧 Listening Questions (${listeningQuestions.length})`,
    },
    {
      id: "sentence",
      label: `🧩 Sentence Assembler Rounds (${sentenceRounds.length})`,
    },
    {
      id: "circuit",
      label: `🔌 Circuit Repair Boards (${circuitBoards.length})`,
    },
    {
      id: "tech_runner",
      label: `🏃 Tech Runner Questions (${techRunnerQuestions.length})`,
    },
    {
      id: "target_smasher",
      label: `🎯 Target Smasher Items (${targetSmasherItems.length})`,
    },
    {
      id: "speaking",
      label: `🤖 Speaking AI Dialogue (${speakingTurns.length})`,
    },
    {
      id: "cultural",
      label: `🧭 Cultural Guide`,
    },
  ];

  return (
    <section className={`${cardCls} flex flex-col gap-5`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <span aria-hidden="true">{country.flag}</span>
            <span>⚙️ Edit Country Content — {country.name}</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure active modules/games and manage Vocabulary, Listening, Sentence Assembler, and Speaking AI content for {country.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          ← Back to Countries
        </button>
      </div>

      {/* ── Per-Country Module & Game Toggles (ON/OFF) ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-orange-200/90 bg-orange-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-900">
            ⚙️ Enabled Modules &amp; Mini-Games for {country.name}
          </h3>
          <span className="text-[11px] font-medium text-slate-500">
            Only modules &amp; games toggled ON appear in the learner&apos;s Country Hub.
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              key: "vocabularyEnabled" as const,
              label: "📖 Vocabulary Module",
              active: moduleConfig.vocabularyEnabled,
            },
            {
              key: "listeningEnabled" as const,
              label: "🎧 Listening Practice",
              active: moduleConfig.listeningEnabled,
            },
            {
              key: "speakingEnabled" as const,
              label: "🤖 Speaking AI (Optional)",
              active: moduleConfig.speakingEnabled,
            },
          ].map((mod) => (
            <button
              key={mod.key}
              type="button"
              role="switch"
              aria-checked={mod.active}
              onClick={() =>
                handleToggleModuleConfig({
                  ...moduleConfig,
                  [mod.key]: !mod.active,
                })
              }
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                mod.active
                  ? "border-orange-300 bg-white text-slate-900 shadow-2xs"
                  : "border-slate-200 bg-slate-100/70 text-slate-500"
              }`}
            >
              <span>{mod.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  mod.active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {mod.active ? "ON" : "OFF"}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Mini-Games:
          </span>
          {COUNTRY_GAME_OPTIONS.map((g) => {
            const isOn = moduleConfig.enabledGames.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                role="switch"
                aria-checked={isOn}
                onClick={() => toggleGameInConfig(g.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isOn
                    ? "border-orange-400 bg-orange-500 text-white shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-orange-50"
                }`}
              >
                <span aria-hidden="true">{g.icon}</span>
                <span>{g.label}</span>
                <span
                  className={`ml-1 rounded-full px-1.5 py-px text-[9px] font-extrabold uppercase ${
                    isOn
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isOn ? "ON" : "OFF"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Country stage editors"
      >
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={subTab === t.id}
            onClick={() => setSubTab(t.id)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold cursor-pointer ${
              subTab === t.id
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-slate-500">Loading country stage items…</p>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: VOCABULARY QUESTIONS
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && subTab === "vocab" && (
        <div className="flex flex-col gap-5">
          {vocabQuestions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4 text-sm text-slate-600">
              No vocabulary questions configured for {country.name} yet. Use the form below to add your first question.
            </p>
          ) : (
            <ul className="divide-y divide-orange-100 rounded-xl border border-orange-100 bg-white">
              {vocabQuestions.map((q, idx) => (
                <li
                  key={q.id}
                  className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-800">
                        Q#{idx + 1}
                      </span>
                      {q.word && (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                          Word: {q.word}
                        </span>
                      )}
                      <span className="text-sm font-extrabold text-slate-900">
                        {q.question_text}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(q.options) ? q.options : []).map(
                        (opt, oi) => {
                          const isCorrect = oi === q.correct_index;
                          return (
                            <span
                              key={oi}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
                                isCorrect
                                  ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-800"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              <strong>{"ABCD"[oi]}:</strong> {opt}
                              {isCorrect && <span aria-hidden="true">✓</span>}
                            </span>
                          );
                        }
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditVocabQuestion(q)}
                      className="rounded-lg border border-orange-200 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVocabQuestion(q)}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleSaveVocabQuestion}
            className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/30 p-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              {editingVocabId
                ? "✏️ Edit Vocabulary Question"
                : "+ Add Question"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Target Word (optional)</label>
                <input
                  className={inputCls}
                  placeholder="e.g. photovoltaic"
                  value={vForm.word}
                  onChange={(e) => {
                    const nextWord = e.target.value;
                    setVForm((prev) => ({
                      ...prev,
                      word: nextWord,
                      questionText:
                        !prev.questionText ||
                        prev.questionText === `"${prev.word}" có nghĩa là gì?`
                          ? nextWord
                            ? `"${nextWord}" có nghĩa là gì?`
                            : ""
                          : prev.questionText,
                    }));
                  }}
                />
              </div>
              <div>
                <label className={labelCls}>Question Text *</label>
                <input
                  className={inputCls}
                  placeholder='e.g. "photovoltaic" có nghĩa là gì?'
                  value={vForm.questionText}
                  onChange={(e) =>
                    setVForm({ ...vForm, questionText: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>
                4 Answer Options (select the radio button for the correct answer)
              </label>
              {vForm.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="vocab-correct-index"
                    checked={vForm.correctIndex === oi}
                    onChange={() => setVForm({ ...vForm, correctIndex: oi })}
                    className="h-4 w-4 accent-orange-500"
                    aria-label={`Mark option ${"ABCD"[oi]} as correct`}
                  />
                  <span className="w-5 text-sm font-extrabold text-slate-700">
                    {"ABCD"[oi]}
                  </span>
                  <input
                    className={inputCls}
                    placeholder={`Option ${"ABCD"[oi]}`}
                    value={opt}
                    onChange={(e) => patchVocabOption(oi, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving
                  ? "Saving..."
                  : editingVocabId
                    ? "Save Question Changes"
                    : "+ Add Question"}
              </button>
              {editingVocabId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVocabId(null);
                    setVForm(emptyVocabQuestionForm());
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: LISTENING QUESTIONS
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && subTab === "listening" && (
        <div className="flex flex-col gap-5">
          {listeningQuestions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4 text-sm text-slate-600">
              No listening questions configured for {country.name} yet. Add a listening track and question below.
            </p>
          ) : (
            <ul className="divide-y divide-orange-100 rounded-xl border border-orange-100 bg-white">
              {listeningQuestions.map((q, idx) => (
                <li
                  key={q.id}
                  className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-800">
                        Track #{idx + 1}
                      </span>
                      <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-900">
                        {q.title || "Solar Grid Lab"}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {q.question_text}
                      </span>
                    </div>
                    <p className="mb-2 text-xs italic text-slate-600">
                      🔊 &ldquo;{q.transcript}&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(q.options) ? q.options : []).map(
                        (opt, oi) => {
                          const isCorrect = oi === q.correct_index;
                          return (
                            <span
                              key={oi}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${
                                isCorrect
                                  ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-800"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              <strong>{"ABCD"[oi]}:</strong> {opt}
                              {isCorrect && <span aria-hidden="true">✓</span>}
                            </span>
                          );
                        }
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditListeningQuestion(q)}
                      className="rounded-lg border border-orange-200 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteListeningQuestion(q)}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleSaveListeningQuestion}
            className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/30 p-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              {editingListeningId
                ? "✏️ Edit Listening Question"
                : "+ Add Listening Question"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Scenario / Title *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Solar Grid Lab"
                  value={lForm.title}
                  onChange={(e) =>
                    setLForm({ ...lForm, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Comprehension Question *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Hệ thống tấm pin quang điện thực hiện chức năng gì?"
                  value={lForm.questionText}
                  onChange={(e) =>
                    setLForm({ ...lForm, questionText: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Audio Transcript / Spoken Sentence (TTS) *
              </label>
              <textarea
                className={inputCls}
                rows={2}
                placeholder="e.g. Our photovoltaic panels convert sunlight directly into clean electricity."
                value={lForm.transcript}
                onChange={(e) =>
                  setLForm({ ...lForm, transcript: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>
                4 Answer Options (select the radio button for the correct answer)
              </label>
              {lForm.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="listening-correct-index"
                    checked={lForm.correctIndex === oi}
                    onChange={() => setLForm({ ...lForm, correctIndex: oi })}
                    className="h-4 w-4 accent-orange-500"
                    aria-label={`Mark option ${"ABCD"[oi]} as correct`}
                  />
                  <span className="w-5 text-sm font-extrabold text-slate-700">
                    {"ABCD"[oi]}
                  </span>
                  <input
                    className={inputCls}
                    placeholder={`Option ${"ABCD"[oi]}`}
                    value={opt}
                    onChange={(e) => patchListeningOption(oi, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving
                  ? "Saving..."
                  : editingListeningId
                    ? "Save Listening Question"
                    : "+ Add Listening Question"}
              </button>
              {editingListeningId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingListeningId(null);
                    setLForm(emptyListeningQuestionForm());
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: SENTENCE ASSEMBLER ROUNDS
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && subTab === "sentence" && (
        <div className="flex flex-col gap-5">
          {sentenceRounds.length === 0 ? (
            <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4 text-sm text-slate-600">
              No Sentence Assembler rounds configured for {country.name} yet. Add your first round below.
            </p>
          ) : (
            <ul className="divide-y divide-orange-100 rounded-xl border border-orange-100 bg-white">
              {sentenceRounds.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-800">
                        Round #{r.round_number}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        ⭐ {r.points} pts • ⏱️ {r.time_limit}s
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {r.target_sentence}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(r.word_chunks) ? r.word_chunks : []).map(
                        (chunk, ci) => (
                          <span
                            key={ci}
                            className="rounded-lg border border-orange-200 bg-orange-50/70 px-2 py-0.5 text-xs font-bold text-orange-900"
                          >
                            {chunk}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditSentenceRound(r)}
                      className="rounded-lg border border-orange-200 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSentenceRound(r)}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleSaveSentenceRound}
            className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/30 p-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              {editingSentenceId
                ? `✏️ Edit Sentence Round #${sForm.roundNumber}`
                : "+ Add Sentence Round"}
            </h3>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Round Number</label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={sForm.roundNumber}
                  onChange={(e) =>
                    setSForm({
                      ...sForm,
                      roundNumber: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Points</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  className={inputCls}
                  value={sForm.points}
                  onChange={(e) =>
                    setSForm({
                      ...sForm,
                      points: Number(e.target.value) || 20,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Time Limit (seconds)</label>
                <input
                  type="number"
                  min={5}
                  className={inputCls}
                  value={sForm.timeLimit}
                  onChange={(e) =>
                    setSForm({
                      ...sForm,
                      timeLimit: Number(e.target.value) || 20,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Target Sentence (no trailing punctuation) *
              </label>
              <input
                className={inputCls}
                placeholder="e.g. Solar panels convert sunlight into electricity"
                value={sForm.targetSentence}
                onChange={(e) =>
                  setSForm({ ...sForm, targetSentence: e.target.value })
                }
              />
            </div>

            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className={labelCls}>
                  Shuffled Word Chunks (comma-separated, or leave blank to auto-shuffle)
                </label>
                <button
                  type="button"
                  onClick={handleAutoShuffleSentence}
                  className="rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-xs font-extrabold text-orange-700 hover:bg-orange-50 cursor-pointer"
                >
                  🔀 Auto-Shuffle from Target Sentence
                </button>
              </div>
              <input
                className={inputCls}
                placeholder="e.g. sunlight, Solar, electricity, convert, panels, into"
                value={sForm.wordChunksText}
                onChange={(e) =>
                  setSForm({ ...sForm, wordChunksText: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving
                  ? "Saving..."
                  : editingSentenceId
                    ? "Save Round Changes"
                    : "+ Add Sentence Round"}
              </button>
              {editingSentenceId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSentenceId(null);
                    setSForm(emptySentenceRoundForm(sentenceRounds.length + 1));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3.5: CIRCUIT REPAIR BOARDS (4 CLUE-ANSWER PAIRS PER BOARD)
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && subTab === "circuit" && (
        <div className="flex flex-col gap-5">
          {circuitBoards.length === 0 ? (
            <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4 text-sm text-slate-600">
              No Circuit Repair boards configured for {country.name} yet. Add a 4-pair circuit board below.
            </p>
          ) : (
            <ul className="divide-y divide-orange-100 rounded-xl border border-orange-100 bg-white">
              {circuitBoards.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-800">
                        Board #{b.board_number}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        ⚡ {b.points} pts • ⏱️ {b.time_limit}s
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {b.topic}
                      </span>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {(Array.isArray(b.pairs) ? b.pairs : []).map(
                        (pair, pi) => (
                          <span
                            key={pi}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200/80 bg-orange-50/50 px-2.5 py-1 text-xs font-semibold text-slate-800"
                          >
                            <strong className="text-orange-900">
                              {pair.clue}
                            </strong>
                            <span className="text-orange-400">⟷</span>
                            <span className="text-emerald-800">
                              {pair.answer}
                            </span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditCircuitBoard(b)}
                      className="rounded-lg border border-orange-200 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCircuitBoard(b)}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleSaveCircuitBoard}
            className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/30 p-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              {editingCircuitId
                ? `✏️ Edit Circuit Board #${cbForm.boardNumber}`
                : "+ Add Circuit Board (4 Clue–Answer Pairs)"}
            </h3>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className={labelCls}>Board Number (1–10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className={inputCls}
                  value={cbForm.boardNumber}
                  onChange={(e) => {
                    const num = Number(e.target.value) || 1;
                    const defs = getCircuitDefaultsForBoard(num);
                    setCbForm({
                      ...cbForm,
                      boardNumber: num,
                      points: defs.points,
                      timeLimit: defs.timeLimit,
                    });
                  }}
                />
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Topic Label *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Solar Photovoltaic Foundations"
                  value={cbForm.topic}
                  onChange={(e) =>
                    setCbForm({ ...cbForm, topic: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Points (+5 Perfect Bonus)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  className={inputCls}
                  value={cbForm.points}
                  onChange={(e) =>
                    setCbForm({
                      ...cbForm,
                      points: Number(e.target.value) || 20,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Time Limit (seconds)</label>
                <input
                  type="number"
                  min={5}
                  className={inputCls}
                  value={cbForm.timeLimit}
                  onChange={(e) =>
                    setCbForm({
                      ...cbForm,
                      timeLimit: Number(e.target.value) || 20,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>
                4 Circuit Connections (Left Clue Chip ⟷ Right Answer Node) *
              </label>
              {cbForm.pairs.map((pair, pi) => (
                <div
                  key={pi}
                  className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]"
                >
                  <input
                    className={inputCls}
                    placeholder={`Left Clue #${pi + 1} (term or sentence start)`}
                    value={pair.clue}
                    onChange={(e) =>
                      patchCircuitPair(pi, "clue", e.target.value)
                    }
                  />
                  <span className="text-center text-sm font-extrabold text-orange-500">
                    ⟷
                  </span>
                  <input
                    className={inputCls}
                    placeholder={`Right Answer #${pi + 1} (meaning or completion)`}
                    value={pair.answer}
                    onChange={(e) =>
                      patchCircuitPair(pi, "answer", e.target.value)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving
                  ? "Saving..."
                  : editingCircuitId
                    ? "Save Board Changes"
                    : "+ Add Circuit Board"}
              </button>
              {editingCircuitId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCircuitId(null);
                    setCbForm(emptyCircuitBoardForm(circuitBoards.length + 1));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 6: TECH RUNNER QUESTIONS (TIER 1 / TIER 2 / TIER 3)
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && subTab === "tech_runner" && (
        <div className="flex flex-col gap-5">
          {techRunnerQuestions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4 text-sm text-slate-600">
              No Tech Runner questions configured for {country.name} yet. Add your first 3-lane gate question below.
            </p>
          ) : (
            <ul className="divide-y divide-orange-100 rounded-xl border border-orange-100 bg-white">
              {techRunnerQuestions.map((q, idx) => {
                const laneNames = ["LEFT", "CENTER", "RIGHT"] as const;
                const tierBadgeCls =
                  q.tier === 1
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : q.tier === 2
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-rose-200 bg-rose-50 text-rose-800";
                return (
                  <li
                    key={q.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-800">
                          #{idx + 1}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-xs font-extrabold ${tierBadgeCls}`}
                        >
                          Tier {q.tier}{" "}
                          {q.tier === 1
                            ? "(60s–41s · Basic)"
                            : q.tier === 2
                              ? "(40s–21s · Intermediate)"
                              : "(20s–1s · Advanced)"}
                        </span>
                      </div>
                      <p className="mb-2 text-sm font-extrabold text-slate-900">
                        {q.prompt}
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-3">
                        {(q.options || ["", "", ""]).map((opt, oi) => {
                          const isCorrect = oi === q.correct_index;
                          return (
                            <div
                              key={oi}
                              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                                isCorrect
                                  ? "border-emerald-300 bg-emerald-50 font-extrabold text-emerald-900"
                                  : "border-slate-200 bg-slate-50 font-semibold text-slate-600"
                              }`}
                            >
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                [{laneNames[oi]}]
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && (
                                <span className="text-emerald-600">✓</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditTechRunnerQuestion(q)}
                        className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTechRunnerQuestion(q)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            onSubmit={handleSaveTechRunnerQuestion}
            className="flex flex-col gap-3 rounded-xl border border-orange-200/80 bg-orange-50/40 p-4"
          >
            <h3 className="text-sm font-extrabold text-slate-800">
              {editingTechRunnerId
                ? "✏️ Edit Tech Runner Gate Question"
                : "+ Add Tech Runner Gate Question"}
            </h3>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className={labelCls}>Difficulty Tier *</label>
                <select
                  className={inputCls}
                  value={trForm.tier}
                  onChange={(e) =>
                    setTrForm({
                      ...trForm,
                      tier: Number(e.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  <option value={1}>Tier 1 (First 20s · Simple)</option>
                  <option value={2}>Tier 2 (Middle 20s · Compound)</option>
                  <option value={3}>Tier 3 (Final 20s · Clause/STEM)</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className={labelCls}>
                  Clue / Sentence Prompt (use _____ for fill-in-the-blank) *
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. Solar panels convert _____ directly into clean electricity."
                  value={trForm.prompt}
                  onChange={(e) =>
                    setTrForm({ ...trForm, prompt: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(["LEFT", "CENTER", "RIGHT"] as const).map((laneLabel, idx) => {
                const laneIdx = idx as 0 | 1 | 2;
                const isCorrect = trForm.correctIndex === laneIdx;
                return (
                  <div
                    key={laneLabel}
                    className={`flex flex-col gap-1.5 rounded-xl border p-3 ${
                      isCorrect
                        ? "border-emerald-400 bg-emerald-50/70"
                        : "border-orange-200/80 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        [{laneLabel}] Gate Option *
                      </label>
                      <label className="flex items-center gap-1 text-xs font-bold text-emerald-700 cursor-pointer">
                        <input
                          type="radio"
                          name="trCorrectLane"
                          checked={isCorrect}
                          onChange={() =>
                            setTrForm({ ...trForm, correctIndex: laneIdx })
                          }
                        />
                        Correct Gate
                      </label>
                    </div>
                    <input
                      className={inputCls}
                      placeholder={`Option for ${laneLabel} lane`}
                      value={trForm.options[laneIdx]}
                      onChange={(e) =>
                        patchTechRunnerOption(laneIdx, e.target.value)
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving
                  ? "Saving..."
                  : editingTechRunnerId
                    ? "Save Question Changes"
                    : "+ Add Tech Runner Question"}
              </button>
              {editingTechRunnerId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTechRunnerId(null);
                    setTrForm(emptyTechRunnerQuestionForm(1));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 7: TARGET SMASHER ITEMS (TIER 1 / TIER 2 / TIER 3)
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && subTab === "target_smasher" && (
        <div className="flex flex-col gap-5">
          {targetSmasherItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4 text-sm text-slate-600">
              No Target Smasher items configured for {country.name} yet. Add your first target concept below.
            </p>
          ) : (
            <ul className="divide-y divide-orange-100 rounded-xl border border-orange-100 bg-white">
              {targetSmasherItems.map((it, idx) => {
                const tierBadgeCls =
                  it.tier === 1
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : it.tier === 2
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-rose-200 bg-rose-50 text-rose-800";
                return (
                  <li
                    key={it.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="text-3xl" aria-hidden="true">
                        {it.icon || "🎯"}
                      </span>
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-800">
                            #{idx + 1}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-extrabold ${tierBadgeCls}`}
                          >
                            Tier {it.tier}{" "}
                            {it.tier === 1
                              ? "(0–20s · 3 slow targets)"
                              : it.tier === 2
                                ? "(20–40s · 4 moving)"
                                : "(40–60s · 4 fast)"}
                          </span>
                        </div>
                        <p className="mb-1.5 text-sm font-extrabold text-slate-900">
                          {it.prompt}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-900">
                            ✓ {it.correct_word}
                          </span>
                          {(it.distractors || []).map((d, di) => (
                            <span
                              key={di}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditTargetSmasherItem(it)}
                        className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-100 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTargetSmasherItem(it)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            onSubmit={handleSaveTargetSmasherItem}
            className="flex flex-col gap-3 rounded-xl border border-orange-200/80 bg-orange-50/40 p-4"
          >
            <h3 className="text-sm font-extrabold text-slate-800">
              {editingTargetSmasherId
                ? "✏️ Edit Target Smasher Item"
                : "+ Add Target Smasher Item"}
            </h3>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className={labelCls}>Difficulty Tier *</label>
                <select
                  className={inputCls}
                  value={tsForm.tier}
                  onChange={(e) =>
                    setTsForm({
                      ...tsForm,
                      tier: Number(e.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  <option value={1}>Tier 1 (0–20s · slow)</option>
                  <option value={2}>Tier 2 (20–40s · moving)</option>
                  <option value={3}>Tier 3 (40–60s · fast)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Target Icon / Emoji *</label>
                <input
                  className={inputCls}
                  placeholder="☀️"
                  maxLength={8}
                  value={tsForm.icon}
                  onChange={(e) =>
                    setTsForm({ ...tsForm, icon: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Concept / Prompt Label *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Device that converts sunlight into electricity"
                  value={tsForm.prompt}
                  onChange={(e) =>
                    setTsForm({ ...tsForm, prompt: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3">
                <label className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  ✓ Correct Word *
                </label>
                <input
                  className={inputCls}
                  placeholder="solar panel"
                  value={tsForm.correctWord}
                  onChange={(e) =>
                    setTsForm({ ...tsForm, correctWord: e.target.value })
                  }
                />
              </div>
              {([0, 1, 2] as const).map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-orange-200/80 bg-white p-3"
                >
                  <label className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Distractor {i + 1} *
                  </label>
                  <input
                    className={inputCls}
                    placeholder={`Wrong word ${i + 1}`}
                    value={tsForm.distractors[i]}
                    onChange={(e) => patchTargetDistractor(i, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving
                  ? "Saving..."
                  : editingTargetSmasherId
                    ? "Save Item Changes"
                    : "+ Add Target Smasher Item"}
              </button>
              {editingTargetSmasherId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTargetSmasherId(null);
                    setTsForm(emptyTargetSmasherForm(1));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 8: CULTURAL GUIDE & ETIQUETTE EDITOR
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && subTab === "cultural" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const cleaned: CountryCulturalBriefing = {
              communicationStyle:
                culturalBriefing.communicationStyle.trim() ||
                getDefaultCulturalBriefingForCountry(cid).communicationStyle,
              keyLocalPhrases: culturalBriefing.keyLocalPhrases
                .map((p) => ({
                  phrase: p.phrase.trim(),
                  vietnameseMeaning: p.vietnameseMeaning.trim(),
                }))
                .filter((p) => p.phrase),
              culturalTip:
                culturalBriefing.culturalTip.trim() ||
                getDefaultCulturalBriefingForCountry(cid).culturalTip,
            };
            setSaving(true);
            setCulturalBriefing(cleaned);
            await persistAllSync(
              vocabQuestions,
              listeningQuestions,
              sentenceRounds,
              speakingTurns,
              moduleConfig,
              circuitBoards,
              techRunnerQuestions,
              targetSmasherItems,
              cleaned
            );
            setSaving(false);
            flash(`Saved Cultural Briefing & Etiquette for ${country.name}.`);
          }}
          className="flex flex-col gap-4 rounded-2xl border border-orange-200/80 bg-orange-50/40 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                🧭 Cultural Briefing &amp; Etiquette — {country.name}
              </h3>
              <p className="text-xs text-slate-500">
                Displayed in the collapsible Cultural Briefing banner at the top of /mission/{cid}.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setCulturalBriefing(getDefaultCulturalBriefingForCountry(cid))
              }
              className="rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
            >
              ↺ Restore Default Guide
            </button>
          </div>

          <div>
            <label className={labelCls}>
              💬 Communication Style (1–2 sentences on local etiquette) *
            </label>
            <textarea
              className={inputCls}
              rows={2}
              placeholder="e.g. Americans use warm, direct, and friendly small talk..."
              value={culturalBriefing.communicationStyle}
              onChange={(e) =>
                setCulturalBriefing((prev) => ({
                  ...prev,
                  communicationStyle: e.target.value,
                }))
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className={labelCls}>
                🗣️ Key Local Phrases (English Expression + Vietnamese Meaning) *
              </label>
              <button
                type="button"
                onClick={() =>
                  setCulturalBriefing((prev) => ({
                    ...prev,
                    keyLocalPhrases: [
                      ...prev.keyLocalPhrases,
                      { phrase: "", vietnameseMeaning: "" },
                    ],
                  }))
                }
                className="rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-xs font-extrabold text-orange-700 hover:bg-orange-50 cursor-pointer"
              >
                + Add Phrase
              </button>
            </div>

            {culturalBriefing.keyLocalPhrases.map((kp, idx) => (
              <div
                key={idx}
                className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  className={inputCls}
                  placeholder={`Local Phrase #${idx + 1} (e.g. For here or to go?)`}
                  value={kp.phrase}
                  onChange={(e) =>
                    setCulturalBriefing((prev) => ({
                      ...prev,
                      keyLocalPhrases: prev.keyLocalPhrases.map((item, i) =>
                        i === idx ? { ...item, phrase: e.target.value } : item
                      ),
                    }))
                  }
                />
                <input
                  className={inputCls}
                  placeholder={`Vietnamese Meaning #${idx + 1} (e.g. Uống tại quán hay mang đi?)`}
                  value={kp.vietnameseMeaning}
                  onChange={(e) =>
                    setCulturalBriefing((prev) => ({
                      ...prev,
                      keyLocalPhrases: prev.keyLocalPhrases.map((item, i) =>
                        i === idx
                          ? { ...item, vietnameseMeaning: e.target.value }
                          : item
                      ),
                    }))
                  }
                />
                <button
                  type="button"
                  disabled={culturalBriefing.keyLocalPhrases.length <= 1}
                  onClick={() =>
                    setCulturalBriefing((prev) => ({
                      ...prev,
                      keyLocalPhrases: prev.keyLocalPhrases.filter(
                        (_, i) => i !== idx
                      ),
                    }))
                  }
                  className="rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className={labelCls}>
              💡 Practical Cultural Etiquette Tip *
            </label>
            <textarea
              className={inputCls}
              rows={2}
              placeholder="e.g. In US STEM labs, asking proactive questions and proposing hands-on prototypes is highly valued."
              value={culturalBriefing.culturalTip}
              onChange={(e) =>
                setCulturalBriefing((prev) => ({
                  ...prev,
                  culturalTip: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving..." : "💾 Save Cultural Guide"}
            </button>
          </div>
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4: SPEAKING AI ROLE-PLAY DIALOGUE TURNS
         ══════════════════════════════════════════════════════════════════ */}
      {!loading && subTab === "speaking" && (
        <div className="flex flex-col gap-5">
          {speakingTurns.length === 0 ? (
            <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4 text-sm text-slate-600">
              No Speaking AI dialogue turns configured for {country.name} yet. Add your first dialogue turn below.
            </p>
          ) : (
            <ul className="divide-y divide-orange-100 rounded-xl border border-orange-100 bg-white">
              {speakingTurns.map((turn, idx) => (
                <li
                  key={turn.id}
                  className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-extrabold text-orange-800">
                        Turn #{idx + 1}
                      </span>
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold uppercase text-amber-900">
                        {turn.speaker_role && !/BARISTA/i.test(turn.speaker_role)
                          ? turn.speaker_role
                          : "GRID ENGINEER SAYS"}
                      </span>
                      <span className="text-xs italic text-slate-600">
                        &ldquo;{turn.npc_prompt}&rdquo;
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900">
                      🎙️ &ldquo;{turn.target_line}&rdquo;
                    </p>
                    {turn.vietnamese_translation && (
                      <p className="text-xs text-slate-600">
                        🇻🇳 {turn.vietnamese_translation}
                      </p>
                    )}
                    {turn.coach_tip && (
                      <p className="mt-0.5 text-xs text-orange-800">
                        💡 {turn.coach_tip}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSpeakingTurn(idx, -1)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-40 cursor-pointer"
                      aria-label="Move turn up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx === speakingTurns.length - 1}
                      onClick={() => handleMoveSpeakingTurn(idx, 1)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-40 cursor-pointer"
                      aria-label="Move turn down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditSpeakingTurn(turn)}
                      className="rounded-lg border border-orange-200 px-3 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSpeakingTurn(turn)}
                      className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={handleSaveSpeakingTurn}
            className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/30 p-4"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              {editingSpeakingId
                ? "✏️ Edit Dialogue Turn"
                : "+ Add Dialogue Turn"}
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Speaker Role Label *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. GRID ENGINEER SAYS"
                  value={spForm.speakerRole}
                  onChange={(e) =>
                    setSpForm({ ...spForm, speakerRole: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>NPC Prompt (Spoken by AI) *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Welcome to the Clean Energy Lab! What renewable source should we prioritize?"
                  value={spForm.npcPrompt}
                  onChange={(e) =>
                    setSpForm({ ...spForm, npcPrompt: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>
                  Learner Target Line to Speak (English) *
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. We should install rooftop solar photovoltaic panels first."
                  value={spForm.targetLine}
                  onChange={(e) =>
                    setSpForm({ ...spForm, targetLine: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Vietnamese Translation Hint</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Chúng ta nên lắp đặt các tấm pin mặt trời quang điện trên mái nhà trước tiên."
                  value={spForm.vietnameseTranslation}
                  onChange={(e) =>
                    setSpForm({
                      ...spForm,
                      vietnameseTranslation: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Coach Pronunciation / Intonation Tip</label>
              <input
                className={inputCls}
                placeholder="e.g. Stress 'rooftop', 'solar', and 'photovoltaic' with clear, confident pacing."
                value={spForm.coachTip}
                onChange={(e) =>
                  setSpForm({ ...spForm, coachTip: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving
                  ? "Saving..."
                  : editingSpeakingId
                    ? "Save Dialogue Turn"
                    : "+ Add Dialogue Turn"}
              </button>
              {editingSpeakingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSpeakingId(null);
                    setSpForm(emptySpeakingTurnForm());
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default function AdminCmsView() {
  const router = useRouter();
  const { session, isHydrated, refreshProfile } = useSession();
  const { resetProgress } = useGame();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tab, setTab] = useState<AdminTab>("lessons");
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [videos, setVideos] = useState<DbVideo[]>(() => getLocalVideosStore());
  const [countries, setCountries] = useState<DbCountry[]>([]);
  const [events, setEvents] = useState<DbEvent[]>([]);

  const [studio, setStudio] = useState<StudioLesson | null>(null);
  const [deepEditCountry, setDeepEditCountry] = useState<DbCountry | null>(null);

  // Video create form
  const [vTitle, setVTitle] = useState("");
  const [vDesc, setVDesc] = useState("");
  const [vUrl, setVUrl] = useState("");
  const [vDuration, setVDuration] = useState("12 mins");
  const [vCategory, setVCategory] = useState("STEM");
  const [vPublished, setVPublished] = useState(true);
  const [vLevel, setVLevel] = useState<VideoLevel>("Intermediate");
  const [vDomain, setVDomain] = useState<VideoDomain>("AI & Tech");

  // Video inline edit state
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVTitle, setEditVTitle] = useState("");
  const [editVDesc, setEditVDesc] = useState("");
  const [editVUrl, setEditVUrl] = useState("");
  const [editVDuration, setEditVDuration] = useState("");
  const [editVCategory, setEditVCategory] = useState("");
  const [editVPublished, setEditVPublished] = useState(true);
  const [editVLevel, setEditVLevel] = useState<VideoLevel>("Intermediate");
  const [editVDomain, setEditVDomain] = useState<VideoDomain>("AI & Tech");
  const [editVNotes, setEditVNotes] = useState<VideoTranscriptNote[]>([]);
  const [editVQuiz, setEditVQuiz] = useState<VideoQuizQuestion[]>([]);

  // Event create form
  const [eTitle, setETitle] = useState("");
  const [eCategory, setECategory] = useState<"meetup" | "challenge">("meetup");
  const [eDate, setEDate] = useState("");
  const [eTime, setETime] = useState("");
  const [eLocation, setELocation] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eRewards, setERewards] = useState("");
  const [ePublished, setEPublished] = useState(true);

  // Event inline edit state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editETitle, setEditETitle] = useState("");
  const [editEDesc, setEditEDesc] = useState("");
  const [editEDate, setEditEDate] = useState("");
  const [editETime, setEditETime] = useState("");
  const [editELocation, setEditELocation] = useState("");
  const [editERewards, setEditERewards] = useState("");
  const [editECategory, setEditECategory] = useState<"meetup" | "challenge">("meetup");
  const [editEPublished, setEditEPublished] = useState(true);

  const isAdmin = session?.role === "admin";
  const displayName = session?.displayName || "Explorer";

  useEffect(() => {
    if (isHydrated && (!session || session.role !== "admin")) {
      router.replace("/dashboard");
    }
  }, [isHydrated, session, router]);

  const flash = useCallback((text: string, ok = true) => {
    setNotice({ text, ok });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const fetchVideos = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error && Array.isArray(data)) {
      if (
        data.length === 0 &&
        typeof window !== "undefined" &&
        !localStorage.getItem(VIDEOS_SEEDED_KEY)
      ) {
        const seedRows = getLocalVideosStore();
        localStorage.setItem(VIDEOS_SEEDED_KEY, "1");
        const { error: seedErr } = await supabase
          .from("videos")
          .upsert(seedRows, { onConflict: "id" });
        if (!seedErr) {
          setVideos(seedRows);
          saveLocalVideosStore(seedRows);
          return;
        }
      }
      if (data.length > 0 || localStorage.getItem(VIDEOS_SEEDED_KEY)) {
        const rows = (data as DbVideo[]).map(normalizeVideo);
        setVideos(rows);
        saveLocalVideosStore(rows);
        return;
      }
    }

    // Fallback to local store (seeded with the 3 default TED-Ed videos)
    setVideos(getLocalVideosStore());
  }, []);

  const loadAll = useCallback(async () => {
    const supabase = createClient();
    const [l, c, e] = await Promise.all([
      supabase.from("lessons").select("*").order("sort_order", { ascending: true }),
      supabase.from("countries").select("*").order("sort_order", { ascending: true }),
      supabase.from("events").select("*").order("sort_order", { ascending: true }),
      fetchVideos(),
    ]);
    setLessons((l.data || []) as DbLesson[]);
    setCountries((c.data || []) as DbCountry[]);
    setEvents((e.data || []) as DbEvent[]);
  }, [fetchVideos]);

  useEffect(() => {
    if (isAdmin) {
      void loadAll();
    }
  }, [isAdmin, loadAll]);

  useEffect(() => {
    if (isAdmin && tab === "videos") {
      void fetchVideos();
    }
  }, [isAdmin, tab, fetchVideos]);

  if (!isHydrated || !session || session.role !== "admin") {
    return null;
  }

  async function handleOpenStudio(lessonId: string) {
    setBusy(true);
    try {
      const full = await fetchFullLessonForEdit(lessonId);
      if (full) setStudio(full);
      else flash("Lesson not found.", false);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not load lesson.", false);
    }
    setBusy(false);
  }

  async function handleToggleLessonPublished(lesson: DbLesson) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("lessons")
      .update({ is_published: !lesson.is_published })
      .eq("id", lesson.id);
    flash(
      error
        ? `Update failed: ${error.message}`
        : `"${lesson.title}" ${!lesson.is_published ? "published" : "unpublished"}.`,
      !error
    );
    await loadAll();
    setBusy(false);
  }

  async function handleDeleteLesson(lesson: DbLesson) {
    if (!window.confirm(`Delete "${lesson.title}"?`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
    flash(error ? `Delete failed: ${error.message}` : "Lesson deleted.", !error);
    await loadAll();
    setBusy(false);
  }

  async function handleCreateVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!vTitle.trim()) return flash("Video title is required.", false);
    if (!vUrl.trim()) return flash("YouTube URL is required.", false);
    setBusy(true);
    const supabase = createClient();
    const maxOrder = videos.reduce((m, x) => Math.max(m, x.sort_order || 0), 0);
    const newVideo: DbVideo = {
      id: `video-custom-${slugify(vTitle) || "item"}-${Date.now().toString(36)}`,
      title: vTitle.trim(),
      description: vDesc.trim(),
      youtube_url: vUrl.trim(),
      duration_label: vDuration.trim() || "10 mins",
      category: vCategory.trim() || "STEM",
      sort_order: maxOrder + 1,
      is_published: vPublished,
      created_at: new Date().toISOString(),
      level: vLevel,
      domain: vDomain,
      transcript_notes: [],
      quiz_questions: [],
    };

    const nextList = [...videos, newVideo];
    setVideos(nextList);
    saveLocalVideosStore(nextList);

    await supabase.from("videos").upsert(newVideo, { onConflict: "id" });

    flash(`Video "${vTitle.trim()}" added.`);
    setVTitle("");
    setVDesc("");
    setVUrl("");
    setVDuration("12 mins");
    setVCategory("STEM");
    setVPublished(true);
    window.dispatchEvent(new CustomEvent("wordwise_videos_updated"));
    await fetchVideos();
    setBusy(false);
  }

  function startEditVideo(v: DbVideo) {
    setEditingVideoId(v.id);
    setEditVTitle(v.title);
    setEditVDesc(v.description || "");
    setEditVUrl(v.youtube_url);
    setEditVDuration(v.duration_label || "10 mins");
    setEditVCategory(v.category || "STEM");
    setEditVPublished(v.is_published);
    setEditVLevel(v.level || "Intermediate");
    setEditVDomain(v.domain || "AI & Tech");
    setEditVNotes((v.transcript_notes || []).map((n) => ({ ...n })));
    setEditVQuiz(
      (v.quiz_questions || []).map((q) => ({
        ...q,
        options: [...q.options],
      }))
    );
  }

  async function handleSaveVideo(videoId: string) {
    if (!editVTitle.trim()) return flash("Video title is required.", false);
    if (!editVUrl.trim()) return flash("YouTube URL is required.", false);
    setBusy(true);
    const supabase = createClient();
    const cleanNotes = editVNotes
      .map((n) => ({
        term: n.term.trim(),
        meaning: n.meaning.trim(),
        contextSentence: n.contextSentence.trim(),
      }))
      .filter((n) => n.term && n.meaning);
    const cleanQuiz = editVQuiz
      .map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correctIndex: q.correctIndex,
      }))
      .filter(
        (q) =>
          q.question &&
          q.options.length >= 2 &&
          q.options.every((o) => o) &&
          q.correctIndex >= 0 &&
          q.correctIndex < q.options.length
      );
    const updatedFields = {
      title: editVTitle.trim(),
      description: editVDesc.trim(),
      youtube_url: editVUrl.trim(),
      duration_label: editVDuration.trim() || "10 mins",
      category: editVCategory.trim() || "STEM",
      is_published: editVPublished,
      level: editVLevel,
      domain: editVDomain,
      transcript_notes: cleanNotes,
      quiz_questions: cleanQuiz,
    };

    const nextList = videos.map((v) =>
      v.id === videoId ? { ...v, ...updatedFields } : v
    );
    setVideos(nextList);
    saveLocalVideosStore(nextList);

    await supabase.from("videos").update(updatedFields).eq("id", videoId);

    flash("Video updated.");
    setEditingVideoId(null);
    window.dispatchEvent(new CustomEvent("wordwise_videos_updated"));
    await fetchVideos();
    setBusy(false);
  }

  async function handleToggleVideoPublished(v: DbVideo) {
    setBusy(true);
    const supabase = createClient();
    const nextPublished = !v.is_published;
    const nextList = videos.map((item) =>
      item.id === v.id ? { ...item, is_published: nextPublished } : item
    );
    setVideos(nextList);
    saveLocalVideosStore(nextList);

    await supabase
      .from("videos")
      .update({ is_published: nextPublished })
      .eq("id", v.id);

    flash(`"${v.title}" ${nextPublished ? "published" : "unpublished"}.`);
    window.dispatchEvent(new CustomEvent("wordwise_videos_updated"));
    await fetchVideos();
    setBusy(false);
  }

  async function handleDeleteVideo(v: DbVideo) {
    if (!window.confirm(`Delete "${v.title}"?`)) return;
    setBusy(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(VIDEOS_SEEDED_KEY, "1");
    }
    const nextList = videos.filter((item) => item.id !== v.id);
    setVideos(nextList);
    saveLocalVideosStore(nextList);

    const supabase = createClient();
    await supabase.from("videos").delete().eq("id", v.id);

    flash("Video deleted.");
    window.dispatchEvent(new CustomEvent("wordwise_videos_updated"));
    await fetchVideos();
    setBusy(false);
  }

  async function handleToggleCountry(country: DbCountry) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("countries")
      .update({ unlocked: !country.unlocked })
      .eq("id", country.id);
    flash(
      error
        ? `Update failed: ${error.message}`
        : `${country.name} ${!country.unlocked ? "unlocked" : "locked"}.`,
      !error
    );
    await loadAll();
    setBusy(false);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eTitle.trim()) return flash("Event title is required.", false);
    setBusy(true);
    const supabase = createClient();
    const maxOrder = events.reduce((m, x) => Math.max(m, x.sort_order || 0), 0);
    const newId = `event-custom-${slugify(eTitle) || "item"}-${Date.now().toString(36)}`;
    const baseFormat =
      eCategory === "challenge" ? "Self-Paced Challenge" : "Community Meetup";
    const basePayload = {
      id: newId,
      title: eTitle.trim(),
      subtitle: "",
      category: eCategory,
      format_label: ePublished ? baseFormat : `[UNPUBLISHED] ${baseFormat}`,
      date_label: eDate.trim(),
      time_label: eTime.trim(),
      location: eLocation.trim(),
      host: "Wordwise Community Team",
      description: eDesc.trim(),
      rewards: eRewards.trim(),
      base_registered_count: 0,
      sort_order: maxOrder + 1,
    };

    let { error } = await supabase.from("events").insert({
      ...basePayload,
      format_label: baseFormat,
      is_published: ePublished,
    });

    if (error && /is_published/i.test(error.message)) {
      const fallbackRes = await supabase.from("events").insert(basePayload);
      error = fallbackRes.error;
    }

    if (error) {
      flash(`Insert failed: ${error.message}`, false);
    } else {
      setLocalEventPublishedState(newId, ePublished);
      flash(
        `Event "${eTitle.trim()}" ${ePublished ? "published" : "saved as unpublished"}.`
      );
      setETitle("");
      setEDate("");
      setETime("");
      setELocation("");
      setEDesc("");
      setERewards("");
      setEPublished(true);
      await loadAll();
    }
    setBusy(false);
  }

  function startEditEvent(ev: DbEvent) {
    setEditingEventId(ev.id);
    setEditETitle(ev.title);
    setEditEDesc(ev.description || "");
    setEditEDate(ev.date_label || "");
    setEditETime(ev.time_label || "");
    setEditELocation(ev.location || "");
    setEditERewards(ev.rewards || "");
    setEditECategory((ev.category as "meetup" | "challenge") || "meetup");
    setEditEPublished(isDbEventPublished(ev));
  }

  async function handleSaveEvent(eventId: string) {
    if (!editETitle.trim()) return flash("Event title is required.", false);
    setBusy(true);
    const supabase = createClient();
    const baseFormat =
      editECategory === "challenge"
        ? "Self-Paced Challenge"
        : "Community Meetup";
    const baseUpdate = {
      title: editETitle.trim(),
      description: editEDesc.trim(),
      date_label: editEDate.trim(),
      time_label: editETime.trim(),
      location: editELocation.trim(),
      rewards: editERewards.trim(),
      category: editECategory,
      format_label: editEPublished
        ? baseFormat
        : `[UNPUBLISHED] ${baseFormat}`,
    };

    let { error } = await supabase
      .from("events")
      .update({
        ...baseUpdate,
        format_label: baseFormat,
        is_published: editEPublished,
      })
      .eq("id", eventId);

    if (error && /is_published/i.test(error.message)) {
      const fallbackRes = await supabase
        .from("events")
        .update(baseUpdate)
        .eq("id", eventId);
      error = fallbackRes.error;
    }

    if (error) {
      flash(`Update failed: ${error.message}`, false);
    } else {
      setLocalEventPublishedState(eventId, editEPublished);
      flash("Event updated.");
      setEditingEventId(null);
      await loadAll();
    }
    setBusy(false);
  }

  async function handleToggleEventPublished(ev: DbEvent) {
    setBusy(true);
    const supabase = createClient();
    const currentlyPublished = isDbEventPublished(ev);
    const nextPublished = !currentlyPublished;
    const cleanFormat =
      cleanEventFormatLabel(ev.format_label) ||
      (ev.category === "challenge"
        ? "Self-Paced Challenge"
        : "Community Meetup");

    // Optimistic UI update
    setEvents((prev) =>
      prev.map((item) =>
        item.id === ev.id
          ? {
              ...item,
              is_published: nextPublished,
              format_label: nextPublished
                ? cleanFormat
                : `[UNPUBLISHED] ${cleanFormat}`,
            }
          : item
      )
    );
    setLocalEventPublishedState(ev.id, nextPublished);

    let { error } = await supabase
      .from("events")
      .update({
        is_published: nextPublished,
        format_label: cleanFormat,
      })
      .eq("id", ev.id);

    if (error && /is_published/i.test(error.message)) {
      const fallbackRes = await supabase
        .from("events")
        .update({
          format_label: nextPublished
            ? cleanFormat
            : `[UNPUBLISHED] ${cleanFormat}`,
        })
        .eq("id", ev.id);
      error = fallbackRes.error;
    }

    flash(
      error
        ? `Update failed: ${error.message}`
        : `"${ev.title}" ${nextPublished ? "published" : "unpublished"}.`,
      !error
    );
    await loadAll();
    setBusy(false);
  }

  async function handleDeleteEvent(ev: DbEvent) {
    if (!window.confirm(`Delete "${ev.title}"?`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", ev.id);
    flash(error ? `Delete failed: ${error.message}` : "Event deleted.", !error);
    await loadAll();
    setBusy(false);
  }

  async function handleResetUser() {
    if (!session?.id) return;
    if (
      !window.confirm(
        "Reset ALL of your progress (lessons, missions, achievements, RSVPs, XP, streak, subscription)?"
      )
    ) {
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const uid = session.id;

    const results = await Promise.all([
      supabase.from("user_lesson_progress").delete().eq("user_id", uid),
      supabase.from("user_mission_progress").delete().eq("user_id", uid),
      supabase.from("user_achievements").delete().eq("user_id", uid),
      supabase.from("event_registrations").delete().eq("user_id", uid),
      supabase
        .from("profiles")
        .update({ xp: 0, current_streak: 1, subscription_tier: "free" })
        .eq("id", uid),
    ]);
    const failed = results.find((r) => r.error);

    // Local caches + game state
    clearCurriculumProgress();
    resetStreak(true);
    clearStoredUnlockTimestamps();
    clearRegisteredEvents();
    resetSubscription();
    resetProgress();
    await refreshProfile();

    flash(
      failed?.error
        ? `Reset finished with an error: ${failed.error.message}`
        : "Progress fully reset in database and local cache.",
      !failed?.error
    );
    setBusy(false);
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "lessons", label: "📚 Curriculum Lessons" },
    { id: "videos", label: "🎥 Video Lessons" },
    { id: "countries", label: "🌍 World Map Countries" },
    { id: "events", label: "📅 Community Events" },
    { id: "community", label: "💬 Community" },
    { id: "tools", label: "🛠️ Developer & Testing Tools" },
  ];

  return (
    <div className="dashboard-container">
      <DashboardSidebar
        currentSection="content-mgmt"
        isOpenOnMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="dashboard-main-wrapper">
        <header className="dashboard-mobile-header" aria-label="Mobile navigation bar">
          <button
            type="button"
            className="dashboard-menu-toggle-btn"
            onClick={() => setMobileMenuOpen((p) => !p)}
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-sidebar"
            aria-label="Toggle navigation menu"
          >
            <span className="dashboard-menu-bar" aria-hidden="true" />
            <span className="dashboard-menu-bar" aria-hidden="true" />
            <span className="dashboard-menu-bar" aria-hidden="true" />
          </button>
          <span className="dashboard-mobile-wordmark">Wordwise</span>
          <div className="dashboard-mobile-user-initial" aria-label={`User: ${displayName}`}>
            {(displayName.charAt(0) || "U").toUpperCase()}
          </div>
        </header>

        <main id="main-content" className="dashboard-content-area" tabIndex={-1}>
          <div className="mb-6 flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-orange-700">
              ⚙️ Content Management
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Admin Content Hub
            </h1>
          </div>

          {notice && (
            <div
              role="status"
              className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
                notice.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="CMS sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition cursor-pointer ${
                  tab === t.id
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Lessons */}
          {tab === "lessons" && (
            <div className="flex flex-col gap-5">
              {studio ? (
                <LessonStudio
                  key={studio.id || "new"}
                  initial={studio}
                  onClose={() => setStudio(null)}
                  flash={flash}
                  onSaved={async () => {
                    setStudio(null);
                    await loadAll();
                  }}
                />
              ) : (
                <section className={cardCls}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Lessons ({lessons.length})
                    </h2>
                    <button type="button" className={btnPrimary} onClick={() => setStudio(emptyStudioLesson())}>
                      + Create New Lesson
                    </button>
                  </div>
                  {lessons.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No lessons in the database yet. Run supabase/seed.sql or create one.
                    </p>
                  )}
                  <ul className="divide-y divide-orange-100">
                    {lessons.map((l) => (
                      <li key={l.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{l.title}</p>
                          {l.subtitle && <p className="truncate text-xs text-slate-600">{l.subtitle}</p>}
                          <p className="text-xs text-slate-500">
                            {l.id} • {l.category} • {l.difficulty} • {l.is_published ? "Published" : "Draft"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                              l.lesson_type === "flashcard"
                                ? "border-amber-300 bg-amber-100 text-amber-800"
                                : "border-orange-200 bg-orange-100 text-orange-800"
                            }`}
                          >
                            {l.lesson_type}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleToggleLessonPublished(l)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer disabled:opacity-50 ${
                              l.is_published
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {l.is_published ? "Published" : "Unpublished"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleOpenStudio(l.id)}
                            className="rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                          >
                            ✏️ Edit Full Lesson
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDeleteLesson(l)}
                            className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {/* Tab 1.5: Video Lessons */}
          {tab === "videos" && (
            <div className="flex flex-col gap-5">
              <section className={cardCls}>
                <h2 className="mb-3 text-lg font-extrabold text-slate-900">
                  Video Lessons ({videos.length})
                </h2>
                {videos.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No video lessons in the database yet. Add one using the form below.
                  </p>
                )}
                <ul className="divide-y divide-orange-100">
                  {videos.map((v) => (
                    <li key={v.id} className="py-3">
                      {editingVideoId === v.id ? (
                        <div className="flex flex-col gap-2.5 rounded-xl border border-orange-200 bg-orange-50/40 p-3">
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <input
                              className={inputCls}
                              placeholder="Title *"
                              value={editVTitle}
                              onChange={(e) => setEditVTitle(e.target.value)}
                            />
                            <input
                              className={inputCls}
                              placeholder="YouTube URL or Embed Link *"
                              value={editVUrl}
                              onChange={(e) => setEditVUrl(e.target.value)}
                            />
                            <input
                              className={inputCls}
                              placeholder="Category (e.g. STEM, Solar Energy)"
                              value={editVCategory}
                              onChange={(e) => setEditVCategory(e.target.value)}
                            />
                            <input
                              className={inputCls}
                              placeholder="Duration (e.g. 12 mins)"
                              value={editVDuration}
                              onChange={(e) => setEditVDuration(e.target.value)}
                            />
                          </div>
                          <textarea
                            className={inputCls}
                            rows={2}
                            placeholder="Description"
                            value={editVDesc}
                            onChange={(e) => setEditVDesc(e.target.value)}
                          />
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <label className={labelCls}>Level</label>
                              <select
                                className={inputCls}
                                value={editVLevel}
                                onChange={(e) =>
                                  setEditVLevel(e.target.value as VideoLevel)
                                }
                              >
                                {VIDEO_LEVELS.map((lv) => (
                                  <option key={lv} value={lv}>
                                    {lv}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Domain</label>
                              <select
                                className={inputCls}
                                value={editVDomain}
                                onChange={(e) =>
                                  setEditVDomain(e.target.value as VideoDomain)
                                }
                              >
                                {VIDEO_DOMAINS.map((dm) => (
                                  <option key={dm} value={dm}>
                                    {dm}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <VideoImmersionEditor
                            notes={editVNotes}
                            setNotes={setEditVNotes}
                            quiz={editVQuiz}
                            setQuiz={setEditVQuiz}
                          />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={editVPublished}
                                onChange={(e) => setEditVPublished(e.target.checked)}
                                className="h-4 w-4 accent-orange-500"
                              />
                              Published
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleSaveVideo(v.id)}
                                className={btnPrimary}
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setEditingVideoId(null)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            {getYouTubeThumbUrl(v.youtube_url) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getYouTubeThumbUrl(v.youtube_url) || ""}
                                alt={v.title}
                                className="h-14 w-24 shrink-0 rounded-lg border border-orange-200 object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xl">
                                🎥
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {v.title}
                              </p>
                              {v.description && (
                                <p className="truncate text-xs text-slate-600">
                                  {v.description}
                                </p>
                              )}
                              <p className="truncate text-xs text-slate-500">
                                {v.category} • {v.duration_label || "10 mins"} •{" "}
                                {v.youtube_url}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-extrabold text-sky-800">
                                  {v.level || "Intermediate"}
                                </span>
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                  {v.domain || "AI & Tech"}
                                </span>
                                <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-extrabold text-orange-800">
                                  📝 {(v.transcript_notes || []).length} terms
                                </span>
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                  ✅ {(v.quiz_questions || []).length} quiz Qs
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleToggleVideoPublished(v)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer disabled:opacity-50 ${
                                v.is_published
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {v.is_published ? "Published" : "Unpublished"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => startEditVideo(v)}
                              className="rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDeleteVideo(v)}
                              className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <form onSubmit={handleCreateVideo} className={`${cardCls} flex flex-col gap-3`}>
                <h2 className="text-lg font-extrabold text-slate-900">+ Add Video Lesson</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Title *</label>
                    <input
                      className={inputCls}
                      placeholder="e.g. How Solar Photovoltaic Cells Work"
                      value={vTitle}
                      onChange={(e) => setVTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>YouTube URL or Embed Link *</label>
                    <input
                      className={inputCls}
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={vUrl}
                      onChange={(e) => setVUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Duration</label>
                    <input
                      className={inputCls}
                      placeholder="e.g. 12 mins"
                      value={vDuration}
                      onChange={(e) => setVDuration(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <input
                      className={inputCls}
                      placeholder="e.g. STEM, Solar Energy, Clean Tech"
                      value={vCategory}
                      onChange={(e) => setVCategory(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea
                    className={inputCls}
                    rows={3}
                    placeholder="Brief summary of what students will learn in this video..."
                    value={vDesc}
                    onChange={(e) => setVDesc(e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Level</label>
                    <select
                      className={inputCls}
                      value={vLevel}
                      onChange={(e) => setVLevel(e.target.value as VideoLevel)}
                    >
                      {VIDEO_LEVELS.map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Domain</label>
                    <select
                      className={inputCls}
                      value={vDomain}
                      onChange={(e) => setVDomain(e.target.value as VideoDomain)}
                    >
                      {VIDEO_DOMAINS.map((dm) => (
                        <option key={dm} value={dm}>
                          {dm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  After adding the video, click <strong>Edit</strong> to add Key Terms and Mini-Quiz questions.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={vPublished}
                      onChange={(e) => setVPublished(e.target.checked)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    Published
                  </label>
                  <button type="submit" className={btnPrimary} disabled={busy}>
                    {busy ? "Saving..." : "+ Add Video Lesson"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Countries */}
          {tab === "countries" && deepEditCountry && (
            <CountryStudio
              key={deepEditCountry.id}
              country={deepEditCountry}
              onClose={() => setDeepEditCountry(null)}
              flash={flash}
            />
          )}
          {tab === "countries" && !deepEditCountry && (
            <section className={cardCls}>
              <h2 className="mb-3 text-lg font-extrabold text-slate-900">World Map Countries</h2>
              {countries.length === 0 && (
                <p className="text-sm text-slate-500">No countries found in the database.</p>
              )}
              <ul className="divide-y divide-orange-100">
                {countries.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">{c.flag}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.mission_title || "No mission"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDeepEditCountry(c)}
                      className="rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                    >
                      ⚙️ Edit Country Content
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={c.unlocked}
                      disabled={busy}
                      onClick={() => handleToggleCountry(c)}
                      className={`relative h-7 w-14 rounded-full transition disabled:opacity-50 cursor-pointer ${
                        c.unlocked ? "bg-orange-500" : "bg-slate-300"
                      }`}
                      title={c.unlocked ? "Click to lock" : "Click to unlock"}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                          c.unlocked ? "left-7" : "left-0.5"
                        }`}
                      />
                    </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Tab 3: Events */}
          {tab === "events" && (
            <div className="flex flex-col gap-5">
              <section className={cardCls}>
                <h2 className="mb-3 text-lg font-extrabold text-slate-900">Events ({events.length})</h2>
                {events.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No community events in the database yet. Add one using the form below.
                  </p>
                )}
                <ul className="divide-y divide-orange-100">
                  {events.map((ev) => {
                    const evPublished = isDbEventPublished(ev);
                    return (
                      <li key={ev.id} className="py-3">
                        {editingEventId === ev.id ? (
                          <div className="flex flex-col gap-2.5 rounded-xl border border-orange-200 bg-orange-50/40 p-3">
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              <input
                                className={inputCls}
                                placeholder="Title *"
                                value={editETitle}
                                onChange={(e) => setEditETitle(e.target.value)}
                              />
                              <select
                                className={inputCls}
                                value={editECategory}
                                onChange={(e) =>
                                  setEditECategory(e.target.value as "meetup" | "challenge")
                                }
                              >
                                <option value="meetup">Meetup</option>
                                <option value="challenge">Challenge</option>
                              </select>
                              <input
                                className={inputCls}
                                placeholder="Date"
                                value={editEDate}
                                onChange={(e) => setEditEDate(e.target.value)}
                              />
                              <input
                                className={inputCls}
                                placeholder="Time"
                                value={editETime}
                                onChange={(e) => setEditETime(e.target.value)}
                              />
                              <input
                                className={inputCls}
                                placeholder="Location"
                                value={editELocation}
                                onChange={(e) => setEditELocation(e.target.value)}
                              />
                              <input
                                className={inputCls}
                                placeholder="Rewards"
                                value={editERewards}
                                onChange={(e) => setEditERewards(e.target.value)}
                              />
                            </div>
                            <textarea
                              className={inputCls}
                              rows={2}
                              placeholder="Description"
                              value={editEDesc}
                              onChange={(e) => setEditEDesc(e.target.value)}
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={editEPublished}
                                  onChange={(e) => setEditEPublished(e.target.checked)}
                                  className="h-4 w-4 accent-orange-500"
                                />
                                Published
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleSaveEvent(ev.id)}
                                  className={btnPrimary}
                                >
                                  Save Changes
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setEditingEventId(null)}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{ev.title}</p>
                              {ev.description && (
                                <p className="truncate text-xs text-slate-600">{ev.description}</p>
                              )}
                              <p className="text-xs text-slate-500">
                                {ev.category} • {ev.date_label} • {ev.location} •{" "}
                                {evPublished ? "Published" : "Draft"}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                                  ev.category === "challenge"
                                    ? "border-amber-300 bg-amber-100 text-amber-800"
                                    : "border-orange-200 bg-orange-100 text-orange-800"
                                }`}
                              >
                                {ev.category}
                              </span>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleToggleEventPublished(ev)}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer disabled:opacity-50 ${
                                  evPublished
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {evPublished ? "Published" : "Unpublished"}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => startEditEvent(ev)}
                                className="rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 disabled:opacity-50 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDeleteEvent(ev)}
                                className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <form onSubmit={handleCreateEvent} className={`${cardCls} flex flex-col gap-3`}>
                <h2 className="text-lg font-extrabold text-slate-900">+ Add Community Event</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className={inputCls} placeholder="Title *" value={eTitle} onChange={(e) => setETitle(e.target.value)} />
                  <select className={inputCls} value={eCategory} onChange={(e) => setECategory(e.target.value as "meetup" | "challenge")}>
                    <option value="meetup">Meetup</option>
                    <option value="challenge">Challenge</option>
                  </select>
                  <input className={inputCls} placeholder="Date (e.g. Next Saturday)" value={eDate} onChange={(e) => setEDate(e.target.value)} />
                  <input className={inputCls} placeholder="Time (e.g. 19:30 – 20:30 (GMT+7))" value={eTime} onChange={(e) => setETime(e.target.value)} />
                  <input className={inputCls} placeholder="Location" value={eLocation} onChange={(e) => setELocation(e.target.value)} />
                  <input className={inputCls} placeholder="Rewards (e.g. Badge + 50 XP)" value={eRewards} onChange={(e) => setERewards(e.target.value)} />
                </div>
                <textarea className={inputCls} rows={3} placeholder="Description" value={eDesc} onChange={(e) => setEDesc(e.target.value)} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={ePublished}
                      onChange={(e) => setEPublished(e.target.checked)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    Publish immediately
                  </label>
                  <button type="submit" className={btnPrimary} disabled={busy}>
                    {busy ? "Saving..." : "+ Add Event"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 3.5: Community Moderation & Rules */}
          {tab === "community" && <CommunityModerationSection flash={flash} />}

          {/* Tab 4: Tools */}
          {tab === "tools" && (
            <section className={cardCls}>
              <h2 className="mb-1 text-lg font-extrabold text-slate-900">Admin Reset</h2>
              <p className="mb-4 text-sm text-slate-600">
                Deletes your lesson, mission, achievement and event rows, resets XP to 0, streak to 1 and subscription to free, then clears local caches. Useful for testing and live demos.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={handleResetUser}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
              >
                🔄 Reset Current User Progress
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   COMMUNITY MODERATION & FORUM RULES EDITOR (Tab: "community")
   ───────────────────────────────────────────────────────────────────────── */

function CommunityModerationSection({
  flash,
}: {
  flash: (text: string, ok?: boolean) => void;
}) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [rules, setRules] = useState<string[]>(DEFAULT_FORUM_RULES);
  const [newRuleText, setNewRuleText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | ForumCategory>(
    "All"
  );
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);

  const loadForumAdminData = useCallback(async () => {
    setLoading(true);
    const [d, loadedRules] = await Promise.all([
      fetchForumData(),
      fetchForumRules(),
    ]);
    setPosts(d.posts);
    setRules(loadedRules);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadForumAdminData();
  }, [loadForumAdminData]);

  const filteredPosts = posts.filter((p) => {
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const qh = q.replace(/^@/, "");
    return (
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.author_handle.toLowerCase().includes(qh)
    );
  });

  async function handlePin(p: ForumPost) {
    const nextPinned = !p.is_pinned;
    setPosts((prev) =>
      prev
        .map((x) => (x.id === p.id ? { ...x, is_pinned: nextPinned } : x))
        .sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return +new Date(b.created_at) - +new Date(a.created_at);
        })
    );
    await togglePinPost(p.id, nextPinned);
    flash(nextPinned ? `📌 Pinned "${p.title}".` : `Unpinned "${p.title}".`);
  }

  async function handleLock(p: ForumPost) {
    const nextLocked = !p.is_locked;
    setPosts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, is_locked: nextLocked } : x))
    );
    await toggleLockPost(p.id, nextLocked);
    flash(
      nextLocked
        ? `🔒 Locked thread "${p.title}".`
        : `🔓 Unlocked thread "${p.title}".`
    );
  }

  async function handleDelete(p: ForumPost) {
    if (!window.confirm(`Delete post "${p.title}" by @${p.author_handle}?`)) {
      return;
    }
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    await deleteForumPost(p.id);
    flash(`🗑️ Deleted post "${p.title}".`);
  }

  async function persistRules(nextRules: string[], message: string) {
    setRules(nextRules);
    setSavingRules(true);
    await saveForumRules(nextRules);
    setSavingRules(false);
    flash(message);
  }

  function handleRuleTextChange(idx: number, val: string) {
    setRules((prev) => prev.map((r, i) => (i === idx ? val : r)));
  }

  async function handleSaveEditedRules() {
    const cleaned = rules.map((r) => r.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      flash("At least one forum rule is required.", false);
      return;
    }
    await persistRules(cleaned, "Forum rules saved and synced to /community.");
  }

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    const t = newRuleText.trim();
    if (!t) return;
    const next = [...rules, t];
    setNewRuleText("");
    await persistRules(next, "Added new community rule.");
  }

  async function handleMoveRule(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= rules.length) return;
    const copy = [...rules];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    await persistRules(copy, "Reordered community rules.");
  }

  async function handleDeleteRule(idx: number) {
    if (rules.length <= 1) {
      flash("Keep at least one forum rule.", false);
      return;
    }
    const next = rules.filter((_, i) => i !== idx);
    await persistRules(next, "Removed community rule.");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Posts Moderation Table */}
      <section className={cardCls}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              💬 Community Posts Moderation ({filteredPosts.length})
            </h2>
            <p className="text-xs text-slate-500">
              Pin announcements to the top of /community, lock threads to disable learner replies, or delete offending posts.
            </p>
          </div>
          <a
            href="/community"
            className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-extrabold text-orange-700 hover:bg-orange-100"
          >
            Open /community ↗
          </a>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input
            type="search"
            className={`${inputCls} sm:col-span-2`}
            placeholder="Search posts by title, content, or @author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className={inputCls}
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as "All" | ForumCategory)
            }
          >
            <option value="All">All Categories</option>
            {FORUM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Loading community posts...
          </p>
        ) : filteredPosts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-6 text-center text-sm text-slate-500">
            No forum posts match your search or category filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-orange-100 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-3">Post &amp; Status</th>
                  <th className="px-3 py-2.5">Author</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5 text-center">Stats</th>
                  <th className="py-2.5 pl-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {filteredPosts.map((p) => (
                  <tr key={p.id} className="hover:bg-orange-50/30">
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.is_pinned && (
                          <span className="rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">
                            📌 Pinned
                          </span>
                        )}
                        {p.is_locked && (
                          <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                            🔒 Locked
                          </span>
                        )}
                        <span className="font-bold text-slate-900">
                          {p.title}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {p.content}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs font-bold text-slate-700">
                      @{p.author_handle}
                      <div className="font-normal text-slate-400">
                        {formatRelativeTime(p.created_at)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                        {p.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-xs font-bold text-slate-600">
                      ▲ {p.upvotes} • 💬 {p.comment_count}
                    </td>
                    <td className="whitespace-nowrap py-3 pl-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePin(p)}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                            p.is_pinned
                              ? "border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200"
                              : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
                          }`}
                        >
                          📌 {p.is_pinned ? "Unpin" : "Pin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLock(p)}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                            p.is_locked
                              ? "border-slate-400 bg-slate-200 text-slate-900 hover:bg-slate-300"
                              : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
                          }`}
                        >
                          🔒 {p.is_locked ? "Unlock" : "Lock"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Forum Rules Editor */}
      <section className={cardCls}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              📜 Forum Rules Editor ({rules.length})
            </h2>
            <p className="text-xs text-slate-500">
              Edit, reorder, or add community guidelines displayed in the right sidebar of /community.
            </p>
          </div>
          <button
            type="button"
            disabled={savingRules}
            onClick={handleSaveEditedRules}
            className={btnPrimary}
          >
            {savingRules ? "Saving..." : "💾 Save Rule Text Edits"}
          </button>
        </div>

        <ul className="mb-4 flex flex-col gap-2">
          {rules.map((rule, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/30 p-2"
            >
              <span className="w-7 shrink-0 text-center text-xs font-extrabold text-orange-700">
                #{idx + 1}
              </span>
              <input
                className={inputCls}
                value={rule}
                onChange={(e) => handleRuleTextChange(idx, e.target.value)}
              />
              <button
                type="button"
                disabled={idx === 0 || savingRules}
                onClick={() => handleMoveRule(idx, -1)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold disabled:opacity-40"
                title="Move rule up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={idx === rules.length - 1 || savingRules}
                onClick={() => handleMoveRule(idx, 1)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold disabled:opacity-40"
                title="Move rule down"
              >
                ↓
              </button>
              <button
                type="button"
                disabled={savingRules}
                onClick={() => handleDeleteRule(idx)}
                className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddRule} className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Add a new community rule (e.g. Keep titles descriptive)..."
            value={newRuleText}
            onChange={(e) => setNewRuleText(e.target.value)}
          />
          <button
            type="submit"
            disabled={savingRules || !newRuleText.trim()}
            className={btnPrimary}
          >
            + Add Rule
          </button>
        </form>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   VIDEO IMMERSION EDITOR — Key Terms (transcript notes) & Mini-Quiz questions
   ───────────────────────────────────────────────────────────────────────── */

function VideoImmersionEditor({
  notes,
  setNotes,
  quiz,
  setQuiz,
}: {
  notes: VideoTranscriptNote[];
  setNotes: React.Dispatch<React.SetStateAction<VideoTranscriptNote[]>>;
  quiz: VideoQuizQuestion[];
  setQuiz: React.Dispatch<React.SetStateAction<VideoQuizQuestion[]>>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-orange-200 bg-white p-3">
      {/* Key Terms */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            📝 Key Terms (Transcript Notes) — {notes.length}
          </p>
          <button
            type="button"
            onClick={() =>
              setNotes((prev) => [
                ...prev,
                { term: "", meaning: "", contextSentence: "" },
              ])
            }
            className="cursor-pointer rounded-lg border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-700 hover:bg-orange-100"
          >
            + Add Term
          </button>
        </div>
        {notes.length === 0 && (
          <p className="text-xs text-slate-500">
            No key terms yet. Add words learners can tap and save.
          </p>
        )}
        {notes.map((n, idx) => (
          <div
            key={idx}
            className="grid gap-2 rounded-lg border border-orange-100 bg-orange-50/30 p-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              className={inputCls}
              placeholder="Term (e.g. photovoltaic)"
              value={n.term}
              onChange={(e) =>
                setNotes((prev) =>
                  prev.map((x, i) =>
                    i === idx ? { ...x, term: e.target.value } : x
                  )
                )
              }
            />
            <input
              className={inputCls}
              placeholder="Vietnamese meaning"
              value={n.meaning}
              onChange={(e) =>
                setNotes((prev) =>
                  prev.map((x, i) =>
                    i === idx ? { ...x, meaning: e.target.value } : x
                  )
                )
              }
            />
            <button
              type="button"
              onClick={() => setNotes((prev) => prev.filter((_, i) => i !== idx))}
              className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
            >
              Delete
            </button>
            <input
              className={`${inputCls} sm:col-span-3`}
              placeholder="Context sentence (should contain the term)"
              value={n.contextSentence}
              onChange={(e) =>
                setNotes((prev) =>
                  prev.map((x, i) =>
                    i === idx ? { ...x, contextSentence: e.target.value } : x
                  )
                )
              }
            />
          </div>
        ))}
      </div>

      {/* Mini-Quiz */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            ✅ Mini-Quiz Questions — {quiz.length}
          </p>
          <button
            type="button"
            onClick={() =>
              setQuiz((prev) => [
                ...prev,
                { question: "", options: ["", "", "", ""], correctIndex: 0 },
              ])
            }
            className="cursor-pointer rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100"
          >
            + Add Question
          </button>
        </div>
        {quiz.length === 0 && (
          <p className="text-xs text-slate-500">
            No quiz questions yet. Add 2–3 comprehension questions.
          </p>
        )}
        {quiz.map((q, qi) => (
          <div
            key={qi}
            className="flex flex-col gap-2 rounded-lg border border-emerald-100 bg-emerald-50/30 p-2"
          >
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder={`Question ${qi + 1}`}
                value={q.question}
                onChange={(e) =>
                  setQuiz((prev) =>
                    prev.map((x, i) =>
                      i === qi ? { ...x, question: e.target.value } : x
                    )
                  )
                }
              />
              <button
                type="button"
                onClick={() => setQuiz((prev) => prev.filter((_, i) => i !== qi))}
                className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`video-quiz-correct-${qi}`}
                    checked={q.correctIndex === oi}
                    onChange={() =>
                      setQuiz((prev) =>
                        prev.map((x, i) =>
                          i === qi ? { ...x, correctIndex: oi } : x
                        )
                      )
                    }
                    className="h-4 w-4 accent-emerald-600"
                    title="Mark as correct answer"
                  />
                  <input
                    className={inputCls}
                    placeholder={`Option ${oi + 1}${q.correctIndex === oi ? " (correct)" : ""}`}
                    value={opt}
                    onChange={(e) =>
                      setQuiz((prev) =>
                        prev.map((x, i) =>
                          i === qi
                            ? {
                                ...x,
                                options: x.options.map((o, j) =>
                                  j === oi ? e.target.value : o
                                ),
                              }
                            : x
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
