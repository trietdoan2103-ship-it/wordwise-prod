import CompletionCeremony from "@/components/rewards/CompletionCeremony";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface CountryCompletionPageProps {
  params: Promise<{ countryId: string }>;
}

export default async function CountryCompletionPage({
  params,
}: CountryCompletionPageProps) {
  const { countryId } = await params;

  return (
    <ProtectedRoute>
      <CompletionCeremony countryId={countryId} />
    </ProtectedRoute>
  );
}
