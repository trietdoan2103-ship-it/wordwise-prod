"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  LEADERBOARD_AVATAR_POOL,
  useSession,
  validateDisplayName,
  validateSchoolName,
} from "@/context/SessionContext";
import { useGame } from "@/context/GameContext";
import { createClient } from "@/lib/supabase/client";
import DashboardSidebar from "./DashboardSidebar";
import {
  fetchLiveLeaderboard,
  syncCurrentUserLeaderboardProfile,
  type RankingCategory,
  type StudentRankEntry,
} from "@/data/rankings";

export default function RankingsView() {
  const { session, updateProfile } = useSession();
  const game = useGame();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<RankingCategory>("national");
  const [nationalList, setNationalList] = useState<StudentRankEntry[]>([]);
  const [weeklyList, setWeeklyList] = useState<StudentRankEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inline Profile Editor state (Display Name, School, Avatar)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editAvatar, setEditAvatar] = useState<string>("🧑‍🚀");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const loadLeaderboardFromSupabase = useCallback(
    async (options?: { showFullLoader?: boolean; syncProfile?: boolean }) => {
      const showFullLoader = options?.showFullLoader ?? false;
      const shouldSyncProfile = options?.syncProfile ?? false;

      if (showFullLoader) {
        setIsLoading(true);
      }

      // 1. Flush the current authenticated user's XP & completed modules to public.profiles when local progress changes
      if (shouldSyncProfile && session?.id) {
        await syncCurrentUserLeaderboardProfile(session.id);
      }

      // 2. Fetch 100% live rankings from Supabase (single source of truth for ALL users)
      const liveBoard = await fetchLiveLeaderboard();
      setNationalList(liveBoard.national);
      setWeeklyList(liveBoard.weekly);
      setIsLoading(false);
    },
    [session?.id]
  );

  // Hydrate live Supabase leaderboard and keep it synchronized across tabs/devices
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!isMounted) return;
      await loadLeaderboardFromSupabase({
        showFullLoader: true,
        syncProfile: true,
      });
    }

    void init();

    function handleCurriculumUpdate() {
      if (!isMounted) return;
      void loadLeaderboardFromSupabase({
        showFullLoader: false,
        syncProfile: true,
      });
    }

    function handleWindowFocus() {
      if (!isMounted) return;
      void loadLeaderboardFromSupabase({
        showFullLoader: false,
        syncProfile: false,
      });
    }

    window.addEventListener(
      "wordwise_curriculum_updated",
      handleCurriculumUpdate
    );
    window.addEventListener("focus", handleWindowFocus);

    const supabase = createClient();
    const channel = supabase
      .channel("public:profiles:leaderboard-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          if (isMounted) {
            void loadLeaderboardFromSupabase({
              showFullLoader: false,
              syncProfile: false,
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener(
        "wordwise_curriculum_updated",
        handleCurriculumUpdate
      );
      window.removeEventListener("focus", handleWindowFocus);
      void supabase.removeChannel(channel);
    };
  }, [loadLeaderboardFromSupabase, game.xp]);

  // Strictly render the live Supabase rows — never override with localStorage-only numbers
  const currentList: StudentRankEntry[] = useMemo(() => {
    return activeCategory === "weekly" ? weeklyList : nationalList;
  }, [activeCategory, nationalList, weeklyList]);

  const currentUserEntry = useMemo(() => {
    if (!session?.id) return null;
    return currentList.find((e) => e.id === session.id) || null;
  }, [session?.id, currentList]);

  const displayName =
    currentUserEntry?.name || session?.displayName || "STEM Explorer";
  const schoolName =
    currentUserEntry?.school || session?.schoolName || "High School Student";
  const userAvatar =
    currentUserEntry?.avatar || session?.avatar || "🧑‍🚀";

  const liveLearnersCount = currentList.length;
  const liveSchoolsCount = useMemo(
    () =>
      new Set(
        currentList.map((e) => e.school.trim().toLowerCase()).filter(Boolean)
      ).size,
    [currentList]
  );

  // Top 3 for the podium
  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];

  const userRankNumber = currentUserEntry?.rank ?? null;

  function openProfileEditor() {
    setEditName(displayName);
    setEditSchool(schoolName);
    setEditAvatar(userAvatar);
    setEditError(null);
    setIsEditingProfile(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);

    const nameErr = validateDisplayName(editName);
    if (nameErr) {
      setEditError(nameErr);
      return;
    }

    if (editSchool.trim()) {
      const schoolErr = validateSchoolName(editSchool);
      if (schoolErr) {
        setEditError(schoolErr);
        return;
      }
    }

    setIsSavingProfile(true);
    const { error } = await updateProfile({
      displayName: editName.trim(),
      schoolName: editSchool.trim() || "High School Student",
      avatar: editAvatar,
    });

    if (error) {
      setIsSavingProfile(false);
      setEditError(error);
      return;
    }

    await loadLeaderboardFromSupabase({
      showFullLoader: false,
      syncProfile: false,
    });
    setIsSavingProfile(false);
    setIsEditingProfile(false);
  }

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
                  <div className="rankings-stat-value">
                    {liveSchoolsCount} {liveSchoolsCount === 1 ? "School" : "Schools"}
                  </div>
                  <div className="rankings-stat-label">Active Nationwide</div>
                </div>
              </div>

              <div className="rankings-stat-pill">
                <span className="rankings-stat-icon" aria-hidden="true">👥</span>
                <div>
                  <div className="rankings-stat-value">{liveLearnersCount}</div>
                  <div className="rankings-stat-label">
                    {liveLearnersCount === 1 ? "STEM Learner" : "STEM Learners"}
                  </div>
                </div>
              </div>

              <div className="rankings-stat-pill rankings-stat-pill--user">
                <span className="rankings-stat-icon" aria-hidden="true">📍</span>
                <div>
                  <div className="rankings-stat-value">
                    {userRankNumber ? `Rank #${userRankNumber}` : "Unranked"}
                  </div>
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

            <div className="flex items-center gap-2.5">
              {session?.id && (
                <button
                  type="button"
                  onClick={openProfileEditor}
                  className="rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-orange-300 hover:bg-orange-50"
                >
                  ✏️ Edit Profile
                </button>
              )}
              <div className="rankings-league-badge">
                <span>Live Verified Leaderboard</span>
              </div>
            </div>
          </div>

          {/* ── Inline Profile Editor Modal/Card (with Profanity & Spam Username Guard) ── */}
          {isEditingProfile && session?.id && (
            <section
              className="mb-6 rounded-3xl border border-orange-300 bg-white p-6 shadow-md"
              aria-label="Edit Leaderboard Profile"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Update Your Leaderboard Profile
                  </h2>
                  <p className="text-xs text-slate-500">
                    Changes are persisted directly to Supabase so every learner sees your updated stats.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-lg px-2.5 py-1 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close profile editor"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
                {editError && (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700"
                    role="alert"
                  >
                    ⚠️ {editError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="leaderboard-edit-name"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Display Name
                    </label>
                    <input
                      id="leaderboard-edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        setEditError(null);
                      }}
                      placeholder="e.g. Nguyen Minh Quan"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-orange-500 focus:outline-none"
                      disabled={isSavingProfile}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="leaderboard-edit-school"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      High School
                    </label>
                    <input
                      id="leaderboard-edit-school"
                      type="text"
                      value={editSchool}
                      onChange={(e) => {
                        setEditSchool(e.target.value);
                        setEditError(null);
                      }}
                      placeholder="e.g. Le Hong Phong High School"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-orange-500 focus:outline-none"
                      disabled={isSavingProfile}
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Choose Avatar
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {LEADERBOARD_AVATAR_POOL.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setEditAvatar(av)}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition ${
                          editAvatar === av
                            ? "border-orange-500 bg-orange-50 ring-2 ring-orange-400/40"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                        aria-label={`Select avatar ${av}`}
                        aria-pressed={editAvatar === av}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    disabled={isSavingProfile}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-500 px-5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-orange-600 disabled:opacity-50"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? "Saving to Supabase..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {isLoading ? (
            <section
              className="rounded-3xl border border-orange-200/80 bg-white/90 p-10 text-center shadow-xs"
              aria-live="polite"
            >
              <p className="text-sm font-bold text-slate-500">
                Loading real-time learner rankings from Supabase...
              </p>
            </section>
          ) : currentList.length === 0 ? (
            /* ── Clean Empty State when 0 users are ranked ── */
            <section
              className="my-4 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-orange-300/80 bg-gradient-to-b from-amber-50/70 via-white to-orange-50/40 p-10 text-center shadow-xs"
              aria-label="Empty leaderboard state"
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-3xl text-white shadow-md"
                aria-hidden="true"
              >
                🏆
              </div>
              <div className="max-w-md">
                <h2 className="text-xl font-extrabold text-slate-900">
                  No explorers ranked yet — complete a mission to claim the #1 spot!
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  As real learners sign in and earn XP across STEM lessons and World Map missions, their verified rankings will appear here automatically.
                </p>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/world"
                  className="rankings-cta-btn rankings-cta-btn--primary"
                >
                  Explore World Map →
                </Link>
                <Link
                  href="/dashboard/library"
                  className="rankings-cta-btn rankings-cta-btn--secondary"
                >
                  Open Learning Library →
                </Link>
              </div>
            </section>
          ) : (
            <>
              {/* ── Top 3 Gamified Podium (Gracefully handles 1, 2, or 3+ real users) ── */}
              <section className="podium-section" aria-label="Top 3 Leading Students">
                <div className="podium-container">
                  {/* 2nd Place (Silver) */}
                  {top2 ? (
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
                  ) : (
                    <div className="podium-card podium-card--silver opacity-65 border-dashed">
                      <div className="podium-medal-badge" aria-label="2nd place open">🥈</div>
                      <div className="podium-avatar-wrapper">
                        <span className="podium-avatar-icon" aria-hidden="true">✨</span>
                        <span className="podium-rank-tag">#2</span>
                      </div>
                      <h3 className="podium-student-name text-slate-500">Open Podium Spot</h3>
                      <p className="podium-school-name">Waiting for next explorer</p>
                      <div className="podium-score-pill">
                        <span>Complete a lesson to claim #2</span>
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
                  {top3 ? (
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
                  ) : (
                    <div className="podium-card podium-card--bronze opacity-65 border-dashed">
                      <div className="podium-medal-badge" aria-label="3rd place open">🥉</div>
                      <div className="podium-avatar-wrapper">
                        <span className="podium-avatar-icon" aria-hidden="true">✨</span>
                        <span className="podium-rank-tag">#3</span>
                      </div>
                      <h3 className="podium-student-name text-slate-500">Open Podium Spot</h3>
                      <p className="podium-school-name">Waiting for next explorer</p>
                      <div className="podium-score-pill">
                        <span>Complete a lesson to claim #3</span>
                      </div>
                      <div className="podium-pedestal podium-pedestal--bronze">
                        <span className="podium-pedestal-number">3</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* ── User Position Row (Strictly rendered from live Supabase row) ── */}
              {currentUserEntry && (
                <section className="user-pinned-standings" aria-label="Your current leaderboard ranking">
                  <div className="user-pinned-row">
                    <div className="user-pinned-col-rank">
                      <span className="user-rank-badge">#{currentUserEntry.rank}</span>
                      <span className="user-you-tag">YOU</span>
                    </div>

                    <div className="user-pinned-col-student">
                      <div className="user-pinned-avatar" aria-hidden="true">
                        {currentUserEntry.avatar}
                      </div>
                      <div>
                        <div className="user-pinned-name-row">
                          <strong className="user-pinned-name">{currentUserEntry.name}</strong>
                          <span className="user-verified-badge" title="Verified Learner">✓ Live Student Profile</span>
                        </div>
                        <div className="user-pinned-school">
                          {currentUserEntry.school}
                        </div>
                      </div>
                    </div>

                    <div className="user-pinned-col-modules">
                      <span className="user-metric-label">Completed Modules</span>
                      <strong className="user-metric-val">
                        {currentUserEntry.modulesCompleted} / {currentUserEntry.totalModules} Modules
                      </strong>
                    </div>

                    <div className="user-pinned-col-xp">
                      <span className="user-metric-label">Composite Score</span>
                      <strong className="user-metric-val user-metric-val--xp">
                        ⭐ {currentUserEntry.xp.toLocaleString()} XP
                      </strong>
                    </div>

                    <div className="user-pinned-col-action">
                      <Link href="/dashboard/library" className="user-pinned-boost-btn">
                        Earn XP →
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              {/* ── Ranked List Table ── */}
              <section className="rankings-table-section" aria-labelledby="leaderboard-heading">
                <div className="rankings-table-header-row">
                  <h2 id="leaderboard-heading" className="rankings-table-heading">
                    Top High School STEM Students ({currentList.length})
                  </h2>
                  <span className="rankings-table-sub">
                    100% live learner data from verified quizzes &amp; missions
                  </span>
                </div>

                <div className="rankings-table-wrapper">
                  <table className="rankings-table">
                    <thead>
                      <tr>
                        <th scope="col" className="th-rank">Rank</th>
                        <th scope="col" className="th-student">Student &amp; High School</th>
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
                                  {session?.id === entry.id && (
                                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                                      YOU
                                    </span>
                                  )}
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
                                <span className="trend-up" title={`Active streak: ${entry.trendAmount}`}>
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
            </>
          )}

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
