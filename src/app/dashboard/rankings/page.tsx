import { unstable_noStore as noStore } from "next/cache";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RankingsView from "@/components/dashboard/RankingsView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Community Rankings & Leaderboard — Live Supabase Single Source of Truth.
 *
 * Static caching disabled (`force-dynamic` + `noStore()`) so Vercel always
 * serves fresh real-time rankings across all devices and accounts.
 */
export default function DashboardRankingsPage() {
  noStore();
  return (
    <ProtectedRoute>
      <RankingsView />
    </ProtectedRoute>
  );
}
