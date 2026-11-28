import { unstable_noStore as noStore } from "next/cache";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import EventsView from "@/components/dashboard/EventsView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * STEM English Events & Community Challenges — Live Supabase Single Source of Truth.
 */
export default function DashboardEventsPage() {
  noStore();
  return (
    <ProtectedRoute>
      <EventsView />
    </ProtectedRoute>
  );
}
