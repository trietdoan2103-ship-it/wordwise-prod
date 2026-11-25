"use client";

import React, { useEffect, useState } from "react";
import { renewableEnergyLessons } from "@/data/lessons";
import {
  calculateLearningProgress,
  getCompletedCurriculumLessonIds,
} from "@/lib/learningProgress";

export default function LearningProgressCard() {
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    // Initial read
    setCompletedIds(getCompletedCurriculumLessonIds());

    function handleUpdate() {
      setCompletedIds(getCompletedCurriculumLessonIds());
    }

    window.addEventListener("wordwise_curriculum_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("wordwise_curriculum_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const totalLessons = 6;
  const completedLessons = completedIds.length;
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const lessonsRemaining = Math.max(0, totalLessons - completedLessons);

  return (
    <section
      className="dashboard-card dashboard-card--progress"
      aria-labelledby="learning-progress-heading"
    >
      <div className="dashboard-card-header">
        <div className="dashboard-card-title-group">
          <span className="dashboard-card-tag bg-orange-50 text-orange-700 border border-orange-200">Curriculum Track</span>
          <h2 id="learning-progress-heading" className="dashboard-card-title">
            Learning Progress
          </h2>
          <p className="dashboard-card-subtitle">
            STEM Focus: Renewable Energy &amp; Clean Technology
          </p>
        </div>
        <div className="dashboard-progress-percentage-badge">
          <span className="dashboard-progress-pct-value text-orange-600">{progressPercentage}%</span>
          <span className="dashboard-progress-pct-label text-orange-700">Completed</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="dashboard-progress-bar-wrapper">
        <div
          className="dashboard-progress-track bg-orange-100/80"
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Curriculum progress: ${progressPercentage}% completed`}
        >
          <div
            className="dashboard-progress-fill bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Metrics breakdown */}
      <div className="dashboard-progress-stats-grid">
        <div className="dashboard-stat-box">
          <span className="dashboard-stat-box-value">{completedLessons}</span>
          <span className="dashboard-stat-box-label">Completed Lessons</span>
        </div>
        <div className="dashboard-stat-box">
          <span className="dashboard-stat-box-value">{totalLessons}</span>
          <span className="dashboard-stat-box-label">Total Lessons</span>
        </div>
        <div className="dashboard-stat-box">
          <span className="dashboard-stat-box-value">{lessonsRemaining}</span>
          <span className="dashboard-stat-box-label">Lessons Remaining</span>
        </div>
      </div>

      {/* Status note */}
      <div className="dashboard-progress-footer-note">
        <span aria-hidden="true" className="dashboard-note-icon">🌱</span>
        <p className="dashboard-note-text">
          {lessonsRemaining === 0 ? (
            <>
              🎉 Amazing achievement! You have completed all <strong>{totalLessons} lessons</strong> in this track.
            </>
          ) : (
            <>
              You have <strong>{lessonsRemaining} {lessonsRemaining === 1 ? "lesson" : "lessons"} remaining</strong> to complete your STEM clean energy track.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
