"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import { useGame } from "@/context/GameContext";
import DashboardSidebar from "./DashboardSidebar";
import {
  fetchCompletedLessonIds,
  getCurriculumProgress,
} from "@/lib/curriculumStorage";
import {
  fetchLiveLeaderboard,
  NATIONAL_RANKINGS,
  WEEKLY_RANKINGS,
  type RankingCategory,
  type StudentRankEntry,
} from "@/data/rankings";

export default function RankingsView() {
  const { session } = useSession();
  const game = useGame();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<RankingCategory>("national");
  const [curriculumCompletedIds, setCurriculumCompletedIds] = useState<string[]>([]);
  const [nationalList, setNationalList] = useState<StudentRankEntry[]>(NATIONAL_RANKINGS);
  const [weeklyList, setWeeklyList] = useState<StudentRankEntry[]>(WEEKLY_RANKINGS);
  const [schoolsCount, setSchoolsCount] = useState<number>(10);
  const [learnersCount, setLearnersCount] = useState<number>(NATIONAL_RANKINGS.length);

  // Hydrate curriculum progress and live Supabase leaderboard
  useEffect(() => {
    let isMounted = true;
    setCurriculumCompletedIds(getCurriculumProgress());

    async function hydrateRankings() {
      const [completedIds, liveBoard] = await Promise.all([
        fetchCompletedLessonIds(),
        fetchLiveLeaderboard(),
      ]);
      if (!isMounted) return;
      setCurriculumCompletedIds(completedIds);
      setNationalList(liveBoard.national);
      setWeeklyList(liveBoard.weekly);
      setSchoolsCount(liveBoard.uniqueSchoolsCount);
      setLearnersCount(liveBoard.totalUsersCount);
    }

    hydrateRankings();

    function handleCurriculumUpdate() {
      setCurriculumCompletedIds(getCurriculumProgress());
    }

    window.addEventListener("wordwise_curriculum_updated", handleCurriculumUpdate);
    window.addEventListener("storage", handleCurriculumUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("wordwise_curriculum_updated", handleCurriculumUpdate);
      window.removeEventListener("storage", handleCurriculumUpdate);
    };
  }, [session?.id, game.xp]);

  const displayName = session?.displayName || "Explorer";
  const schoolName =
    session?.schoolName || "THPT Chuyên • Specialized High School Track";

  // User live composite score: Game XP + Completed Lessons * 50
  const userModules = curriculumCompletedIds.length;
  const userCompositeXP = game.xp + userModules * 50;

  // Merge/update current user's live stats into the active list and sort descending
  const currentList: StudentRankEntry[] = useMemo(() => {
    const baseList = activeCategory === "weekly" ? weeklyList : nationalList;
    const listCopy = baseList.map((entry) => ({ ...entry }));

    if (session?.id) {
      const existingIdx = listCopy.findIndex((e) => e.id === session.id);
      if (existingIdx >= 0) {
        listCopy[existingIdx] = {
          ...listCopy[existingIdx],
          name: displayName,
          school: schoolName,
          modulesCompleted: userModules,
          xp: Math.max(listCopy[existingIdx].xp, userCompositeXP),
        };
      } else {
        listCopy.push({
          id: session.id,
          rank: listCopy.length + 1,
          name: displayName,
          school: schoolName,
          province: "Việt Nam",
          avatar: "🧑‍🚀",
          modulesCompleted: userModules,
          totalModules: 6,
          xp: userCompositeXP,
          trend: "up",
          trendAmount: 1,
          badge: "Bronze League",
          isRealUser: true,
        });
      }
    }

    listCopy.sort((a, b) => b.xp - a.xp);
    return listCopy.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }, [
    activeCategory,
    nationalList,
    weeklyList,
    session?.id,
    displayName,
    schoolName,
    userModules,
    userCompositeXP,
  ]);

  // Top 3 for the podium
  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];

  const userRankNumber = useMemo(() => {
    if (session?.id) {
      const found = currentList.find((e) => e.id === session.id);
      if (found) return found.rank;
    }
    for (let i = 0; i < currentList.length; i++) {
      if (userCompositeXP >= currentList[i].xp) {
        return currentList[i].rank;
      }
    }
    return currentList.length + 1;
  }, [session?.id, userCompositeXP, currentList]);

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
        currentSection="rankings"
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

        {/* ── Main Leaderboard Content ── */}
        <main id="main-content" className="dashboard-content-area" tabIndex={-1}>
          {/* ── Header Title & Stats ── */}
          <div className="rankings-header-banner">
            <div className="rankings-title-group">
              <div className="rankings-tag-pill">
                <span aria-hidden="true">🏆</span>
                <span>STEM High School League</span>
              </div>
              <h1 className="rankings-main-title">
                Community Rankings &amp; Leaderboard
              </h1>
            </div>

            {/* Quick League Metrics */}
            <div className="rankings-stats-bar">
              <div className="rankings-stat-pill">
                <span className="rankings-stat-icon" aria-hidden="true">🏫</span>
                <div>
                  <div className="rankings-stat-value">{schoolsCount} Schools</div>
                  <div className="rankings-stat-label">Active Nationwide</div>
                </div>
              </div>

              <div className="rankings-stat-pill">
                <span className="rankings-stat-icon" aria-hidden="true">👥</span>
                <div>
                  <div className="rankings-stat-value">{Math.max(learnersCount, currentList.length)}</div>
                  <div className="rankings-stat-label">STEM Learners</div>
                </div>
              </div>

              <div className="rankings-stat-pill rankings-stat-pill--user">
                <span className="rankings-stat-icon" aria-hidden="true">📍</span>
                <div>
                  <div className="rankings-stat-value">Rank #{userRankNumber}</div>
                  <div className="rankings-stat-label">Your Standings</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab Filter Controls ── */}
          <div className="rankings-filter-bar">
            <div className="rankings-tabs-wrapper" role="tablist" aria-label="Leaderboard Leagues">
              <button
                type="button"
                role="tab"
                id="tab-national"
                aria-selected={activeCategory === "national"}
                className={`rankings-tab-btn ${activeCategory === "national" ? "rankings-tab-btn--active" : ""}`}
                onClick={() => setActiveCategory("national")}
              >
                <span aria-hidden="true">🇻🇳</span> National High Schools
              </button>
              <button
                type="button"
                role="tab"
                id="tab-weekly"
                aria-selected={activeCategory === "weekly"}
                className={`rankings-tab-btn ${activeCategory === "weekly" ? "rankings-tab-btn--active" : ""}`}
                onClick={() => setActiveCategory("weekly")}
              >
                <span aria-hidden="true">🔥</span> This Week
              </button>
            </div>

            <div className="rankings-league-badge">
              <span>Season 1 • Spring Semester</span>
            </div>
          </div>

          {/* ── Top 3 Gamified Podium ── */}
          <section className="podium-section" aria-label="Top 3 Leading Students">
            <div className="podium-container">
              {/* 2nd Place (Silver) */}
              {top2 && (
                <div className="podium-card podium-card--silver">
                  <div className="podium-medal-badge" aria-label="2nd place">🥈</div>
                  <div className="podium-avatar-wrapper">
                    <span className="podium-avatar-icon" aria-hidden="true">{top2.avatar}</span>
                    <span className="podium-rank-tag">#2</span>
                  </div>
                  <h3 className="podium-student-name">{top2.name}</h3>
                  <p className="podium-school-name">{top2.school}</p>
                  <p className="podium-province-name">{top2.province}</p>
                  <div className="podium-score-pill">
                    <strong>{top2.xp.toLocaleString()} XP</strong>
                    <span>• {top2.modulesCompleted}/{top2.totalModules} Modules</span>
                  </div>
                  <div className="podium-pedestal podium-pedestal--silver">
                    <span className="podium-pedestal-number">2</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold — Elevated Center) */}
              {top1 && (
                <div className="podium-card podium-card--gold">
                  <div className="podium-crown" aria-hidden="true">👑</div>
                  <div className="podium-medal-badge" aria-label="1st place champion">🥇</div>
                  <div className="podium-avatar-wrapper podium-avatar-wrapper--champion">
                    <span className="podium-avatar-icon" aria-hidden="true">{top1.avatar}</span>
                    <span className="podium-rank-tag podium-rank-tag--champion">#1</span>
                  </div>
                  <h3 className="podium-student-name podium-student-name--champion">{top1.name}</h3>
                  <p className="podium-school-name">{top1.school}</p>
                  <p className="podium-province-name">{top1.province}</p>
                  <div className="podium-score-pill podium-score-pill--champion">
                    <strong>{top1.xp.toLocaleString()} XP</strong>
                    <span>• {top1.modulesCompleted}/{top1.totalModules} Modules</span>
                  </div>
                  <div className="podium-pedestal podium-pedestal--gold">
                    <span className="podium-pedestal-number">1</span>
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {top3 && (
                <div className="podium-card podium-card--bronze">
                  <div className="podium-medal-badge" aria-label="3rd place">🥉</div>
                  <div className="podium-avatar-wrapper">
                    <span className="podium-avatar-icon" aria-hidden="true">{top3.avatar}</span>
                    <span className="podium-rank-tag">#3</span>
                  </div>
                  <h3 className="podium-student-name">{top3.name}</h3>
                  <p className="podium-school-name">{top3.school}</p>
                  <p className="podium-province-name">{top3.province}</p>
                  <div className="podium-score-pill">
                    <strong>{top3.xp.toLocaleString()} XP</strong>
                    <span>• {top3.modulesCompleted}/{top3.totalModules} Modules</span>
                  </div>
                  <div className="podium-pedestal podium-pedestal--bronze">
                    <span className="podium-pedestal-number">3</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── User Position Row (Highlighted Sticky Row) ── */}
          <section className="user-pinned-standings" aria-label="Your current leaderboard ranking">
            <div className="user-pinned-row">
              <div className="user-pinned-col-rank">
                <span className="user-rank-badge">#{userRankNumber}</span>
                <span className="user-you-tag">YOU</span>
              </div>

              <div className="user-pinned-col-student">
                <div className="user-pinned-avatar" aria-hidden="true">
                  {(displayName.charAt(0) || "U").toUpperCase()}
                </div>
                <div>
                  <div className="user-pinned-name-row">
                    <strong className="user-pinned-name">{displayName}</strong>
                    <span className="user-verified-badge" title="Verified Learner">✓ Live Student Profile</span>
                  </div>
                  <div className="user-pinned-school">
                    {schoolName}
                  </div>
                </div>
              </div>

              <div className="user-pinned-col-modules">
                <span className="user-metric-label">Completed Modules</span>
                <strong className="user-metric-val">{userModules} / 6 Modules</strong>
              </div>

              <div className="user-pinned-col-xp">
                <span className="user-metric-label">Composite Score</span>
                <strong className="user-metric-val user-metric-val--xp">
                  ⭐ {userCompositeXP.toLocaleString()} XP
                </strong>
              </div>

              <div className="user-pinned-col-action">
                <Link href="/dashboard/library" className="user-pinned-boost-btn">
                  Earn XP →
                </Link>
              </div>
            </div>
          </section>

          {/* ── Ranked List Table ── */}
          <section className="rankings-table-section" aria-labelledby="leaderboard-heading">
            <div className="rankings-table-header-row">
              <h2 id="leaderboard-heading" className="rankings-table-heading">
                Top High School STEM Students
              </h2>
              <span className="rankings-table-sub">
                Updated in real-time based on verified learning quizzes &amp; missions
              </span>
            </div>

            <div className="rankings-table-wrapper">
              <table className="rankings-table">
                <thead>
                  <tr>
                    <th scope="col" className="th-rank">Rank</th>
                    <th scope="col" className="th-student">Student &amp; Specialized High School</th>
                    <th scope="col" className="th-modules">Completed Modules</th>
                    <th scope="col" className="th-xp">Total XP</th>
                    <th scope="col" className="th-trend">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`rankings-tr ${entry.rank <= 3 ? `rankings-tr--top${entry.rank}` : ""}`}
                    >
                      {/* Rank Number */}
                      <td className="td-rank">
                        <span className={`rank-badge-item rank-badge-item--${entry.rank}`}>
                          {entry.rank === 1 && "🥇"}
                          {entry.rank === 2 && "🥈"}
                          {entry.rank === 3 && "🥉"}
                          {entry.rank > 3 && `#${entry.rank}`}
                        </span>
                      </td>

                      {/* Student Name & School */}
                      <td className="td-student">
                        <div className="student-profile-cell">
                          <span className="student-cell-avatar" aria-hidden="true">{entry.avatar}</span>
                          <div className="student-cell-info">
                            <div className="student-cell-name-row">
                              <strong className="student-cell-name">{entry.name}</strong>
                              {entry.badge && (
                                <span className="student-league-badge">{entry.badge}</span>
                              )}
                            </div>
                            <span className="student-cell-school">
                              {entry.school} <span className="student-cell-province">({entry.province})</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Completed Modules */}
                      <td className="td-modules">
                        <div className="modules-cell">
                          <div className="modules-cell-bar">
                            <div
                              className="modules-cell-fill"
                              style={{ width: `${(entry.modulesCompleted / entry.totalModules) * 100}%` }}
                            />
                          </div>
                          <span className="modules-cell-text">
                            {entry.modulesCompleted}/{entry.totalModules}
                          </span>
                        </div>
                      </td>

                      {/* Total XP */}
                      <td className="td-xp">
                        <span className="xp-cell-value">
                          <span className="xp-star-icon" aria-hidden="true">⭐</span>
                          {entry.xp.toLocaleString()} XP
                        </span>
                      </td>

                      {/* Trend */}
                      <td className="td-trend">
                        <div className="trend-cell">
                          {entry.trend === "up" && (
                            <span className="trend-up" title={`Up ${entry.trendAmount} positions`}>
                              🔼 +{entry.trendAmount}
                            </span>
                          )}
                          {entry.trend === "down" && (
                            <span className="trend-down" title={`Down ${entry.trendAmount} positions`}>
                              🔽 -{entry.trendAmount}
                            </span>
                          )}
                          {entry.trend === "same" && (
                            <span className="trend-same" title="No change in position">
                              — 0
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Footer Motivation / CTA ── */}
          <div className="rankings-footer-cta">
            <div className="rankings-footer-content">
              <span className="rankings-footer-icon" aria-hidden="true">🚀</span>
              <div>
                <h3 className="rankings-footer-title">Want to climb the leaderboard?</h3>
                <p className="rankings-footer-desc">
                  Complete STEM Clean Tech reading lessons, test comprehension with quick quizzes, or solve diplomatic language missions in the World Map.
                </p>
              </div>
            </div>
            <div className="rankings-footer-actions">
              <Link href="/dashboard/library" className="rankings-cta-btn rankings-cta-btn--primary">
                Open Learning Library →
              </Link>
              <Link href="/world" className="rankings-cta-btn rankings-cta-btn--secondary">
                Play World Map →
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
