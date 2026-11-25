"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import { useGame } from "@/context/GameContext";
import DashboardSidebar from "./DashboardSidebar";
import {
  fetchCompletedLessonIds,
  fetchCurriculumLessons,
  getCurriculumProgress,
} from "@/lib/curriculumStorage";
import { fetchUserStreak, getStreak, type StreakData } from "@/lib/streak";
import {
  calculateAchievements,
  fetchUserAchievements,
} from "@/lib/achievements";
import { renewableEnergyLessons } from "@/data/lessons";
import type { Lesson } from "@/types/curriculum";

type FilterTab = "all" | "unlocked" | "locked";

export default function AchievementsView() {
  const { session } = useSession();
  const game = useGame();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [lessons, setLessons] = useState<Lesson[]>(renewableEnergyLessons);
  const [curriculumCompletedIds, setCurriculumCompletedIds] = useState<string[]>([]);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 1,
    lastActiveDate: "",
    freezeCount: 1,
  });
  const [timestampsVersion, setTimestampsVersion] = useState(0);

  // Hydrate live state from Supabase on mount and listen to updates
  useEffect(() => {
    let isMounted = true;
    setCurriculumCompletedIds(getCurriculumProgress());
    setStreakData(getStreak());

    async function hydrateAchievementsFromSupabase() {
      const [fetchedLessons, fetchedCompletedIds, fetchedStreak] =
        await Promise.all([
          fetchCurriculumLessons(),
          fetchCompletedLessonIds(),
          fetchUserStreak(),
          session?.id
            ? fetchUserAchievements(session.id)
            : Promise.resolve({}),
        ]);

      if (!isMounted) return;
      setLessons(fetchedLessons);
      setCurriculumCompletedIds(fetchedCompletedIds);
      setStreakData(fetchedStreak);
      setTimestampsVersion((v) => v + 1);
    }

    hydrateAchievementsFromSupabase();

    function handleCurriculumUpdate() {
      setCurriculumCompletedIds(getCurriculumProgress());
    }

    function handleStreakUpdate(e: Event) {
      const customEvent = e as CustomEvent<StreakData>;
      if (customEvent.detail) {
        setStreakData(customEvent.detail);
      } else {
        setStreakData(getStreak());
      }
    }

    function handleAchievementsUpdate() {
      setTimestampsVersion((v) => v + 1);
    }

    function handleStorage() {
      setCurriculumCompletedIds(getCurriculumProgress());
      setStreakData(getStreak());
      setTimestampsVersion((v) => v + 1);
    }

    window.addEventListener("wordwise_curriculum_updated", handleCurriculumUpdate);
    window.addEventListener("wordwise_streak_updated", handleStreakUpdate);
    window.addEventListener("wordwise_achievements_updated", handleAchievementsUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("wordwise_curriculum_updated", handleCurriculumUpdate);
      window.removeEventListener("wordwise_streak_updated", handleStreakUpdate);
      window.removeEventListener("wordwise_achievements_updated", handleAchievementsUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session?.id]);

  const displayName = session?.displayName || "Explorer";

  // Re-calculate badges reactively based on live state
  const achievements = useMemo(() => {
    void timestampsVersion;
    return calculateAchievements(
      curriculumCompletedIds,
      {
        xp: game.xp,
        usaCompleted: game.usaCompleted,
        usaStampUnlocked: game.usaStampUnlocked,
        usaBadgeUnlocked: game.usaBadgeUnlocked,
        coffeeCupUnlocked: game.coffeeCupUnlocked,
        completedStages: game.completedStages,
      },
      streakData,
      lessons
    );
  }, [curriculumCompletedIds, game, streakData, lessons, timestampsVersion]);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;

  // Filtered badges
  const filteredAchievements = achievements.filter((badge) => {
    if (activeFilter === "unlocked") return badge.isUnlocked;
    if (activeFilter === "locked") return !badge.isUnlocked;
    return true;
  });

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="dashboard-container">
      {/* ── Sidebar Navigation ── */}
      <DashboardSidebar
        currentSection="achievements"
        isOpenOnMobile={mobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      {/* ── Main Area ── */}
      <div className="dashboard-main-wrapper">
        {/* Mobile Header */}
        <header className="dashboard-mobile-header" aria-label="Mobile navigation bar">
          <button
            type="button"
            className="dashboard-menu-toggle-btn"
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-sidebar"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <span className="dashboard-menu-bar" aria-hidden="true" />
            <span className="dashboard-menu-bar" aria-hidden="true" />
            <span className="dashboard-menu-bar" aria-hidden="true" />
          </button>

          <Link href="/dashboard" className="dashboard-mobile-logo-link">
            <Image
              src="/wordwise-logo.png"
              alt="Wordwise"
              width={32}
              height={32}
              className="dashboard-mobile-logo-img"
              priority
            />
            <span className="dashboard-mobile-wordmark">Wordwise</span>
          </Link>

          <div className="dashboard-mobile-user-initial" aria-label={`User: ${displayName}`}>
            {(displayName.charAt(0) || "U").toUpperCase()}
          </div>
        </header>

        {/* ── Main Hub Content ── */}
        <main id="main-content" className="dashboard-content-area" tabIndex={-1}>
          {/* Header Title Banner */}
          <div className="achievements-header-banner">
            <div className="achievements-title-group">
              <h1 className="achievements-main-title">Achievements</h1>
            </div>

            {/* Quick Metrics Bar */}
            <div className="achievements-quick-stats">
              <div className="achievements-quick-stat-item">
                <span className="achievements-quick-stat-icon" aria-hidden="true">🏅</span>
                <div>
                  <div className="achievements-quick-stat-value">
                    {unlockedCount} / {totalCount}
                  </div>
                  <div className="achievements-quick-stat-label">Badges Unlocked</div>
                </div>
              </div>

              <div className="achievements-quick-stat-item">
                <span className="achievements-quick-stat-icon" aria-hidden="true">⭐</span>
                <div>
                  <div className="achievements-quick-stat-value">{game.xp} XP</div>
                  <div className="achievements-quick-stat-label">Game Experience</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Badges Section ── */}
          <section className="achievements-grid-section" aria-label="Achievement Badges">
            {/* Tabs Filter */}
            <div className="achievements-section-header">
              <div className="achievements-filter-tabs" role="tablist" aria-label="Badge filters">
                <button
                  type="button"
                  role="tab"
                  id="tab-all"
                  aria-selected={activeFilter === "all"}
                  className={`achievements-filter-btn ${activeFilter === "all" ? "achievements-filter-btn--active" : ""}`}
                  onClick={() => setActiveFilter("all")}
                >
                  All Badges ({totalCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-unlocked"
                  aria-selected={activeFilter === "unlocked"}
                  className={`achievements-filter-btn ${activeFilter === "unlocked" ? "achievements-filter-btn--active" : ""}`}
                  onClick={() => setActiveFilter("unlocked")}
                >
                  Unlocked ({unlockedCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-locked"
                  aria-selected={activeFilter === "locked"}
                  className={`achievements-filter-btn ${activeFilter === "locked" ? "achievements-filter-btn--active" : ""}`}
                  onClick={() => setActiveFilter("locked")}
                >
                  Locked ({totalCount - unlockedCount})
                </button>
              </div>
            </div>

            {/* Badges Cards Grid */}
            <div className="achievements-cards-grid" role="region" aria-label="Badges list">
              {filteredAchievements.map((badge) => (
                <article
                  key={badge.id}
                  id={`achievement-card-${badge.id}`}
                  className={`achievement-card ${
                    badge.isUnlocked ? "achievement-card--unlocked" : "achievement-card--locked"
                  }`}
                  aria-labelledby={`badge-title-${badge.id}`}
                >
                  {/* Top card row: Badge icon & Status pill */}
                  <div className="achievement-card-top">
                    <div className="achievement-icon-wrapper">
                      <div className="achievement-badge-icon" aria-hidden="true">
                        {badge.icon}
                      </div>
                      {!badge.isUnlocked && (
                        <div className="achievement-lock-overlay" aria-label="Locked" title="Locked">
                          🔒
                        </div>
                      )}
                    </div>

                    <div className="achievement-status-badge">
                      {badge.isUnlocked ? (
                        <span className="achievement-unlocked-pill">
                          <span aria-hidden="true">✨</span> Unlocked
                        </span>
                      ) : (
                        <span className="achievement-locked-pill">
                          <span aria-hidden="true">🔒</span> In Progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Title & Description */}
                  <div className="achievement-card-body">
                    <h3 id={`badge-title-${badge.id}`} className="achievement-card-title">
                      {badge.title}
                    </h3>
                    <p className="achievement-card-desc">{badge.description}</p>
                  </div>

                  {/* Progress Bar & Numerical Indicator */}
                  <div className="achievement-progress-area">
                    <div className="achievement-progress-labels">
                      <span className="achievement-progress-fraction">{badge.progressLabel}</span>
                      <span className="achievement-progress-pct">{badge.progressPercentage}%</span>
                    </div>
                    <div
                      className="achievement-progress-track"
                      role="progressbar"
                      aria-valuenow={badge.progressPercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${badge.title} progress`}
                    >
                      <div
                        className="achievement-progress-fill"
                        style={{ width: `${badge.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer: Criteria / Unlock Timestamp */}
                  <div className="achievement-card-footer">
                    {badge.isUnlocked ? (
                      <div className="achievement-timestamp-row">
                        <span className="achievement-check-symbol" aria-hidden="true">✓</span>
                        <span>{badge.unlockedAt ? `Unlocked on ${badge.unlockedAt}` : "Unlocked today"}</span>
                      </div>
                    ) : (
                      <div className="achievement-criteria-row">
                        <span className="achievement-target-icon" aria-hidden="true">🎯</span>
                        <span>{badge.actionCriteria}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ── Quick Action Shortcuts Banner ── */}
          <section className="achievements-shortcuts-banner" aria-label="Continue learning actions">
            <div className="achievements-shortcut-card">
              <div className="achievements-shortcut-content">
                <div className="achievements-shortcut-icon" aria-hidden="true">📚</div>
                <div>
                  <h3 className="achievements-shortcut-title">Read STEM Curriculum</h3>
                  <p className="achievements-shortcut-desc">
                    Complete reading passages and comprehension quizzes in the Renewable Energy library.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/library" className="achievements-shortcut-btn">
                Open Library →
              </Link>
            </div>

            <div className="achievements-shortcut-card">
              <div className="achievements-shortcut-content">
                <div className="achievements-shortcut-icon" aria-hidden="true">🌍</div>
                <div>
                  <h3 className="achievements-shortcut-title">Global Travel Missions</h3>
                  <p className="achievements-shortcut-desc">
                    Complete the Renewable Energy mission in the USA to earn diplomatic stamps and international XP.
                  </p>
                </div>
              </div>
              <Link href="/world" className="achievements-shortcut-btn achievements-shortcut-btn--accent">
                Explore World Map →
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
