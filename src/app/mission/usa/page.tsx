import { unstable_noStore as noStore } from "next/cache";
import MissionRoom from "@/components/mission/MissionRoom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function USAMissionPage() {
  noStore();
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
