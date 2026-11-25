import MissionRoom from "@/components/mission/MissionRoom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface CountryMissionPageProps {
  params: Promise<{ countryId: string }>;
}

export default async function CountryMissionPage({
  params,
}: CountryMissionPageProps) {
  const { countryId } = await params;

  return (
    <ProtectedRoute>
      <MissionRoom countryId={countryId} />
    </ProtectedRoute>
  );
}
