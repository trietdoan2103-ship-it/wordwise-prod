"use client";

import type { MissionBriefing as MissionBriefingData } from "@/types/game";

interface MissionBriefingProps {
  missionTitle: string;
  briefing: MissionBriefingData;
  onStart: () => void;
}

/**
 * MissionBriefing — full-screen context screen shown before learning stages begin.
 *
 * Responsibilities:
 * - Display the real-world scenario location and description
 * - Show the three learning objectives
 * - Offer a "Start Mission" CTA that fires onStart()
 *
 * This component has no XP, no stage completion, and no GameContext interaction.
 * It is a pure presentation layer.
 */
export default function MissionBriefing({
  missionTitle,
  briefing,
  onStart,
}: MissionBriefingProps) {
  return (
    <div className="briefing-shell">
      {/* ── Label ── */}
      <p className="briefing-eyebrow">MISSION BRIEFING</p>

      {/* ── Location ── */}
      <p className="briefing-location">{briefing.location}</p>

      {/* ── Mission title ── */}
      <h2 className="briefing-title">{missionTitle}</h2>

      {/* ── Scenario ── */}
      <p className="briefing-scenario">{briefing.scenario}</p>

      {/* ── Objectives ── */}
      <ul className="briefing-objectives" aria-label="Mission objectives">
        {briefing.objectives.map((obj, i) => (
          <li key={i} className="briefing-objective">
            <span className="briefing-objective-icon" aria-hidden="true">
              {obj.icon}
            </span>
            <span className="briefing-objective-text">{obj.text}</span>
          </li>
        ))}
      </ul>

      {/* ── CTA ── */}
      <button
        type="button"
        onClick={onStart}
        className="briefing-cta-btn bg-orange-500 hover:bg-orange-600 text-white"
      >
        Start Mission →
      </button>
    </div>
  );
}
