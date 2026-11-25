"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RankingsView from "@/components/dashboard/RankingsView";

/**
 * Community Rankings & Leaderboard — Milestone P4.2.
 *
 * Transparent demo leaderboard showcasing high-school STEM English competitive rankings
 * across specialized schools (THPT Chuyên), Top 3 podium, and user's pinned position.
 * Protected route: requires active demo session.
 */
export default function DashboardRankingsPage() {
  return (
    <ProtectedRoute>
      <RankingsView />
    </ProtectedRoute>
  );
}
