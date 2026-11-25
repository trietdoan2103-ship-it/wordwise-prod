"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute — Client-side Route Guard paired with Next.js Server Middleware.
 *
 * Rules:
 * 1. While SessionContext is hydrating from Supabase (`!isHydrated`),
 *    renders a non-intrusive loading spinner and does NOT redirect prematurely.
 * 2. If hydration completes and no session is found (`!session`),
 *    safely replaces the URL with `/`.
 * 3. When session exists, renders protected `children`.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, isHydrated } = useSession();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isHydrated && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/");
    }
  }, [isHydrated, session, router]);

  if (!isHydrated || !session) {
    return (
      <div className="dashboard-placeholder-loading" aria-live="polite">
        <div className="dashboard-loading-spinner" aria-hidden="true" />
        <p>Checking access…</p>
      </div>
    );
  }

  return <>{children}</>;
}

export { ProtectedRoute as RequireSession };
