"use client";

import React from "react";

export default function DashboardGoalCard() {
  return (
    <section
      className="dashboard-card dashboard-card--summary"
      aria-labelledby="daily-goal-heading"
    >
      <div className="dashboard-card-header">
        <div className="dashboard-card-title-group">
          <span className="dashboard-card-tag dashboard-card-tag--goal">Daily Target</span>
          <h2 id="daily-goal-heading" className="dashboard-card-title">
            Today&apos;s Learning Goal
          </h2>
        </div>
        <span className="dashboard-goal-icon" aria-hidden="true">🎯</span>
      </div>

      <div className="dashboard-goal-content">
        <div className="dashboard-goal-target-row">
          <div className="dashboard-goal-check" aria-hidden="true">○</div>
          <div>
            <p className="dashboard-goal-target-title">
              Complete 1 Clean Energy reading lesson
            </p>
            <p className="dashboard-goal-target-sub">
              Estimated 8–10 minutes · Technical English &amp; Scientific Terminology
            </p>
          </div>
        </div>

        <div className="dashboard-goal-tip-box">
          <span aria-hidden="true">💡</span>
          <p className="dashboard-goal-tip-text">
            <strong>Study Tip:</strong> Pay attention to noun compounds like <em>photovoltaic array</em> and <em>grid stability</em> when reading scientific texts.
          </p>
        </div>
      </div>
    </section>
  );
}
