"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LearningLibraryView from "@/components/dashboard/LearningLibraryView";

/**
 * Learning Library Hub page — Milestone P3.1.
 *
 * Displays the 6 STEM clean-tech curriculum lessons with tab filters,
 * lesson cards, completion tracking, and reading modal.
 * Protected route: requires active demo session.
 */
export default function DashboardLibraryPage() {
  return (
    <ProtectedRoute>
      <LearningLibraryView defaultTab="all" />
    </ProtectedRoute>
  );
}
