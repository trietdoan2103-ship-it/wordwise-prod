"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AchievementsView from "@/components/dashboard/AchievementsView";

/**
 * Achievements & Learning Streak Hub — Milestone P4.1.
 *
 * Displays live user learning streak (7-day calendar view) and
 * real-action achievement badges calculated dynamically from actual app progress.
 * Protected route: requires active demo session.
 */
export default function DashboardAchievementsPage() {
  return (
    <ProtectedRoute>
      <AchievementsView />
    </ProtectedRoute>
  );
}
