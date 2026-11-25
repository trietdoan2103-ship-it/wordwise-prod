"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Lesson } from "@/types/curriculum";
import { renewableEnergyGlossary } from "@/data/lessons";
import FlashcardDeck from "./FlashcardDeck";
import LessonQuiz from "./LessonQuiz";
import { speak } from "@/lib/audio";
import type { ExtendedFlashcard } from "@/lib/curriculumStorage";

interface LessonReaderModalProps {
  lesson: Lesson;
  isCompleted: boolean;
  onToggleComplete: (lessonId: string) => void;
  onCompleteLesson?: (lessonId: string) => void;
  onClose: () => void;
}

type ReaderSubTab = "reading" | "flashcards" | "quiz";

interface ActiveTooltip {
  term: string;
  phonetic: string;
  meaningVi: string;
  example?: string;
  definition?: string;
  partOfSpeech?: string;
  x: number;
  y: number;
}

export default function LessonReaderModal({
  lesson,
  isCompleted,
  onToggleComplete,
  onCompleteLesson,
  onClose,
}: LessonReaderModalProps) {
  const isFlashcardDeck = lesson.lessonType === "flashcard";
  const [activeTab, setActiveTab] = useState<ReaderSubTab>(
    isFlashcardDeck ? "flashcards" : "reading"
  );
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const [isPronouncing, setIsPronouncing] = useState(false);

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Sync activeTab if lesson changes
  useEffect(() => {
    setActiveTab(lesson.lessonType === "flashcard" ? "flashcards" : "reading");
    setActiveTooltip(null);
  }, [lesson]);

  // Auto-focus on open
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (activeTooltip) {
          setActiveTooltip(null);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTooltip, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Dismiss tooltip on click outside or scroll
  useEffect(() => {
    function handleDismiss() {
      if (activeTooltip) setActiveTooltip(null);
    }
    const bodyEl = modalBodyRef.current;
    if (bodyEl) {
      bodyEl.addEventListener("scroll", handleDismiss, { passive: true });
    }
    return () => {
      if (bodyEl) {
        bodyEl.removeEventListener("scroll", handleDismiss);
      }
    };
  }, [activeTooltip]);

  // Build a lookup map of active interactive terms for this lesson
  const termsMap = React.useMemo(() => {
    const map = new Map<string, { term: string; phonetic: string; meaningVi: string; example?: string; definition?: string; partOfSpeech?: string }>();

    // 1. Add lesson-specific interactive flashcards first (managed in Admin Studio)
    lesson.flashcards.forEach((fcRaw) => {
      const fc = fcRaw as ExtendedFlashcard;
      map.set(fc.term.toLowerCase(), {
        term: fc.term,
        phonetic: fc.phonetic,
        meaningVi: fc.meaningVi,
        example: fc.example,
        definition: fc.definition,
        partOfSpeech: fc.partOfSpeech,
      });
    });

    // 2. Add any highlightedTerms configured on the reading passage (enriching with glossary data if needed)
    if (lesson.readingText.highlightedTerms) {
      lesson.readingText.highlightedTerms.forEach((ht) => {
        const key = ht.toLowerCase();
        if (!map.has(key)) {
          const allCards = [...lesson.flashcards, ...renewableEnergyGlossary];
          const match = allCards.find(
            (fc) =>
              key === fc.term.toLowerCase() ||
              key.includes(fc.term.toLowerCase()) ||
              fc.term.toLowerCase().includes(key)
          );
          if (match) {
            const extMatch = match as ExtendedFlashcard;
            map.set(key, {
              term: ht,
              phonetic: match.phonetic,
              meaningVi: match.meaningVi,
              example: match.example,
              definition: extMatch.definition,
              partOfSpeech: extMatch.partOfSpeech,
            });
          } else {
            map.set(key, {
              term: ht,
              phonetic: "/ˈtek.nɪ.kəl tɝːm/",
              meaningVi: "Thuật ngữ kỹ thuật năng lượng sạch",
            });
          }
        }
      });
    }

    return map;
  }, [lesson]);

  // List of terms to match in text
  const matchTerms = React.useMemo(() => {
    const terms = Array.from(termsMap.keys());
    // Sort by length descending so longer compound terms match first
    return terms.sort((a, b) => b.length - a.length);
  }, [termsMap]);

  function handleTermClick(e: React.MouseEvent, matchedKey: string) {
    e.stopPropagation();
    const data = termsMap.get(matchedKey.toLowerCase());
    if (!data) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveTooltip({
      term: data.term,
      phonetic: data.phonetic,
      meaningVi: data.meaningVi,
      example: data.example,
      definition: data.definition,
      partOfSpeech: data.partOfSpeech,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  function handleSpeakTerm(text: string) {
    setIsPronouncing(true);
    speak(text, () => {
      setIsPronouncing(false);
    });
  }

  /**
   * Parses paragraph text and wraps recognized technical terms with interactive buttons
   */
  function renderParagraphWithHighlights(text: string, pIndex: number) {
    if (matchTerms.length === 0) return <p key={pIndex} className="reader-paragraph">{text}</p>;

    // Build regex pattern matching any of the terms as whole words/phrases
    const escaped = matchTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const regex = new RegExp(`(${escaped})`, "gi");

    const parts = text.split(regex);

    return (
      <p key={pIndex} className="reader-paragraph">
        {parts.map((part, idx) => {
          const lower = part.toLowerCase();
          const isTerm = termsMap.has(lower);

          if (isTerm) {
            return (
              <button
                key={idx}
                type="button"
                className="reader-term-highlight"
                onClick={(e) => handleTermClick(e, lower)}
                title={`Tap to learn: ${part}`}
                aria-haspopup="dialog"
              >
                {part}
                <span className="reader-term-sparkle" aria-hidden="true">✦</span>
              </button>
            );
          }

          return <span key={idx}>{part}</span>;
        })}
      </p>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-50/95 backdrop-blur-md w-screen h-screen overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-lesson-title"
      onClick={() => {
        if (activeTooltip) setActiveTooltip(null);
      }}
    >
      {/* ── Sticky Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white border-b border-slate-200/80 px-4 md:px-6 py-3.5 shadow-xs shrink-0 gap-4">
        {/* Left: Back button & badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-slate-700 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-3 py-1.5 rounded-xl transition-colors border border-slate-200/80 hover:border-orange-200 cursor-pointer"
            title="Back to Learning Library"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Library</span>
          </button>
          <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-100/70 text-orange-800 border border-orange-200/60">
            {lesson.topic}
          </span>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
            {lesson.level}
          </span>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
            {isFlashcardDeck ? `🎴 ${lesson.flashcards.length} Cards` : `⏱️ ${lesson.readingTime}`}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Completed
            </span>
          )}
        </div>

        {/* Center / Right: Conditional Tab Switcher (Reading vs Flashcard Deck) & Close Button */}
        <div className="flex items-center gap-2 md:gap-3">
          {isFlashcardDeck ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-extrabold uppercase tracking-wider bg-orange-500 text-white shadow-xs">
              <span aria-hidden="true">🎴</span>
              <span>FLASHCARD DECK</span>
            </span>
          ) : (
            <nav
              className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80"
              aria-label="Lesson sections"
            >
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "reading"
                    ? "bg-orange-500 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
                onClick={() => {
                  setActiveTooltip(null);
                  setActiveTab("reading");
                }}
              >
                <span aria-hidden="true">📖</span>
                <span>Reading</span>
              </button>

              <button
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === "quiz"
                    ? "bg-orange-500 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                }`}
                onClick={() => {
                  setActiveTooltip(null);
                  setActiveTab("quiz");
                }}
              >
                <span aria-hidden="true">✏️</span>
                <span>Quick Quiz ({lesson.quiz.length})</span>
              </button>
            </nav>
          )}

          <button
            type="button"
            ref={closeBtnRef}
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200/60 hover:border-rose-200 transition-colors cursor-pointer text-base font-bold shrink-0"
            aria-label="Close lesson workspace"
            title="Close workspace"
          >
            ✕
          </button>
        </div>
      </header>

      {/* ── Spacious Main Content Canvas ── */}
      <main
        className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 md:py-10"
        ref={modalBodyRef}
      >
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
          {!isFlashcardDeck && activeTab === "reading" && (
            <div className="flex flex-col gap-6">
              {/* Lesson Title & Summary Header */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs">
                <div className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-100/70 text-orange-800 border border-orange-200/60 mb-3">
                  {lesson.topic}
                </div>
                <h1
                  id="reader-lesson-title"
                  className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3"
                >
                  {lesson.title}
                </h1>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                  {lesson.summary}
                </p>
              </div>

              {/* Interactive Learning Helper */}
              <div className="reader-reading-helper">
                <span aria-hidden="true" className="reader-helper-icon">💡</span>
                <span>
                  <strong>Interactive Learning:</strong> Tap or click any highlighted term (with ✦) to view its phonetic guide, Vietnamese translation, and audio pronunciation.
                </span>
              </div>

              {/* Article Paragraphs */}
              <article className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-10 shadow-xs flex flex-col gap-6 reader-prose-content">
                {lesson.readingText.paragraphs.map((p, idx) =>
                  renderParagraphWithHighlights(p, idx)
                )}
              </article>

              {/* Key Technical English Terms */}
              {lesson.readingText.highlightedTerms &&
                lesson.readingText.highlightedTerms.length > 0 && (
                  <div className="reader-terms-summary-card">
                    <h4 className="reader-terms-summary-title">
                      ⚡ Key Technical English Terms in This Lesson
                    </h4>
                    <div className="reader-terms-chip-list">
                      {lesson.readingText.highlightedTerms.map((term, i) => (
                        <button
                          key={i}
                          type="button"
                          className="reader-chip-btn"
                          onClick={(e) => handleTermClick(e, term.toLowerCase())}
                        >
                          <span aria-hidden="true">🔊</span>
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {isFlashcardDeck && (
            <div className="flex flex-col gap-6">
              {/* Deck Header */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs text-center">
                <div className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-800 border border-amber-300/70 mb-2">
                  🎴 Interactive 3D Flashcards • {lesson.topic}
                </div>
                <h1
                  id="reader-lesson-title"
                  className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2"
                >
                  {lesson.title}
                </h1>
                <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
                  {lesson.summary}
                </p>
              </div>

              <div className="w-full flex flex-col items-center justify-center py-2 min-h-[360px]">
                <FlashcardDeck
                  flashcards={lesson.flashcards}
                  lessonTopic={lesson.topic}
                />
              </div>
            </div>
          )}

          {!isFlashcardDeck && activeTab === "quiz" && (
            <div className="w-full py-2">
              <LessonQuiz
                lesson={lesson}
                isCompleted={isCompleted}
                onCompleteLesson={(id) => {
                  if (onCompleteLesson) {
                    onCompleteLesson(id);
                  } else {
                    onToggleComplete(id);
                  }
                }}
                onReviewReading={() => setActiveTab("reading")}
              />
            </div>
          )}
        </div>
      </main>

      {/* ── Fixed Tooltip Popover for Highlighted Terms ── */}
      {activeTooltip && (
        <div
          className="reader-tooltip-popover"
          style={{
            top: `${Math.max(80, activeTooltip.y - 12)}px`,
            left: `${activeTooltip.x}px`,
          }}
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="reader-tooltip-arrow" aria-hidden="true" />
          <div className="reader-tooltip-header">
            <div className="reader-tooltip-term-group">
              <strong className="reader-tooltip-term">{activeTooltip.term}</strong>
              <span className="reader-tooltip-phonetic">
                {activeTooltip.phonetic}
                {activeTooltip.partOfSpeech ? ` · ${activeTooltip.partOfSpeech}` : ""}
              </span>
            </div>
            <button
              type="button"
              className={`reader-tooltip-speaker-btn ${isPronouncing ? "reader-tooltip-speaker-btn--active" : ""}`}
              onClick={() => handleSpeakTerm(activeTooltip.term)}
              aria-label={`Pronounce ${activeTooltip.term}`}
              title="Play pronunciation"
            >
              <span aria-hidden="true">🔊</span>
            </button>
            <button
              type="button"
              className="reader-tooltip-close-btn"
              onClick={() => setActiveTooltip(null)}
              aria-label="Close term definition"
            >
              ✕
            </button>
          </div>

          <p className="reader-tooltip-meaning">{activeTooltip.meaningVi}</p>

          {activeTooltip.definition && (
            <p className="reader-tooltip-example">{activeTooltip.definition}</p>
          )}

          {activeTooltip.example && (
            <p className="reader-tooltip-example">
              <em>Ex:</em> &ldquo;{activeTooltip.example}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* ── Sticky Bottom Action Bar ── */}
      <footer className="sticky bottom-0 z-30 bg-white border-t border-slate-200/80 px-4 md:px-6 py-3.5 shadow-xs shrink-0">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Completion toggle */}
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border cursor-pointer ${
              isCompleted
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            }`}
            onClick={() => {
              if (!isCompleted && onCompleteLesson) {
                onCompleteLesson(lesson.id);
              } else {
                onToggleComplete(lesson.id);
              }
            }}
          >
            {isCompleted
              ? "✓ Completed (Click to Reset)"
              : isFlashcardDeck
              ? "Mark Deck as Completed ✓"
              : "Mark Lesson as Completed ✓"}
          </button>

          {/* Right: Contextual Next Step CTA & Close */}
          <div className="flex items-center gap-3">
            {!isFlashcardDeck && activeTab === "reading" && (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition-all cursor-pointer"
                onClick={() => setActiveTab("quiz")}
              >
                <span>Take Quick Quiz</span>
                <span aria-hidden="true">→</span>
              </button>
            )}

            {!isFlashcardDeck && activeTab === "quiz" && (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                onClick={() => setActiveTab("reading")}
              >
                <span>Review Reading</span>
              </button>
            )}

            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
