"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useGame } from "@/context/GameContext";
import {
  VIDEO_QUIZ_XP,
  getCompletedVideoIds,
  markVideoCompleted,
} from "@/data/videos";
import {
  getSavedTermSet,
  removeWordFromBank,
  saveWordToBank,
} from "@/lib/wordBank";
import type { DbVideo } from "@/types/database";

interface VideoImmersionPanelProps {
  video: DbVideo;
  onCompleted?: (videoId: string) => void;
}

type PanelTab = "terms" | "quiz";

/** Highlights `term` inside `sentence` (case-insensitive). */
function HighlightedSentence({
  sentence,
  term,
}: {
  sentence: string;
  term: string;
}) {
  const idx = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (!term || idx < 0) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, idx)}
      <mark className="rounded bg-amber-300/30 px-0.5 font-extrabold text-amber-200">
        {sentence.slice(idx, idx + term.length)}
      </mark>
      {sentence.slice(idx + term.length)}
    </>
  );
}

export default function VideoImmersionPanel({
  video,
  onCompleted,
}: VideoImmersionPanelProps) {
  const { session } = useSession();
  const { addXP } = useGame();

  const notes = video.transcript_notes || [];
  const quiz = video.quiz_questions || [];

  const [tab, setTab] = useState<PanelTab>("terms");
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [checked, setChecked] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [awarded, setAwarded] = useState(false);

  // Reset state whenever a different video is opened
  useEffect(() => {
    setTab("terms");
    setSelectedTerm(null);
    setSaved(getSavedTermSet());
    setAnswers(new Array(quiz.length).fill(null));
    setChecked(false);
    setAwarded(false);
    setAlreadyDone(getCompletedVideoIds().includes(video.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  const selected = notes.find((n) => n.term === selectedTerm) || null;
  const isSaved = (term: string) => saved.has(term.trim().toLowerCase());

  async function toggleSave(term: string, meaning: string) {
    const key = term.trim().toLowerCase();
    if (saved.has(key)) {
      setSaved((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      await removeWordFromBank(session?.id, term);
    } else {
      setSaved((prev) => new Set(prev).add(key));
      await saveWordToBank(session?.id, term, meaning, video.title);
    }
  }

  const answeredAll =
    quiz.length > 0 && answers.length === quiz.length && answers.every((a) => a !== null);
  const correctCount = quiz.filter(
    (q, i) => answers[i] === q.correctIndex
  ).length;

  function submitQuiz() {
    if (!answeredAll) return;
    setChecked(true);
    if (!alreadyDone && !awarded) {
      addXP(VIDEO_QUIZ_XP);
      markVideoCompleted(video.id);
      setAwarded(true);
      setAlreadyDone(true);
      onCompleted?.(video.id);
    }
  }

  function retryQuiz() {
    setAnswers(new Array(quiz.length).fill(null));
    setChecked(false);
  }

  const tabBtn = (id: PanelTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-extrabold transition ${
        tab === id
          ? "bg-orange-500 text-white"
          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-900 px-5 pb-5 pt-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {tabBtn("terms", `📝 Key Terms & Immersion Notes (${notes.length})`)}
        {tabBtn("quiz", `✅ Quick Comprehension Check (${quiz.length})`)}
        {alreadyDone && (
          <span className="ml-auto rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-300">
            ✓ Completed
          </span>
        )}
      </div>

      {/* ── Tab 1: Key Terms ── */}
      {tab === "terms" && (
        <div className="flex flex-col gap-3">
          {notes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-3 text-sm text-slate-400">
              No key terms have been added for this video yet.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                Tap a term to see its Vietnamese meaning, then save it to your
                Word Bank.
              </p>
              <div className="flex flex-wrap gap-2">
                {notes.map((n) => {
                  const active = selectedTerm === n.term;
                  return (
                    <button
                      key={n.term}
                      type="button"
                      onClick={() =>
                        setSelectedTerm(active ? null : n.term)
                      }
                      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
                        active
                          ? "border-orange-400 bg-orange-500/25 text-orange-200"
                          : "border-slate-600 bg-slate-800 text-slate-100 hover:border-orange-400/70"
                      }`}
                    >
                      {isSaved(n.term) && (
                        <span className="mr-1 text-emerald-400">✓</span>
                      )}
                      {n.term}
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="rounded-2xl border border-orange-400/30 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-extrabold text-white">
                        {selected.term}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-amber-200">
                        🇻🇳 {selected.meaning}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSave(selected.term, selected.meaning)}
                      className={`cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-extrabold transition ${
                        isSaved(selected.term)
                          ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                          : "border-orange-400/60 bg-orange-500 text-white hover:bg-orange-600"
                      }`}
                    >
                      {isSaved(selected.term)
                        ? "✓ Saved"
                        : "+ Save to Word Bank"}
                    </button>
                  </div>
                  {selected.contextSentence && (
                    <p className="mt-2.5 rounded-xl bg-slate-900 px-3 py-2 text-sm italic leading-relaxed text-slate-300">
                      “
                      <HighlightedSentence
                        sentence={selected.contextSentence}
                        term={selected.term}
                      />
                      ”
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab 2: Quiz ── */}
      {tab === "quiz" && (
        <div className="flex flex-col gap-4">
          {quiz.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-3 text-sm text-slate-400">
              No comprehension questions have been added for this video yet.
            </p>
          ) : (
            <>
              {quiz.map((q, qi) => (
                <div
                  key={qi}
                  className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
                >
                  <p className="mb-2.5 text-sm font-extrabold text-white">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oi) => {
                      const picked = answers[qi] === oi;
                      const isRight = q.correctIndex === oi;
                      let cls =
                        "border-slate-600 bg-slate-800 text-slate-100 hover:border-orange-400/70";
                      if (checked) {
                        if (isRight)
                          cls =
                            "border-emerald-400 bg-emerald-500/20 text-emerald-200";
                        else if (picked)
                          cls = "border-rose-400 bg-rose-500/20 text-rose-200";
                        else cls = "border-slate-700 bg-slate-900 text-slate-500";
                      } else if (picked) {
                        cls =
                          "border-orange-400 bg-orange-500/25 text-orange-100";
                      }
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={checked}
                          onClick={() =>
                            setAnswers((prev) => {
                              const next = [...prev];
                              next[qi] = oi;
                              return next;
                            })
                          }
                          className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {checked ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                  <p className="text-sm font-extrabold text-emerald-200">
                    You got {correctCount} / {quiz.length} correct.{" "}
                    {awarded
                      ? `🎉 +${VIDEO_QUIZ_XP} XP earned — video completed!`
                      : "Video already completed — no extra XP."}
                  </p>
                  <button
                    type="button"
                    onClick={retryQuiz}
                    className="cursor-pointer rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                  >
                    Try Again ↺
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    Finish the quiz to earn +{VIDEO_QUIZ_XP} XP
                    {alreadyDone ? " (already earned)" : ""}.
                  </span>
                  <button
                    type="button"
                    disabled={!answeredAll}
                    onClick={submitQuiz}
                    className="cursor-pointer rounded-xl bg-orange-500 px-5 py-2 text-sm font-extrabold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Check Answers
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
