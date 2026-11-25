"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SubscriptionView from "@/components/dashboard/SubscriptionView";

/**
 * Subscription Tiers & Pricing Hub — Milestone P4.4.
 *
 * Transparent SaaS educational pricing comparison showing Free vs Pro tiers,
 * student pricing, and zero-payment 7-day demo trial toggle.
 * Protected route: requires active demo session.
 */
export default function DashboardSubscriptionPage() {
  return (
    <ProtectedRoute>
      <SubscriptionView />
    </ProtectedRoute>
  );
}
