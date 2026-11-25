"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, getAuthRedirectUrl } from "@/lib/supabase/client";
import type { DbProfile } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
  schoolName: string;
  role: "student" | "admin";
  subscriptionTier: "free" | "pro_trial" | "pro";
}

/** Backward-compatible alias */
export type DemoSession = UserSession;

export interface SessionContextValue {
  /** Null while hydrating or when unauthenticated */
  session: UserSession | null;
  /** True once initial Supabase auth + profile check completes */
  isHydrated: boolean;
  /** Backward-compatible inverse of isHydrated */
  loading: boolean;
  /** Register a new account with Supabase Auth and persist profile */
  signUp: (
    email: string,
    password: string,
    displayName: string,
    schoolName?: string
  ) => Promise<{ error: string | null }>;
  /** Sign in an existing user with email and password */
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  /** Sign out from Supabase Auth and clear session state */
  logout: () => Promise<void>;
  /** Alias for logout() used by existing navigation components */
  signOut: () => Promise<void>;
  /** Re-fetch current user's profile row from public.profiles */
  refreshProfile: () => Promise<void>;
  /** Derive a friendly fallback display name from an email address */
  deriveDisplayName: (email: string) => string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function deriveDisplayName(email: string): string {
  const localPart = (email.split("@")[0] || "").trim();
  const cleaned = localPart.replace(/[._\-+]+/g, " ").trim();

  if (!cleaned) return "Learner";

  const words = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  return words.join(" ").trim() || "Learner";
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url !== "your_supabase_project_url" &&
      key !== "your_supabase_anon_key" &&
      url.startsWith("http")
  );
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const fetchOrEnsureProfile = useCallback(
    async (user: User): Promise<UserSession> => {
      const supabase = createClient();
      const email = user.email || "";
      const metaName =
        (user.user_metadata?.display_name as string | undefined)?.trim() ||
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        deriveDisplayName(email);
      const metaSchool =
        (user.user_metadata?.school_name as string | undefined)?.trim() ||
        "High School Student";

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle<DbProfile>();

      if (profile && !error) {
        return {
          id: user.id,
          email: profile.email || email,
          displayName: profile.display_name || metaName,
          schoolName: profile.school_name || metaSchool,
          role: profile.role === "admin" ? "admin" : "student",
          subscriptionTier:
            profile.subscription_tier === "pro" ||
            profile.subscription_tier === "pro_trial"
              ? profile.subscription_tier
              : "free",
        };
      }

      // Upsert fallback profile if trigger hasn't fired or row is missing
      const { data: upserted } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email,
            display_name: metaName,
            school_name: metaSchool,
          },
          { onConflict: "id" }
        )
        .select("*")
        .maybeSingle<DbProfile>();

      return {
        id: user.id,
        email: upserted?.email || email,
        displayName: upserted?.display_name || metaName,
        schoolName: upserted?.school_name || metaSchool,
        role: upserted?.role === "admin" ? "admin" : "student",
        subscriptionTier:
          upserted?.subscription_tier === "pro" ||
          upserted?.subscription_tier === "pro_trial"
            ? upserted.subscription_tier
            : "free",
      };
    },
    []
  );

  // Hydrate auth session and subscribe to auth state changes on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsHydrated(true);
      return;
    }

    const supabase = createClient();
    let isMounted = true;

    async function initAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (user) {
          const userSession = await fetchOrEnsureProfile(user);
          if (isMounted) setSession(userSession);
        } else {
          setSession(null);
        }
      } catch {
        if (isMounted) setSession(null);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !authSession?.user) {
        setSession(null);
        setIsHydrated(true);
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        const userSession = await fetchOrEnsureProfile(authSession.user);
        if (isMounted) {
          setSession(userSession);
          setIsHydrated(true);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchOrEnsureProfile]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      schoolName?: string
    ): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured()) {
        return {
          error:
            "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
        };
      }

      const supabase = createClient();
      const cleanEmail = email.trim();
      const cleanName = displayName.trim() || deriveDisplayName(cleanEmail);
      const cleanSchool = (schoolName || "").trim() || "High School Student";

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : getAuthRedirectUrl("/dashboard"),
          data: {
            display_name: cleanName,
            school_name: cleanSchool,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.user) {
        return { error: "Could not create account. Please try again." };
      }

      // Immediately persist display_name and school_name in public.profiles
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: cleanEmail,
          display_name: cleanName,
          school_name: cleanSchool,
        },
        { onConflict: "id" }
      );

      const userSession = await fetchOrEnsureProfile(data.user);
      setSession(userSession);
      return { error: null };
    },
    [fetchOrEnsureProfile]
  );

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured()) {
        return {
          error:
            "Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
        };
      }

      const supabase = createClient();
      const cleanEmail = email.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.user) {
        return { error: "Invalid login credentials." };
      }

      const userSession = await fetchOrEnsureProfile(data.user);
      setSession(userSession);
      return { error: null };
    },
    [fetchOrEnsureProfile]
  );

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const userSession = await fetchOrEnsureProfile(user);
      setSession(userSession);
    }
  }, [fetchOrEnsureProfile]);

  const value: SessionContextValue = {
    session,
    isHydrated,
    loading: !isHydrated,
    signUp,
    signIn,
    logout,
    signOut: logout,
    refreshProfile,
    deriveDisplayName,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a <SessionProvider>");
  }
  return ctx;
}
