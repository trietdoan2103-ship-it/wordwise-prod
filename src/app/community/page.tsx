"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import CommunityView from "@/components/community/CommunityView";

export default function CommunityPage() {
  return (
    <ProtectedRoute>
      <CommunityView />
    </ProtectedRoute>
  );
}
