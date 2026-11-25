"use client";

import React from "react";
import Link from "next/link";
import { useGame } from "@/context/GameContext";

export default function ExploreWorldCard() {
  const { xp, usaCompleted } = useGame();

  return (
    <section
      className="dashboard-card dashboard-card--world"
      aria-labelledby="explore-world-heading"
    >
      <div className="dashboard-card-header">
        <div className="dashboard-card-title-group">
          <span className="dashboard-card-tag dashboard-card-tag--adventure">
            Gamified Adventure
          </span>
          <h2 id="explore-world-heading" className="dashboard-card-title">
            Explore the World
          </h2>
        </div>
        <div className="dashboard-game-xp-pill" aria-label={`Game progress: ${xp} XP earned`}>
          <span className="dashboard-game-xp-star" aria-hidden="true">⭐</span>
          <span className="dashboard-game-xp-val">{xp} XP</span>
        </div>
      </div>

      <p className="dashboard-card-description">
        Travel to English-speaking countries and practice real-world communication through interactive scenarios and cultural missions.
      </p>

      {/* Visual illustration banner */}
      <div className="dashboard-world-banner" aria-hidden="true">
        <div className="dashboard-world-banner-decor">
          <span className="world-banner-emoji world-banner-emoji--plane">✈️</span>
          <span className="world-banner-emoji world-banner-emoji--globe">🌍</span>
          <span className="world-banner-emoji world-banner-emoji--flag">🇺🇸</span>
        </div>
        <div className="dashboard-world-banner-info">
          <span className="dashboard-world-dest-label">Current Destination</span>
          <p className="dashboard-world-dest-name">United States — Renewable Energy</p>
          <span className="dashboard-world-dest-status">
            {usaCompleted ? "✅ Mission Completed" : "📍 Mission Ready"}
          </span>
        </div>
      </div>

      {/* Call to action */}
      <div className="dashboard-world-actions">
        <Link href="/world" className="btn-dashboard-explore">
          <span>Explore the World</span>
          <span aria-hidden="true" className="btn-explore-arrow">→</span>
        </Link>
      </div>
    </section>
  );
}
