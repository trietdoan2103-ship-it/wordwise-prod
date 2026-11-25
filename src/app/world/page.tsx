"use client";

import Topbar from "@/components/layout/Topbar";
import WorldMap from "@/components/world/WorldMap";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

/**
 * World Map page — Milestone 2.
 *
 * This is the main home screen of Wordwise.
 * Protected route: requires an active demo session.
 * Signed-out visitors are safely redirected to / via ProtectedRoute.
 */
export default function WorldPage() {
  return (
    <ProtectedRoute>
      <div className="world-page">
        <Topbar />
        <WorldMap />
      </div>
    </ProtectedRoute>
  );
}
