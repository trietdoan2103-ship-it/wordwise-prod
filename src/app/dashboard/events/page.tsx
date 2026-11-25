"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import EventsView from "@/components/dashboard/EventsView";

/**
 * STEM English Events & Community Challenges — Milestone P4.3.
 *
 * Hub for upcoming hackathons, speaking workshops, and clean energy debate challenges.
 * Protected route: requires active demo session.
 */
export default function DashboardEventsPage() {
  return (
    <ProtectedRoute>
      <EventsView />
    </ProtectedRoute>
  );
}
