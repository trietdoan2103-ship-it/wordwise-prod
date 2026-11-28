import { unstable_noStore as noStore } from "next/cache";
import Topbar from "@/components/layout/Topbar";
import WorldMap from "@/components/world/WorldMap";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * World Map page — Live Supabase Single Source of Truth.
 */
export default function WorldPage() {
  noStore();
  return (
    <ProtectedRoute>
      <div className="world-page">
        <Topbar />
        <WorldMap />
      </div>
    </ProtectedRoute>
  );
}
