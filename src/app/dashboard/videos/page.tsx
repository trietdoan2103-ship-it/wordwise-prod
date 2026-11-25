"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LearningLibraryView from "@/components/dashboard/LearningLibraryView";

/**
 * Video Lessons page — Milestone P3.1.
 *
 * Displays the Video Lessons tab in Learning Library with a polished empty state.
 * Protected route: requires active demo session.
 */
export default function DashboardVideosPage() {
  return (
    <ProtectedRoute>
      <LearningLibraryView defaultTab="videos" />
    </ProtectedRoute>
  );
}
