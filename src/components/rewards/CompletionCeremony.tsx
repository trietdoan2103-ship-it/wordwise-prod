"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { useGame } from "@/context/GameContext";
import { getMissionById } from "@/data/missions";
import {
  fetchMissionByCountry,
  getStaticMissionBundle,
} from "@/lib/progress";
import type { Mission } from "@/types/game";
import PassportModal from "@/components/passport/PassportModal";
import RewardCard from "./RewardCard";

interface CompletionCeremonyProps {
  countryId?: string;
}

/**
 * CompletionCeremony — the celebratory end-of-mission screen.
 *
 * Hydrates country & mission reward data from Supabase (`public.missions`)
 * with an instant static fallback, awards the mission-completion bonus
 * (+30 XP) idempotently, and persists progress to Supabase via GameContext.
 */
export default function CompletionCeremony({
  countryId = "usa",
}: CompletionCeremonyProps) {
  const router = useRouter();
  const { completeMission } = useGame();
  const hasTriggered = useRef(false);

  const normalizedCountryId = countryId.toLowerCase();
  const staticBundle = getStaticMissionBundle(normalizedCountryId);

  const [mission, setMission] = useState<Mission | undefined>(
    () => staticBundle?.mission ?? getMissionById("renewable-energy")
  );
  const [countryName, setCountryName] = useState<string>(
    staticBundle?.countryName ?? "USA"
  );
  const [countryFlag, setCountryFlag] = useState<string>(
    staticBundle?.countryFlag ?? "🇺🇸"
  );
  const [passportOpen, setPassportOpen] = useState(false);

  // Hydrate mission reward metadata from Supabase
  useEffect(() => {
    let isMounted = true;
    fetchMissionByCountry(normalizedCountryId).then((bundle) => {
      if (isMounted && bundle) {
        setMission(bundle.mission);
        setCountryName(bundle.countryName);
        setCountryFlag(bundle.countryFlag);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [normalizedCountryId]);

  // ── Award mission completion (idempotent via GameContext guard) ──────────
  useEffect(() => {
    if (!hasTriggered.current && mission) {
      hasTriggered.current = true;
      completeMission(mission.id);
    }
  }, [completeMission, mission]);

  // ── Confetti celebration ────────────────────────────────────────────────
  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.55 },
      zIndex: 9999,
    });

    const sideTimer = setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        zIndex: 9999,
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        zIndex: 9999,
      });
    }, 350);

    return () => clearTimeout(sideTimer);
  }, []);

  if (!mission) return null;

  const { reward } = mission;

  return (
    <div className="ceremony-page">
      {/* Background gradient */}
      <div className="ceremony-bg" aria-hidden="true" />

      <div className="ceremony-content">
        {/* ── Header ── */}
        <header
          className="ceremony-header"
          style={{ animationDelay: "0ms" }}
        >
          <span className="ceremony-flag" aria-hidden="true">
            {countryFlag}
          </span>
          <p className="ceremony-country">{countryName}</p>
          <h1 className="ceremony-title">Mission Complete!</h1>
          <p className="ceremony-subtitle">☀️ {mission.title}</p>
        </header>

        {/* ── XP bonus ── */}
        <div
          className="ceremony-xp-badge"
          style={{ animationDelay: "300ms" }}
          aria-label={`Plus ${reward.bonusXP} experience points`}
        >
          ⭐ +{reward.bonusXP} XP
        </div>

        {/* ── Completed stages checklist ── */}
        <div
          className="ceremony-checklist"
          style={{ animationDelay: "550ms" }}
        >
          <p className="checklist-label">You completed:</p>
          {mission.stages.map((stage) => (
            <div key={stage.id} className="checklist-item">
              <span className="checklist-check" aria-hidden="true">
                ✓
              </span>
              <span>{stage.title}</span>
            </div>
          ))}
        </div>

        {/* ── Reward cards ── */}
        <div
          className="ceremony-rewards-section"
          style={{ animationDelay: "800ms" }}
        >
          <h2 className="rewards-heading">Rewards Unlocked</h2>
          <div className="ceremony-rewards-grid">
            <RewardCard
              icon={reward.stamp.icon}
              title={reward.stamp.name}
              subtitle="Visa Stamp"
              delay={900}
            />
            <RewardCard
              icon={reward.badge.icon}
              title={reward.badge.name}
              subtitle="Badge Unlocked"
              delay={1100}
            />
            <RewardCard
              icon={reward.gift.icon}
              title={reward.gift.name}
              subtitle="Cultural Gift"
              delay={1300}
            />
          </div>
        </div>

        {/* ── Passport & Continue Journey CTAs ── */}
        <div
          className="flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "1500ms" }}
        >
          <button
            type="button"
            onClick={() => setPassportOpen(true)}
            className="rounded-2xl border-2 border-amber-300 bg-white/95 px-5 py-3 text-sm font-extrabold text-orange-800 shadow-md transition hover:bg-amber-50 cursor-pointer"
          >
            🛂 Inspect My Passport &amp; Souvenirs
          </button>
          <button
            type="button"
            className="btn-ceremony-continue"
            onClick={() => router.push("/world")}
          >
            Continue Journey →
          </button>
        </div>
      </div>
      {passportOpen && (
        <PassportModal onClose={() => setPassportOpen(false)} />
      )}
    </div>
  );
}
