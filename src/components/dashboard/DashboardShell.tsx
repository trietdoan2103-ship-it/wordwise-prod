"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import PassportModal from "@/components/passport/PassportModal";
import DashboardSidebar from "./DashboardSidebar";
import LearningProgressCard from "./LearningProgressCard";
import ExploreWorldCard from "./ExploreWorldCard";
import DashboardGoalCard from "./DashboardGoalCard";
import DashboardTopicCard from "./DashboardTopicCard";
import {
  fetchUserStreak,
  getStreak,
  getWeeklyCalendarDays,
  type StreakData,
} from "@/lib/streak";
import {
  fetchCompletedLessonIds,
  fetchCurriculumLessons,
} from "@/lib/curriculumStorage";

export default function DashboardShell() {
  const { session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 1,
    lastActiveDate: "",
    freezeCount: 1,
  });

  // Hydrate live streak and curriculum progress from Supabase and listen for updates
  useEffect(() => {
    let isMounted = true;
    setStreakData(getStreak());

    async function hydrateDashboardFromSupabase() {
      const [fetchedStreak] = await Promise.all([
        fetchUserStreak(),
        fetchCompletedLessonIds(),
        fetchCurriculumLessons(),
      ]);
      if (isMounted) {
        setStreakData(fetchedStreak);
      }
    }

    hydrateDashboardFromSupabase();

    function handleStreakUpdate(e: Event) {
      const customEvent = e as CustomEvent<StreakData>;
      if (customEvent.detail) {
        setStreakData(customEvent.detail);
      } else {
        setStreakData(getStreak());
      }
    }

    function handleStorage() {
      setStreakData(getStreak());
    }

    window.addEventListener("wordwise_streak_updated", handleStreakUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("wordwise_streak_updated", handleStreakUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session?.id]);

  const calendarDays = useMemo(() => {
    return getWeeklyCalendarDays(streakData);
  }, [streakData]);

  const activeDaysThisWeek = calendarDays.filter((d) => d.isActive).length;

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const displayName = session?.displayName || "Explorer";

  return (
    <div className="dashboard-container">
      {/* ── Sidebar Navigation (Desktop & Mobile Drawer) ── */}
      <DashboardSidebar
        currentSection="overview"
        isOpenOnMobile={mobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      {/* ── Main Area ── */}
      <div className="dashboard-main-wrapper">
        {/* Mobile top header with hamburger menu */}
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

        {/* Main Dashboard Content */}
        <main id="main-content" className="dashboard-content-area" tabIndex={-1}>
          {/* Greeting & Header Banner */}
          <div className="dashboard-hero-greeting flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="dashboard-greeting-text">
              <div className="dashboard-greeting-badge bg-orange-50 text-orange-700 border border-orange-200">
                <span aria-hidden="true">🎓</span>
                <span>STEM English Hub</span>
              </div>
              <h1 className="dashboard-greeting-title">
                Welcome back, <span className="dashboard-greeting-name bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">{displayName}</span>!
              </h1>
              <p className="dashboard-greeting-subtitle">
                Track your renewable energy learning progress and continue your global language adventures.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPassportOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 text-sm font-extrabold text-orange-900 shadow-xs transition hover:border-orange-400 hover:bg-orange-100/70 cursor-pointer"
            >
              <span className="text-lg" aria-hidden="true">🛂</span>
              <span>My Passport</span>
            </button>
          </div>

          {/* ── Active Learning Streak Card ── */}
          <section className="streak-hub-card mb-6" aria-labelledby="streak-heading">
            <div className="streak-hub-main">
              {/* Left Column: Big Flame & Streak Status */}
              <div className="streak-flame-panel">
                <div className="streak-flame-avatar" aria-hidden="true">
                  <span className="streak-flame-emoji">🔥</span>
                  <div className="streak-flame-ring" />
                </div>
                <div className="streak-info-col">
                  <div className="streak-badge-row">
                    <span className="streak-status-pill">
                      {streakData.currentStreak > 0 ? "Active Learning Streak" : "Start Your Streak"}
                    </span>
                    <span className="streak-freeze-pill" title="Protects your streak if you miss a day">
                      🛡️ {streakData.freezeCount} Freeze Ready
                    </span>
                  </div>
                  <h2 id="streak-heading" className="streak-counter-title">
                    <span className="streak-counter-number">{streakData.currentStreak}</span>{" "}
                    {streakData.currentStreak === 1 ? "Day" : "Days"} Streak
                  </h2>
                  <p className="streak-motivational-quote">
                    {streakData.currentStreak >= 3
                      ? "Incredible momentum! You're building a lasting daily habit for STEM fluency."
                      : "Complete a lesson or mission stage each day to grow your active streak!"}
                  </p>
                </div>
              </div>

              {/* Right Column: 7-Day Mini-Calendar */}
              <div className="streak-calendar-panel" aria-label="Last 7 days learning streak calendar">
                <div className="streak-calendar-header">
                  <span className="streak-calendar-title">Last 7 Days Activity</span>
                  <span className="streak-calendar-metric">
                    <strong>{activeDaysThisWeek}/7</strong> days completed
                  </span>
                </div>

                <div className="streak-calendar-grid">
                  {calendarDays.map((day) => (
                    <div
                      key={day.dateString}
                      className={`streak-day-box ${day.isActive ? "streak-day-box--active" : "streak-day-box--inactive"} ${
                        day.isToday ? "streak-day-box--today" : ""
                      }`}
                      title={`${day.dayName}, ${day.dateString}: ${day.isActive ? "Active (Completed)" : day.isToday ? "Today (Pending practice)" : "Missed"}`}
                    >
                      <span className="streak-day-name">{day.dayName}</span>
                      <div className="streak-day-indicator">
                        {day.isActive ? (
                          <span className="streak-day-icon streak-day-icon--active" aria-hidden="true">
                            🔥
                          </span>
                        ) : day.isToday ? (
                          <span className="streak-day-icon streak-day-icon--today" aria-hidden="true">
                            ○
                          </span>
                        ) : (
                          <span className="streak-day-icon streak-day-icon--missed" aria-hidden="true">
                            ·
                          </span>
                        )}
                      </div>
                      <span className="streak-day-num">{day.dayNumber}</span>
                      {day.isToday && <span className="streak-today-tag">Today</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Cards Grid */}
          <div className="dashboard-cards-grid">
            {/* Primary Trackers */}
            <div className="dashboard-grid-col">
              <LearningProgressCard />
            </div>

            <div className="dashboard-grid-col">
              <ExploreWorldCard />
            </div>

            {/* Supplementary Summary Cards */}
            <div className="dashboard-grid-col">
              <DashboardGoalCard />
            </div>

            <div className="dashboard-grid-col">
              <DashboardTopicCard />
            </div>
          </div>
        </main>
      </div>
      {passportOpen && (
        <PassportModal onClose={() => setPassportOpen(false)} />
      )}
    </div>
  );
}
