import { unstable_noStore as noStore } from "next/cache";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LearningLibraryView from "@/components/dashboard/LearningLibraryView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Video Lessons page — Live Supabase Single Source of Truth.
 */
export default function DashboardVideosPage() {
  noStore();
  return (
    <ProtectedRoute>
      <LearningLibraryView defaultTab="videos" />
    </ProtectedRoute>
  );
}
