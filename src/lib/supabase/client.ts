import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Builds a dynamic `redirectTo` / `emailRedirectTo` callback URL using
 * `window.location.origin` in the browser so both `http://localhost:3000`
 * and Vercel preview/production domains work without hardcoded hosts.
 */
export function getAuthRedirectUrl(nextPath = "/dashboard"): string {
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
  }
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000");
  return `${siteUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
