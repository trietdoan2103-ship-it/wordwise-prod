import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Auth PKCE Callback Route (`/auth/callback`).
 *
 * Exchanges `?code=...` for a persistent session cookie and redirects the user
 * to the target route (`?next=/dashboard` by default).
 *
 * On Vercel production deployments, respects `x-forwarded-host` so users are
 * never accidentally redirected back to `localhost` behind a reverse proxy.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") ? rawNext : "/dashboard";

  const resolveRedirectUrl = (path: string): string => {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    if (isLocalEnv) {
      return `${origin}${path}`;
    }
    if (forwardedHost) {
      const proto = request.headers.get("x-forwarded-proto") ?? "https";
      return `${proto}://${forwardedHost}${path}`;
    }
    return `${origin}${path}`;
  };

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(resolveRedirectUrl(next));
    }
  }

  return NextResponse.redirect(resolveRedirectUrl("/?authError=callback_failed"));
}
