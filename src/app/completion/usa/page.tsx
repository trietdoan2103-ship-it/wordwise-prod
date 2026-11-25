"use client";

import CompletionCeremony from "@/components/rewards/CompletionCeremony";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function USACompletionPage() {
  return (
    <ProtectedRoute>
      <CompletionCeremony countryId="usa" />
    </ProtectedRoute>
  );
}
