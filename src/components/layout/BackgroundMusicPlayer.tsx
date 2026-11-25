"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/context/SessionContext";

/**
 * BackgroundMusicPlayer
 *
 * Loops /audio/WWS2.wav continuously across authenticated dashboard routes.
 * Automatically pauses when entering game routes (/world, /mission/*, /completion/*)
 * so it never collides with game SFX or English listening audio.
 */
/**
 * Dispatches a global signal to temporarily pause background music
 * (e.g., while watching an in-app video lesson).
 */
export function pauseBackgroundMusic(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("wordwise_pause_bgm"));
}

/**
 * Dispatches a global signal to resume background music after an
 * interrupting media modal is closed.
 */
export function resumeBackgroundMusic(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("wordwise_resume_bgm"));
}

export default function BackgroundMusicPlayer() {
  const { session } = useSession();
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSuspendedByMedia, setIsSuspendedByMedia] = useState(false);

  const isGameRoute = Boolean(
    pathname?.startsWith("/world") ||
    pathname?.startsWith("/mission") ||
    pathname?.startsWith("/completion")
  );

  // Listen for in-app media (such as Video Lessons modal) pausing/resuming BGM
  useEffect(() => {
    function handlePauseBgm() {
      setIsSuspendedByMedia(true);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
    function handleResumeBgm() {
      setIsSuspendedByMedia(false);
    }

    window.addEventListener("wordwise_pause_bgm", handlePauseBgm);
    window.addEventListener("wordwise_resume_bgm", handleResumeBgm);
    return () => {
      window.removeEventListener("wordwise_pause_bgm", handlePauseBgm);
      window.removeEventListener("wordwise_resume_bgm", handleResumeBgm);
    };
  }, []);

  // Initialize audio parameters on mount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.25;
      audioRef.current.loop = true;
    }
  }, []);

  // Manage playback based on session, active route, and mute status
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!session) {
      // User signed out: pause and reset track position
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    if (isGameRoute || isMuted || isSuspendedByMedia) {
      // Paused for game route, active video player modal, or manual user mute
      audio.pause();
      setIsPlaying(false);
      return;
    }

    // Play/resume music on dashboard routes
    audio.volume = 0.25;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Gracefully ignore browser autoplay restriction until user interaction
          setIsPlaying(false);
        });
    }
  }, [session, isGameRoute, isMuted, isSuspendedByMedia, pathname]);

  // First user interaction listener to unlock audio if browser autoplay was blocked
  useEffect(() => {
    function handleFirstInteraction() {
      const audio = audioRef.current;
      if (
        audio &&
        Boolean(session) &&
        !isGameRoute &&
        !isMuted &&
        !isSuspendedByMedia &&
        audio.paused
      ) {
        audio.volume = 0.25;
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [session, isGameRoute, isMuted, isSuspendedByMedia]);

  function handleToggleMute() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted || audio.paused) {
      setIsMuted(false);
      audio.volume = 0.25;
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      setIsMuted(true);
      audio.pause();
      setIsPlaying(false);
    }
  }

  // Only show the floating control pill on authenticated non-game routes
  const showToggle = Boolean(session) && !isGameRoute;

  return (
    <>
      <audio
        ref={audioRef}
        src="/audio/WWS2.wav"
        preload="auto"
        loop
      />

      {showToggle && (
        <button
          type="button"
          onClick={handleToggleMute}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-orange-200 shadow-lg rounded-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-orange-400 hover:text-orange-600 transition cursor-pointer"
          aria-label={isMuted || !isPlaying ? "Unmute background music" : "Mute background music"}
          title={isMuted || !isPlaying ? "Click to play music" : "Click to mute music"}
        >
          <span aria-hidden="true">
            {isMuted || !isPlaying ? "🔇" : "🔊"}
          </span>
          <span>
            {isMuted || !isPlaying ? "Muted" : "Music On"}
          </span>
        </button>
      )}
    </>
  );
}

