"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import { useSession } from "@/context/SessionContext";
import { countries as staticCountries } from "@/data/countries";
import {
  fetchWorldCountries,
  getCountryPassportSouvenir,
} from "@/lib/progress";
import type { Country } from "@/types/game";

interface PassportModalProps {
  onClose?: () => void;
  /** When true, renders inline inside a page (e.g. /dashboard/passport) instead of a fixed backdrop modal. */
  inline?: boolean;
}

/**
 * PassportModal — Interactive 2-Page Digital Wordwise Passport.
 *
 * Spread 1:
 *   - Left Page: Official Wordwise Explorer Identity + Diplomatic Stats + MRZ strip
 *   - Right Page: Country Visa Stamps Grid (Vintage Passport Stamps + Cultural Souvenir preview for every country)
 * Spread 2:
 *   - Left Page: Cultural Souvenirs Cabinet (Mini Solar Turbine Model, Offshore Wind Compass Emblem, etc.)
 *   - Right Page: Mission Competency Breakdown & Diplomatic Honors
 */
export default function PassportModal({
  onClose,
  inline = false,
}: PassportModalProps) {
  const {
    xp,
    usaCompleted,
    usaStampUnlocked,
    usaBadgeUnlocked,
    coffeeCupUnlocked,
    completedStages,
  } = useGame();
  const { session } = useSession();

  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [worldCountries, setWorldCountries] =
    useState<Country[]>(staticCountries);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    fetchWorldCountries().then((list) => {
      if (alive && list.length > 0) {
        setWorldCountries(list);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const explorerName = session?.displayName || "Wordwise Explorer";
  const mrzName = explorerName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "<")
    .padEnd(24, "<")
    .slice(0, 24);
  const mrzCode = `P<VNM<<<<${mrzName}`;

  const isUsaAdmitted = usaCompleted || usaStampUnlocked;
  const isBadgeEarned = usaCompleted || usaBadgeUnlocked;
  const isGiftEarned = usaCompleted || coffeeCupUnlocked;

  const isCountryCompleted = (countryId: string): boolean => {
    const cid = countryId.toLowerCase();
    if (cid === "usa" || cid === "us") {
      return isUsaAdmitted;
    }
    return completedStages.includes(`mission:${cid}`);
  };

  const stampedCount = worldCountries.filter((c) =>
    isCountryCompleted(c.id)
  ).length;
  const todayLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  const vocabDone = usaCompleted || completedStages.includes("vocabulary");
  const listeningDone = usaCompleted || completedStages.includes("listening");
  const sentenceDone =
    usaCompleted ||
    completedStages.includes("sentence") ||
    completedStages.includes("sentence_assembler");
  const circuitDone = completedStages.includes("circuit_repair");
  const runnerDone = completedStages.includes("tech_runner");
  const smasherDone = completedStages.includes("target_smasher");

  // Auto-focus close button on mount when modal
  useEffect(() => {
    if (!inline) {
      closeRef.current?.focus();
    }
  }, [inline]);

  // Keyboard navigation (Escape to close, ArrowLeft / ArrowRight to flip pages)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) onClose();
      if (e.key === "ArrowRight") setCurrentPage(2);
      if (e.key === "ArrowLeft") setCurrentPage(1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent background scrolling while open as a modal
  useEffect(() => {
    if (inline) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [inline]);

  const booklet = (
    <div className="relative max-w-4xl w-full min-h-[510px] bg-gradient-to-br from-[#1b2a4a] via-[#132038] to-[#0d172a] p-2.5 sm:p-4 rounded-3xl border-4 border-[#2b426b] shadow-[0_28px_70px_rgba(0,0,0,0.55)] flex flex-col justify-between select-none mx-auto my-auto">
      {/* Decorative Gold Stitching Around Cover Edge */}
      <div
        className="pointer-events-none absolute inset-1.5 rounded-[20px] border border-dashed border-amber-400/30"
        aria-hidden="true"
      />

      {/* ── Close (X) Button (when rendered as modal) ── */}
      {onClose && !inline && (
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close passport"
          title="Close passport (Esc)"
          className="absolute -top-3 -right-3 sm:top-2 sm:right-2 z-30 w-9 h-9 rounded-full bg-slate-900/90 hover:bg-rose-600 text-white border-2 border-amber-300/60 shadow-lg flex items-center justify-center text-sm font-bold transition-transform hover:scale-105 cursor-pointer"
        >
          ✕
        </button>
      )}

      {/* ── Inner Open Booklet (2-Page Spread) ── */}
      <div className="relative flex-1 w-full bg-[#fdfaf3] rounded-2xl overflow-hidden shadow-inner flex flex-col md:flex-row border border-stone-300">
        {/* Center Spine / Binding Crease (Desktop) */}
        <div
          className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 z-20 pointer-events-none bg-gradient-to-r from-transparent via-stone-900/20 to-transparent"
          aria-hidden="true"
        >
          <div className="h-full w-px mx-auto bg-stone-700/30" />
        </div>

        {currentPage === 1 ? (
          /* ══════════════════════════════════════════════════════════════════
             SPREAD 1: IDENTIFICATION (LEFT) & VISA STAMPS GRID (RIGHT)
             ══════════════════════════════════════════════════════════════════ */
          <>
            {/* ── LEFT PAGE: Passport Identity (Soft Cyan/Blue Theme) ── */}
            <div className="relative flex-1 bg-gradient-to-br from-sky-50 via-cyan-50/90 to-blue-100/80 p-5 sm:p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-sky-200/80 overflow-hidden">
              <div
                className="pointer-events-none absolute -right-6 top-12 text-8xl opacity-[0.07] select-none"
                aria-hidden="true"
              >
                🌐
              </div>

              <div>
                <div className="flex items-center justify-between border-b border-sky-300/80 pb-2.5 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">
                      🛂
                    </span>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-sky-700">
                        Republic of Wordwise
                      </p>
                      <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-900">
                        DIGITAL PASSPORT
                      </h2>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-200/70 text-sky-900 border border-sky-300">
                    TYPE: P • VNM
                  </span>
                </div>

                {/* Profile Details Row */}
                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-sky-200/90 shadow-xs mb-4">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex flex-col items-center justify-center text-white shadow-md border-2 border-white shrink-0">
                    <span className="text-2xl sm:text-3xl" aria-hidden="true">
                      🧑‍🎓
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider bg-slate-900/75 px-1.5 py-0.2 rounded-full mt-0.5">
                      {xp} XP
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                        Explorer Name / Họ tên
                      </p>
                      <p className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                        {explorerName}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Stamps Collected
                        </p>
                        <p className="text-xs font-extrabold text-orange-700">
                          {stampedCount} / {worldCountries.length} Countries
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </p>
                        <p className="text-xs font-bold text-emerald-700">
                          Active Diplomat
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Summary of Collected Cultural Souvenirs */}
                <div className="bg-white/85 border border-sky-200/90 rounded-2xl p-3.5 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
                      🎁 Cultural Souvenirs Vault
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(2)}
                      className="text-[11px] font-extrabold text-orange-600 hover:underline cursor-pointer"
                    >
                      Inspect All →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {worldCountries.map((c) => {
                      const unlocked = isCountryCompleted(c.id);
                      const souv = getCountryPassportSouvenir(c.id, c.name);
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs ${
                            unlocked
                              ? "border-amber-300 bg-amber-50/90 text-slate-900"
                              : "border-dashed border-slate-300 bg-slate-50/70 text-slate-400"
                          }`}
                        >
                          <span className="text-lg" aria-hidden="true">
                            {unlocked ? souv.souvenirIcon : "🔒"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-extrabold leading-tight">
                              {souv.souvenirName}
                            </p>
                            <p className="truncate text-[10px] font-semibold">
                              {unlocked ? `${c.name} • Unlocked` : `${c.name} • Locked`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Machine-Readable Passport Code Strip (MRZ) */}
              <div className="mt-2 pt-2.5 border-t border-sky-200/90 bg-white/90 rounded-lg px-3 py-2 font-mono text-[10px] sm:text-[11px] tracking-[0.14em] text-slate-700 leading-tight overflow-hidden">
                <p className="truncate font-bold">{mrzCode}</p>
                <p className="truncate text-slate-500">
                  WW202601VNM0000001M3012315{"<<<<<<<<<<<<<<"}04
                </p>
              </div>
            </div>

            {/* ── RIGHT PAGE: Cream/Paper Textured Country Visa Stamps Grid ── */}
            <div className="relative flex-1 bg-[#fdfaf3] p-5 sm:p-7 flex flex-col justify-between">
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-9xl opacity-[0.04]"
                aria-hidden="true"
              >
                🧭
              </div>

              <div>
                <div className="flex items-center justify-between border-b border-amber-900/15 pb-2.5 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/70">
                      Immigration Control
                    </p>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-stone-800">
                      COUNTRY STAMPS &amp; VISAS
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-stone-500">
                    PAGE 01
                  </span>
                </div>

                {/* Dynamic Country Stamp Slots Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-1">
                  {worldCountries.map((c, idx) => {
                    const admitted = isCountryCompleted(c.id);
                    const souv = getCountryPassportSouvenir(c.id, c.name);
                    const tiltCls =
                      idx % 2 === 0 ? "-rotate-2" : "rotate-2";

                    return (
                      <div
                        key={c.id}
                        className="flex flex-col justify-between min-h-[195px] rounded-2xl border border-stone-200/90 bg-amber-50/35 p-3"
                      >
                        {admitted ? (
                          <>
                            <div
                              className={`relative w-full ${tiltCls} border-[3px] border-rose-700 rounded-2xl p-2.5 text-rose-800 bg-rose-50/50 shadow-xs`}
                              aria-label={`${c.name} Visa Stamp Unlocked`}
                            >
                              <div className="border border-dashed border-rose-600/80 rounded-xl p-2 flex flex-col items-center text-center">
                                <div className="flex items-center gap-1 text-[9px] font-black tracking-[0.16em] uppercase text-rose-700">
                                  <span>✈️</span>
                                  <span>{souv.stampCode}</span>
                                </div>
                                <div className="my-0.5 text-2xl">{c.flag}</div>
                                <p className="text-xs font-black tracking-wider uppercase text-rose-900 leading-tight">
                                  ADMITTED • {c.name.toUpperCase()}
                                </p>
                                <p className="text-[9px] font-extrabold tracking-widest uppercase text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded mt-1 border border-teal-300">
                                  {c.missionTitle?.toUpperCase() ||
                                    souv.missionLabel}
                                </p>
                                <p className="text-[9px] font-mono font-bold text-rose-700/85 mt-1">
                                  {todayLabel} • VERIFIED ★
                                </p>
                              </div>
                            </div>

                            {/* Unlocked Cultural Souvenir Pill */}
                            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-1.5">
                              <span className="text-base" aria-hidden="true">
                                {souv.souvenirIcon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[11px] font-extrabold text-amber-950">
                                  {souv.souvenirName}
                                </p>
                                <p className="truncate text-[9px] font-bold text-emerald-700">
                                  ✓ Cultural Souvenir Unlocked
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-1 flex-col items-center justify-between rounded-xl border-2 border-dashed border-stone-300/90 p-3 text-center text-stone-400">
                            <div className="flex flex-col items-center">
                              <span
                                className="text-2xl mb-1 opacity-60"
                                aria-hidden="true"
                              >
                                {c.flag}
                              </span>
                              <p className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
                                {c.name}
                              </p>
                              <p className="text-[10px] font-medium text-stone-400 mt-0.5">
                                Complete {c.name} core modules to collect stamp &amp;{" "}
                                <strong className="text-stone-500">
                                  {souv.souvenirName}
                                </strong>
                              </p>
                            </div>

                            {c.unlocked ? (
                              <Link
                                href={`/mission/${c.id}`}
                                onClick={onClose}
                                className="mt-2 inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-[11px] font-extrabold text-orange-700 hover:bg-orange-100"
                              >
                                Explore Hub →
                              </Link>
                            ) : (
                              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-stone-200/70 px-2.5 py-0.5 text-[10px] font-bold text-stone-500">
                                🔒 Locked on World Map
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom-Right Flip Prompt */}
              <div className="mt-4 pt-3 border-t border-amber-900/10 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500">
                  {stampedCount} of {worldCountries.length} Country Stamps Collected
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600 hover:text-orange-700 bg-orange-100/80 px-3 py-1.5 rounded-full border border-orange-200 cursor-pointer"
                >
                  <span>Souvenirs &amp; Competency</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             SPREAD 2: CULTURAL SOUVENIR CARDS (LEFT) & COMPETENCY/HONORS (RIGHT)
             ══════════════════════════════════════════════════════════════════ */
          <>
            {/* ── LEFT PAGE: Cultural Souvenirs Cabinet ── */}
            <div className="relative flex-1 bg-[#fdfaf3] p-5 sm:p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-300/90">
              <div>
                <div className="flex items-center justify-between border-b border-amber-900/15 pb-2.5 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">
                      🎁
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800/70">
                        Global Keepsakes
                      </p>
                      <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-stone-900">
                        CULTURAL SOUVENIRS
                      </h2>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-stone-500">
                    PAGE 02
                  </span>
                </div>

                {/* Souvenir Cards per Country */}
                <div className="flex flex-col gap-3">
                  {worldCountries.map((c) => {
                    const unlocked =
                      c.id.toLowerCase() === "usa"
                        ? isGiftEarned
                        : isCountryCompleted(c.id);
                    const souv = getCountryPassportSouvenir(c.id, c.name);
                    return (
                      <div
                        key={c.id}
                        className={`flex items-start gap-3.5 rounded-2xl border-2 p-3.5 transition-all ${
                          unlocked
                            ? "border-amber-400 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white shadow-xs"
                            : "border-dashed border-stone-300 bg-stone-100/60 opacity-80"
                        }`}
                      >
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white text-3xl shadow-sm ${
                            unlocked
                              ? "bg-gradient-to-br from-orange-400 to-amber-500"
                              : "bg-stone-200 text-stone-400"
                          }`}
                        >
                          <span aria-hidden="true">
                            {unlocked ? souv.souvenirIcon : "🔒"}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                              {c.flag} {c.name}
                            </span>
                            {unlocked ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                ✓ Collected
                              </span>
                            ) : (
                              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                Locked Souvenir
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1 text-sm font-black text-slate-900">
                            {souv.souvenirName}
                          </h4>
                          <p className="mt-0.5 text-xs text-slate-600 leading-snug">
                            {souv.souvenirDescription}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-900/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600 hover:text-orange-700 bg-orange-100/80 px-3 py-1.5 rounded-full border border-orange-200 cursor-pointer"
                >
                  <span aria-hidden="true">←</span>
                  <span>Back to Visa Stamps</span>
                </button>
                <span className="text-[11px] font-semibold text-stone-500">
                  Spread 2 of 2
                </span>
              </div>
            </div>

            {/* ── RIGHT PAGE: Competency Breakdown & Honors ── */}
            <div className="relative flex-1 bg-gradient-to-br from-[#fdfaf3] via-amber-50/40 to-orange-50/30 p-5 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-amber-900/15 pb-2.5 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/70">
                      Diplomatic Honors
                    </p>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-stone-900">
                      HUB COMPETENCY RECORD
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                    {isBadgeEarned ? "🏅 USA Explorer" : "In Progress"}
                  </span>
                </div>

                {/* Module Competency List */}
                <div className="space-y-2 mb-4">
                  {[
                    { icon: "📖", label: "Vocabulary Module", done: vocabDone },
                    { icon: "🎧", label: "Listening Practice", done: listeningDone },
                    { icon: "🧩", label: "Sentence Assembler", done: sentenceDone },
                    { icon: "🔌", label: "Circuit Repair", done: circuitDone },
                    { icon: "🏃", label: "Tech Runner", done: runnerDone },
                    { icon: "🎯", label: "Target Smasher", done: smasherDone },
                  ].map((mod) => (
                    <div
                      key={mod.label}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-stone-200/90 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">
                          {mod.icon}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {mod.label}
                        </span>
                      </div>
                      {mod.done ? (
                        <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          Mastered ✓
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-stone-400">
                          Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Experience Live XP Card */}
                <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-4 text-white shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl border border-white/40">
                      <span aria-hidden="true">⭐</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-orange-100">
                        Total Experience Earned
                      </p>
                      <p className="text-lg sm:text-xl font-black tracking-tight">
                        +{xp} XP
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider bg-white text-orange-700 px-3 py-1 rounded-full shadow-xs">
                    Active Explorer
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-900/10 flex items-center justify-between text-xs text-stone-500">
                <span>Official Wordwise Diplomatic Registry</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="font-bold text-stone-700 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  ← Page 1
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom Booklet Pagination Controls ── */}
      <div className="mt-2.5 flex items-center justify-between px-2 text-xs text-amber-100/90">
        <button
          type="button"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition ${
            currentPage === 1
              ? "opacity-40 cursor-not-allowed"
              : "bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          }`}
        >
          <span aria-hidden="true">←</span>
          <span>Spread 1: Identity &amp; Stamps</span>
        </button>

        <div className="flex items-center gap-2" role="tablist" aria-label="Passport spreads">
          <button
            type="button"
            role="tab"
            aria-selected={currentPage === 1}
            aria-label="Spread 1: Identity and Visa Stamps"
            onClick={() => setCurrentPage(1)}
            className={`h-2.5 rounded-full transition-all cursor-pointer ${
              currentPage === 1 ? "w-7 bg-amber-400" : "w-2.5 bg-white/30 hover:bg-white/50"
            }`}
          />
          <button
            type="button"
            role="tab"
            aria-selected={currentPage === 2}
            aria-label="Spread 2: Cultural Souvenirs and Competency"
            onClick={() => setCurrentPage(2)}
            className={`h-2.5 rounded-full transition-all cursor-pointer ${
              currentPage === 2 ? "w-7 bg-amber-400" : "w-2.5 bg-white/30 hover:bg-white/50"
            }`}
          />
        </div>

        <button
          type="button"
          onClick={() => setCurrentPage(2)}
          disabled={currentPage === 2}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition ${
            currentPage === 2
              ? "opacity-40 cursor-not-allowed"
              : "bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          }`}
        >
          <span>Spread 2: Souvenirs &amp; Honors</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );

  if (inline) {
    return booklet;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-label="Wordwise Digital Passport"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {booklet}
    </div>
  );
}
