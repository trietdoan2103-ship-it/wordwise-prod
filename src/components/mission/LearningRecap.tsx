"use client";

import type { MissionLearningRecap } from "@/types/game";

interface LearningRecapProps {
  recap: MissionLearningRecap;
  onContinue: () => void;
}

/**
 * LearningRecap — summary screen shown after all learning stages are complete
 * and before the Completion Ceremony.
 *
 * Responsibilities:
 * - Celebrate what the learner accomplished
 * - Show a clear per-stage outcome
 * - Highlight the key English sentence they can now say
 * - Offer "Claim Your Rewards →" CTA that fires onContinue()
 *
 * This component has no XP, no stage completion, and no GameContext interaction.
 * It is a pure presentation layer.
 */
export default function LearningRecap({
  recap,
  onContinue,
}: LearningRecapProps) {
  return (
    <div className="recap-shell">
      {/* ── Header ── */}
      <div className="recap-header">
        <span className="recap-header-icon" aria-hidden="true">🌟</span>
        <div>
          <p className="recap-eyebrow">MISSION COMPLETE</p>
          <h2 className="recap-title">What You Learned</h2>
        </div>
      </div>

      {/* ── Stage outcomes ── */}
      <ul className="recap-stages" aria-label="Learning outcomes">
        {recap.stages.map((stage, i) => (
          <li key={i} className="recap-stage">
            <span className="recap-stage-icon" aria-hidden="true">
              {stage.icon}
            </span>
            <div className="recap-stage-body">
              <p className="recap-stage-label">{stage.label}</p>
              <p className="recap-stage-summary">{stage.summary}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Communication takeaway ── */}
      <div className="recap-takeaway" aria-label="Key phrase learned">
        <p className="recap-takeaway-label">You can now say:</p>
        <blockquote className="recap-takeaway-quote">
          &ldquo;{recap.communicationTakeaway}&rdquo;
        </blockquote>
      </div>

      {/* ── CTA ── */}
      <button
        type="button"
        className="btn-stage-continue recap-cta"
        onClick={onContinue}
      >
        Claim Your Rewards →
      </button>
    </div>
  );
}
