"use client";

import MissionRoom from "@/components/mission/MissionRoom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function USAMissionPage() {
  return (
    <ProtectedRoute>
      <MissionRoom
        countryId="usa"
        missionId="renewable-energy"
        countryFlag="🇺🇸"
        countryName="USA"
      />
    </ProtectedRoute>
  );
}
