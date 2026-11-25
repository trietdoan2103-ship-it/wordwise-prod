"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  pauseBackgroundMusic,
  resumeBackgroundMusic,
} from "@/components/layout/BackgroundMusicPlayer";

export const WORLD_INTRO_SEEN_KEY = "wordwise_world_intro_seen";
const INTRO_VIDEO_SRC = encodeURI("/video/I still remember so clearly.mp4");

interface WorldIntroOverlayProps {
  onClose: () => void;
}

export default function WorldIntroOverlay({ onClose }: WorldIntroOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMutedFallback, setIsMutedFallback] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  // Pause background music while the intro overlay is active, and resume on unmount
  useEffect(() => {
    pauseBackgroundMusic();
    return () => {
      resumeBackgroundMusic();
    };
  }, []);

  // Attempt unmuted autoplay first; gracefully fall back to muted autoplay if blocked
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    async function startPlayback() {
      const v = videoRef.current;
      if (!v) return;
      try {
        v.muted = false;
        await v.play();
        if (!cancelled) {
          setIsMutedFallback(false);
        }
      } catch {
        if (cancelled) return;
        try {
          v.muted = true;
          setIsMutedFallback(true);
          await v.play();
        } catch {
          // If playback still fails (e.g. missing file or strict policy), user can click Unmute or Skip
          setIsMutedFallback(true);
        }
      }
    }

    void startPlayback();
    return () => {
      cancelled = true;
    };
  }, []);

  function markIntroSeen() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(WORLD_INTRO_SEEN_KEY, "true");
    } catch {
      /* ignore storage errors */
    }
  }

  function handleSkipOrFinish() {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    markIntroSeen();
    resumeBackgroundMusic();
    onClose();
  }

  function handleUnmute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMutedFallback(false);
    video.play().catch(() => {});
  }

  function handleRewatch() {
    const video = videoRef.current;
    if (!video) return;
    setIsEnded(false);
    video.currentTime = 0;
    video.muted = false;
    setIsMutedFallback(false);
    video.play().catch(() => {
      video.muted = true;
      setIsMutedFallback(true);
      video.play().catch(() => {});
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Wordwise World Adventure Intro Video"
    >
      {/* Full-Viewport Cinematic Video */}
      <video
        ref={videoRef}
        src={INTRO_VIDEO_SRC}
        playsInline
        autoPlay
        onEnded={() => setIsEnded(true)}
        className="h-full w-full object-contain md:object-cover"
      />

      {/* Top-Left Floating Unmute Pill (shown only when browser forced muted autoplay) */}
      {isMutedFallback && !isEnded && (
        <button
          type="button"
          onClick={handleUnmute}
          className="fixed top-5 left-5 z-60 inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-slate-950/75 px-4 py-2 text-xs sm:text-sm font-extrabold text-amber-200 shadow-lg backdrop-blur-md transition hover:scale-105 hover:border-amber-300 hover:bg-slate-900/90 cursor-pointer"
          aria-label="Unmute intro video"
        >
          <span aria-hidden="true">🔊</span>
          <span>Unmute</span>
        </button>
      )}

      {/* Top-Right Translucent Skip Intro Button */}
      <button
        type="button"
        onClick={handleSkipOrFinish}
        className="fixed top-5 right-5 z-60 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-slate-950/65 px-4 py-2 text-xs sm:text-sm font-extrabold text-white/95 shadow-lg backdrop-blur-md transition hover:border-amber-300/70 hover:bg-slate-900/90 hover:text-amber-200 cursor-pointer"
        aria-label="Skip Intro"
      >
        <span>Skip Intro</span>
        <span aria-hidden="true">⏭</span>
      </button>

      {/* End-of-Video Action Overlay */}
      {isEnded && (
        <div className="absolute inset-0 z-55 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border-2 border-amber-300/70 bg-gradient-to-b from-[#fffaf0]/95 via-amber-50/95 to-orange-50/95 p-6 sm:p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-3xl text-white shadow-md"
              aria-hidden="true"
            >
              🌍
            </span>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-orange-700">
                Global STEM &amp; Language Journey
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                Ready to Explore the World?
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600">
                Select an unlocked destination pin on the World Map to begin your mission.
              </p>
            </div>

            <div className="mt-2 flex w-full flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRewatch}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-2xl border-2 border-orange-200 bg-white/90 px-4 py-3 text-sm font-extrabold text-slate-700 shadow-xs transition hover:border-orange-300 hover:bg-orange-50 cursor-pointer"
              >
                <span aria-hidden="true">↺</span>
                <span>Rewatch Intro</span>
              </button>
              <button
                type="button"
                onClick={handleSkipOrFinish}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-105 cursor-pointer"
              >
                <span>Start Adventure</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
