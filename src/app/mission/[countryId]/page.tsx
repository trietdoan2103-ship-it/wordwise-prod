import { unstable_noStore as noStore } from "next/cache";
import MissionRoom from "@/components/mission/MissionRoom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CountryMissionPageProps {
  params: Promise<{ countryId: string }>;
}

export default async function CountryMissionPage({
  params,
}: CountryMissionPageProps) {
  noStore();
  const { countryId } = await params;

  return (
    <ProtectedRoute>
      <MissionRoom countryId={countryId} />
    </ProtectedRoute>
  );
}
