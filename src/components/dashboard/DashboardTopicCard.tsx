"use client";

import React, { useEffect, useState } from "react";
import { renewableEnergyLessons } from "@/data/lessons";
import { getCompletedCurriculumLessonIds } from "@/lib/learningProgress";

export default function DashboardTopicCard() {
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
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

  const readingCount = renewableEnergyLessons.filter((l) => l.category === "reading").length;
  const vocabCount = renewableEnergyLessons.filter((l) => l.category === "vocabulary").length;
  const notesCount = renewableEnergyLessons.filter((l) => l.category === "notes").length;
  const quizCount = renewableEnergyLessons.filter((l) => l.category === "quiz").length;

  return (
    <section
      className="dashboard-card dashboard-card--summary"
      aria-labelledby="resources-heading"
    >
      <div className="dashboard-card-header">
        <div className="dashboard-card-title-group">
          <span className="dashboard-card-tag dashboard-card-tag--curriculum">
            Curriculum Topic • {completedIds.length}/6 Completed
          </span>
          <h2 id="resources-heading" className="dashboard-card-title">
            Renewable Energy Modules
          </h2>
        </div>
        <span className="dashboard-goal-icon" aria-hidden="true">🔬</span>
      </div>

      <p className="dashboard-card-description">
        Curated English learning content designed for Vietnamese high-school students exploring STEM careers and international scholarships.
      </p>

      <div className="dashboard-resources-grid">
        <div className="dashboard-resource-item">
          <span className="dashboard-resource-icon" aria-hidden="true">📖</span>
          <div className="dashboard-resource-text">
            <strong>{readingCount} Reading Passages</strong>
            <span>Scientific texts &amp; charts</span>
          </div>
        </div>

        <div className="dashboard-resource-item">
          <span className="dashboard-resource-icon" aria-hidden="true">🔤</span>
          <div className="dashboard-resource-text">
            <strong>{vocabCount} Vocabulary Sets</strong>
            <span>Technical engineering words</span>
          </div>
        </div>

        <div className="dashboard-resource-item">
          <span className="dashboard-resource-icon" aria-hidden="true">📝</span>
          <div className="dashboard-resource-text">
            <strong>{notesCount} Study Guide</strong>
            <span>Key concepts &amp; grammar</span>
          </div>
        </div>

        <div className="dashboard-resource-item">
          <span className="dashboard-resource-icon" aria-hidden="true">❓</span>
          <div className="dashboard-resource-text">
            <strong>{quizCount} Practice Quiz</strong>
            <span>Reading comprehension test</span>
          </div>
        </div>
      </div>
    </section>
  );
}
