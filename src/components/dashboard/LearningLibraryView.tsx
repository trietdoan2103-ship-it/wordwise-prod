"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import { createClient } from "@/lib/supabase/client";
import DashboardSidebar from "./DashboardSidebar";
import LessonReaderModal from "@/components/library/LessonReaderModal";
import {
  pauseBackgroundMusic,
  resumeBackgroundMusic,
} from "@/components/layout/BackgroundMusicPlayer";
import { renewableEnergyLessons } from "@/data/lessons";
import type { Lesson, LibraryFilterTab } from "@/types/curriculum";
import type { DbVideo, VideoDomain, VideoLevel } from "@/types/database";
import VideoImmersionPanel from "@/components/library/VideoImmersionPanel";
import {
  DEFAULT_STEM_VIDEOS,
  VIDEO_DOMAINS,
  VIDEO_LEVELS,
  getCompletedVideoIds,
  normalizeVideo,
} from "@/data/videos";
import {
  fetchCurriculumLessons,
  fetchCompletedLessonIds,
  getCompletedLessonIds,
  markLessonCompleted,
  toggleLessonCompletion,
} from "@/lib/curriculumStorage";
import { fetchUserStreak } from "@/lib/streak";

const DEFAULT_FALLBACK_VIDEOS: DbVideo[] = DEFAULT_STEM_VIDEOS;

/** Extracts the 11-character YouTube video ID from watch, share, or embed URLs. */
function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function getYouTubeEmbedUrl(url: string): string {
  const id = extractYouTubeId(url);
  if (id) {
    return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  }
  return url;
}

function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

interface LearningLibraryViewProps {
  defaultTab?: LibraryFilterTab;
}

export default function LearningLibraryView({
  defaultTab = "all",
}: LearningLibraryViewProps) {
  const { session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LibraryFilterTab>(defaultTab);
  const [lessons, setLessons] = useState<Lesson[]>(renewableEnergyLessons);
  const [videos, setVideos] = useState<DbVideo[]>(DEFAULT_FALLBACK_VIDEOS);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeVideo, setActiveVideo] = useState<DbVideo | null>(null);
  const [levelFilter, setLevelFilter] = useState<"All" | VideoLevel>("All");
  const [domainFilter, setDomainFilter] = useState<"All" | VideoDomain>("All");
  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([]);

  useEffect(() => {
    setCompletedVideoIds(getCompletedVideoIds());
  }, []);

  const filteredVideos = videos.filter(
    (v) =>
      (levelFilter === "All" || v.level === levelFilter) &&
      (domainFilter === "All" || v.domain === domainFilter)
  );

  const loadVideos = useCallback(async () => {
    const getLocalPublished = (): DbVideo[] => {
      if (typeof window === "undefined") return DEFAULT_FALLBACK_VIDEOS;
      try {
        const raw = localStorage.getItem("wordwise_videos_store_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return (parsed as DbVideo[])
              .filter((v) => v.is_published !== false)
              .map(normalizeVideo);
          }
        }
      } catch {
        // ignore
      }
      return DEFAULT_FALLBACK_VIDEOS;
    };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        setVideos((data as DbVideo[]).map(normalizeVideo));
      } else {
        setVideos(getLocalPublished());
      }
    } catch {
      setVideos(getLocalPublished());
    }
  }, []);

  // Automatically pause background music while a video modal is open, and resume on close
  useEffect(() => {
    if (!activeVideo) return;
    pauseBackgroundMusic();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveVideo(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      resumeBackgroundMusic();
    };
  }, [activeVideo]);

  // Sync tab if defaultTab changes (e.g. navigation between /library and /videos)
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Hydrate curriculum lessons, completed lesson IDs, and streak from Supabase
  useEffect(() => {
    let isMounted = true;
    setCompletedIds(getCompletedLessonIds());

    async function hydrateFromSupabase() {
      const [fetchedLessons, fetchedCompletedIds] = await Promise.all([
        fetchCurriculumLessons(),
        fetchCompletedLessonIds(),
        fetchUserStreak(),
      ]);

      if (!isMounted) return;
      setLessons(fetchedLessons);
      setCompletedIds(fetchedCompletedIds);
    }

    hydrateFromSupabase();
    void loadVideos();

    function handleUpdate(e: Event) {
      const customEvent = e as CustomEvent<string[]>;
      if (Array.isArray(customEvent.detail)) {
        setCompletedIds(customEvent.detail);
      } else {
        setCompletedIds(getCompletedLessonIds());
      }
    }

    function handleVideosUpdated() {
      void loadVideos();
    }

    function handleStorage() {
      setCompletedIds(getCompletedLessonIds());
    }

    window.addEventListener("wordwise_curriculum_updated", handleUpdate);
    window.addEventListener("wordwise_videos_updated", handleVideosUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("wordwise_curriculum_updated", handleUpdate);
      window.removeEventListener("wordwise_videos_updated", handleVideosUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session?.id, loadVideos]);

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function handleToggleComplete(lessonId: string) {
    const updated = toggleLessonCompletion(lessonId);
    setCompletedIds(updated);
  }

  function handleCompleteLesson(lessonId: string) {
    const updated = markLessonCompleted(lessonId);
    setCompletedIds(updated);
  }

  const displayName = session?.displayName || "Explorer";

  // Filter lessons based on active tab
  const filteredLessons = lessons.filter((lesson) => {
    if (activeTab === "all") return true;
    if (activeTab === "reading") return lesson.lessonType === "reading";
    if (activeTab === "flashcards") return lesson.lessonType === "flashcard";
    return true;
  });

  return (
    <div className="dashboard-container">
      {/* ── Sidebar Navigation ── */}
      <DashboardSidebar
        currentSection={activeTab === "videos" ? "videos" : "library"}
        isOpenOnMobile={mobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      {/* ── Main Content Area ── */}
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

        {/* Library Main Content */}
        <main id="main-content" className="dashboard-content-area" tabIndex={-1}>
          {/* Hero Banner Header */}
          <div className="library-hero-banner">
            <div className="library-hero-text">
              <div className="dashboard-greeting-badge">
                <span aria-hidden="true">📚</span>
                <span>Renewable Energy Curriculum</span>
              </div>
              <h1 className="library-hero-title">Learning Library</h1>
              <p className="library-hero-subtitle">
                Master technical English for clean tech and STEM. Study authentic engineering passages, expand scientific vocabulary, and test comprehension.
              </p>
            </div>

            <div className="library-hero-stats-pill">
              <span className="library-stats-count">
                {completedIds.length} / {lessons.length}
              </span>
              <span className="library-stats-label">Completed</span>
            </div>
          </div>

          {/* Filter Tabs Bar */}
          <div className="library-tabs-bar" role="tablist" aria-label="Curriculum filters">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "all"}
              className={`library-tab-btn ${activeTab === "all" ? "library-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <span aria-hidden="true">📑</span>
              <span>All Lessons ({lessons.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "reading"}
              className={`library-tab-btn ${activeTab === "reading" ? "library-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("reading")}
            >
              <span aria-hidden="true">📖</span>
              <span>Reading Modules</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "flashcards"}
              className={`library-tab-btn ${activeTab === "flashcards" ? "library-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("flashcards")}
            >
              <span aria-hidden="true">🃏</span>
              <span>Flashcard Decks</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "videos"}
              className={`library-tab-btn ${activeTab === "videos" ? "library-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("videos")}
            >
              <span aria-hidden="true">📹</span>
              <span>Video Lessons ({videos.length})</span>
            </button>
          </div>

          {/* Tab Content Display */}
          {activeTab === "videos" ? (
            /* Video Lessons Grid */
            <div className="flex flex-col gap-4" role="tabpanel" aria-label="Video Lessons">
              {/* Level & Domain filter pills */}
              <div className="flex flex-col gap-2 rounded-2xl border border-orange-200/80 bg-white/80 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-16 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Level
                  </span>
                  {(["All", ...VIDEO_LEVELS] as const).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setLevelFilter(lv)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition ${
                        levelFilter === lv
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
                      }`}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-16 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Domain
                  </span>
                  {(["All", ...VIDEO_DOMAINS] as const).map((dm) => (
                    <button
                      key={dm}
                      type="button"
                      onClick={() => setDomainFilter(dm)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition ${
                        domainFilter === dm
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-amber-200 bg-white text-slate-700 hover:bg-amber-50"
                      }`}
                    >
                      {dm}
                    </button>
                  ))}
                </div>
              </div>

              {filteredVideos.length === 0 && (
                <p className="rounded-2xl border border-dashed border-orange-200 bg-white/60 p-6 text-center text-sm text-slate-500">
                  No videos match these filters yet. Try another level or domain.
                </p>
              )}

            <div className="library-lessons-grid">
              {filteredVideos.map((video) => {
                const thumb = getYouTubeThumbnail(video.youtube_url);
                return (
                  <article
                    key={video.id}
                    className="library-lesson-card flex flex-col overflow-hidden"
                    aria-labelledby={`video-card-title-${video.id}`}
                  >
                    {/* Video Thumbnail Preview */}
                    <button
                      type="button"
                      onClick={() => setActiveVideo(video)}
                      className="group relative mb-4 aspect-video w-full overflow-hidden rounded-xl border border-orange-200/70 bg-slate-900 text-left cursor-pointer"
                      aria-label={`Watch video: ${video.title}`}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={video.title}
                          className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 text-4xl">
                          🎥
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30 transition group-hover:bg-slate-950/45">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/95 text-xl font-bold text-white shadow-lg ring-4 ring-white/30 transition-transform duration-200 group-hover:scale-110">
                          ▶
                        </span>
                      </div>
                      <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-slate-950/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                        ⏱️ {video.duration_label || "10 mins"}
                      </span>
                    </button>

                    <div className="library-card-top-row">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200/80 bg-orange-100/80 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-orange-800">
                          <span aria-hidden="true">🎥</span>
                          <span>VIDEO</span>
                        </span>
                        <span className="library-card-topic-tag">
                          {video.category || "STEM"}
                        </span>
                        {video.level && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-extrabold text-sky-800">
                            {video.level}
                          </span>
                        )}
                        {video.domain && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                            {video.domain}
                          </span>
                        )}
                        {completedVideoIds.includes(video.id) && (
                          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>

                    <h2
                      id={`video-card-title-${video.id}`}
                      className="library-lesson-title"
                    >
                      {video.title}
                    </h2>

                    {video.description && (
                      <p className="library-lesson-summary">{video.description}</p>
                    )}

                    <div className="library-card-action-row mt-auto pt-3">
                      <button
                        type="button"
                        className="btn-open-lesson bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                        onClick={() => setActiveVideo(video)}
                        aria-label={`Watch Now: ${video.title}`}
                      >
                        <span>▶ Watch Now</span>
                        <span aria-hidden="true" className="btn-open-arrow">
                          →
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            </div>
          ) : (
            /* Lesson Grid View */
            <div className="library-lessons-grid" role="tabpanel" aria-label="Lessons list">
              {filteredLessons.map((lesson) => {
                const isCompleted = completedIds.includes(lesson.id);
                const isFlashcardDeck = lesson.lessonType === "flashcard";

                return (
                  <article
                    key={lesson.id}
                    className="library-lesson-card"
                    aria-labelledby={`lesson-card-title-${lesson.id}`}
                  >
                    <div className="library-card-top-row">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            isFlashcardDeck
                              ? "bg-amber-100/80 text-amber-800 border-amber-300/70"
                              : "bg-orange-100/80 text-orange-800 border-orange-200/80"
                          }`}
                        >
                          <span aria-hidden="true">{isFlashcardDeck ? "🎴" : "📖"}</span>
                          <span>{isFlashcardDeck ? "FLASHCARDS" : "READING"}</span>
                        </span>
                        <span className="library-card-topic-tag">{lesson.topic}</span>
                      </div>
                      <div className="library-card-status-tags">
                        <span className="library-card-level-tag">{lesson.level}</span>
                        {isCompleted && (
                          <span className="library-badge-completed" aria-label="Completed">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>

                    <h2
                      id={`lesson-card-title-${lesson.id}`}
                      className="library-lesson-title"
                    >
                      {lesson.title}
                    </h2>

                    <p className="library-lesson-summary">{lesson.summary}</p>

                    <div className="library-lesson-meta-row">
                      {isFlashcardDeck ? (
                        <span className="library-meta-item">
                          <span aria-hidden="true">🎴</span>
                          <span>{lesson.flashcards.length} flashcards</span>
                        </span>
                      ) : (
                        <>
                          <span className="library-meta-item">
                            <span aria-hidden="true">⏱️</span>
                            <span>{lesson.readingTime}</span>
                          </span>
                          <span className="library-meta-item text-slate-400" aria-hidden="true">
                            •
                          </span>
                          <span className="library-meta-item">
                            <span aria-hidden="true">❓</span>
                            <span>{lesson.quiz.length} questions</span>
                          </span>
                        </>
                      )}
                    </div>

                    <div className="library-card-action-row">
                      <button
                        type="button"
                        className="btn-open-lesson bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => setActiveLesson(lesson)}
                        aria-label={`${isFlashcardDeck ? "Practice flashcards" : "Start reading"}: ${lesson.title}`}
                      >
                        <span>{isFlashcardDeck ? "Practice Flashcards" : "Start Reading"}</span>
                        <span aria-hidden="true" className="btn-open-arrow">→</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Lesson Details & Interactive Reader Modal */}
      {activeLesson && (
        <LessonReaderModal
          lesson={activeLesson}
          isCompleted={completedIds.includes(activeLesson.id)}
          onToggleComplete={handleToggleComplete}
          onCompleteLesson={handleCompleteLesson}
          onClose={() => setActiveLesson(null)}
        />
      )}

      {/* In-App Video Player Modal (pauses background music automatically) */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-modal-title"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border border-orange-300/30 bg-slate-900 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-orange-300 border border-orange-400/30">
                  {activeVideo.category || "STEM"}
                </span>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                  ⏱️ {activeVideo.duration_label || "10 mins"}
                </span>
                {activeVideo.level && (
                  <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-300">
                    {activeVideo.level}
                  </span>
                )}
                {activeVideo.domain && (
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    {activeVideo.domain}
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">
                  🔇 Background music paused
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                aria-label="Close video player"
                title="Close video player (Esc)"
              >
                ✕
              </button>
            </div>

            {/* 16:9 Embedded Video Player */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={getYouTubeEmbedUrl(activeVideo.youtube_url)}
                title={activeVideo.title}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Video Metadata Footer */}
            <div className="flex flex-col gap-1.5 bg-slate-900 px-5 py-4">
              <h2
                id="video-modal-title"
                className="text-lg font-extrabold text-white md:text-xl"
              >
                {activeVideo.title}
              </h2>
              {activeVideo.description && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeVideo.description}
                </p>
              )}
            </div>

            {/* Language Immersion: Key Terms + Post-Video Quiz */}
            <VideoImmersionPanel
              video={activeVideo}
              onCompleted={(id) =>
                setCompletedVideoIds((prev) =>
                  prev.includes(id) ? prev : [...prev, id]
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
