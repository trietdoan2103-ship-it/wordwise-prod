"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * Dashboard page — Milestone P2.
 *
 * Renders the full Wordwise learning hub with sidebar, overview trackers,
 * learning progress (Renewable Energy theme), and world map access.
 * Protected route: requires an active demo session.
 */
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardShell />
    </ProtectedRoute>
  );
}
