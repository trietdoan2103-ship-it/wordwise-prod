"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminCmsView from "@/components/dashboard/AdminCmsView";
import { useSession } from "@/context/SessionContext";

/**
 * Content Management Hub — Sprint 6.
 * Protected route: requires an authenticated Supabase session with role === "admin".
 */
export default function DashboardAdminPage() {
  const router = useRouter();
  const { session, isHydrated } = useSession();

  useEffect(() => {
    if (isHydrated && (!session || session.role !== "admin")) {
      router.replace("/dashboard");
    }
  }, [isHydrated, session, router]);

  if (!isHydrated || !session || session.role !== "admin") {
    return null;
  }

  return (
    <ProtectedRoute>
      <AdminCmsView />
    </ProtectedRoute>
  );
}
