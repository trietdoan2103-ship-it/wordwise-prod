"use client";

import { useState } from "react";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import PassportModal from "@/components/passport/PassportModal";

/**
 * Topbar — displayed on the World Map screen.
 *
 * Contains:
 * - Wordwise logo / wordmark
 * - XP counter (live from GameContext)
 * - Passport button (opens PassportModal — Milestone 8)
 */
export default function Topbar() {
  const { xp } = useGame();
  const [passportOpen, setPassportOpen] = useState(false);

  return (
    <>
      <header className="wordwise-topbar">
        {/* ── Left Navigation: Logo & Return to Dashboard ── */}
        <div className="topbar-logo flex items-center gap-3 md:gap-4">
          <Link
            href="/dashboard"
            className="topbar-logo-link hover:scale-105 transition-transform"
            title="Back to Dashboard"
            aria-label="Wordwise — Back to Dashboard"
          >
            <img
              src="/images/wordwise-mascot.png"
              alt="Wordwise"
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/80 bg-white/90 px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700"
          >
            <span aria-hidden="true">←</span>
            <span>Dashboard</span>
          </Link>
        </div>

        {/* ── Right controls ── */}
        <nav className="topbar-controls" aria-label="Game controls">
          {/* XP counter */}
          <div className="xp-badge" aria-label={`${xp} XP`}>
            <span className="xp-star" aria-hidden="true">
              ⭐
            </span>
            <span className="xp-value">{xp} XP</span>
          </div>

          {/* Passport — Milestone 8 */}
          <button
            type="button"
            className="btn-passport btn-passport-active"
            aria-label="Open your passport"
            title="View your travel passport"
            onClick={() => setPassportOpen(true)}
          >
            <span aria-hidden="true">📘</span>
            <span>Passport</span>
          </button>
        </nav>
      </header>

      {/* Passport Modal (portal-free, rendered in-tree; z-index handles layering) */}
      {passportOpen && (
        <PassportModal onClose={() => setPassportOpen(false)} />
      )}
    </>
  );
}
