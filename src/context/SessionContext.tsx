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

export const LEADERBOARD_AVATAR_POOL = [
  "🧑‍🔬",
  "👩‍💻",
  "🧑‍🚀",
  "👩‍🔬",
  "🧑‍💼",
  "👩‍🎓",
  "🧑‍🔧",
  "🧑‍💻",
] as const;

export function getDeterministicAvatar(
  userId: string,
  customAvatar?: string | null,
  rawFreezeCount?: number | null
): string {
  if (
    customAvatar &&
    typeof customAvatar === "string" &&
    (LEADERBOARD_AVATAR_POOL as readonly string[]).includes(customAvatar.trim())
  ) {
    return customAvatar.trim();
  }
  if (typeof rawFreezeCount === "number" && rawFreezeCount >= 10000) {
    const encodedIdx = Math.floor(rawFreezeCount / 10000) - 1;
    if (encodedIdx >= 0 && encodedIdx < LEADERBOARD_AVATAR_POOL.length) {
      return LEADERBOARD_AVATAR_POOL[encodedIdx];
    }
  }
  let hash = 0;
  const seed = userId || "explorer";
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return LEADERBOARD_AVATAR_POOL[hash % LEADERBOARD_AVATAR_POOL.length];
}

// ─── Profanity & Spam Username Guard ──────────────────────────────────────────

const PROFANE_EXACT_TOKENS = new Set([
  "fuck",
  "fucker",
  "fucking",
  "fck",
  "fuk",
  "fuq",
  "shit",
  "shitty",
  "bullshit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "slut",
  "whore",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "stfu",
  "gtfo",
  "wtf",
  "wth",
  "lmao",
  "dm",
  "dmm",
  "dcm",
  "dkm",
  "vcl",
  "vl",
  "vkl",
  "vler",
  "cc",
  "cl",
  "clgt",
  "dit",
  "djt",
  "du",
  "duma",
  "deo",
  "lon",
  "loz",
  "buoi",
  "cac",
  "cak",
  "chich",
  "xoac",
  "ngu",
  "nguu",
]);

const PROFANE_SUBSTRINGS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "nigger",
  "nigga",
  "faggot",
  "cunt",
  "whore",
  "ditme",
  "ditconme",
  "duconme",
  "duma",
  "vailon",
  "vaicalon",
  "concho",
  "chochet",
  "matday",
  "khonnan",
];

function normalizeForModeration(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Lightweight validation check on sign-up and profile/display-name updates
 * to reject abusive/profane strings or pure-symbol spam (such as "=)").
 * Returns an error string if invalid, or null if valid.
 */
export function validateDisplayName(rawName: string): string | null {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return "Full name / display name is required.";
  }
  if (trimmed.length < 2) {
    return "Display name must be at least 2 characters long.";
  }
  if (trimmed.length > 40) {
    return "Display name must be 40 characters or fewer.";
  }

  // Reject pure-symbol spam (such as "=)", ":)", "???", "1234")
  const letterMatches = trimmed.match(/\p{L}/gu) || [];
  if (letterMatches.length < 2) {
    return "Please enter a real display name with at least 2 letters (symbol-only names like '=)' are not allowed).";
  }

  // Reject strings containing disallowed punctuation/emoticon characters
  if (/[=<>[\]{}|\\^~`@#$%*&?!:;()+/]/.test(trimmed)) {
    return "Display name can only contain letters, numbers, spaces, hyphens, or periods (avoid symbols like '=)' ).";
  }

  // Reject excessive repeated characters (e.g. "aaaaaaa")
  if (/(.)\1{4,}/iu.test(trimmed)) {
    return "Please enter a valid display name without repeated character spam.";
  }

  // Profanity check (English & Vietnamese, accent-insensitive)
  const normalized = normalizeForModeration(trimmed);
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    if (PROFANE_EXACT_TOKENS.has(token)) {
      return "Please choose a respectful display name appropriate for our student learning community.";
    }
  }

  for (const sub of PROFANE_SUBSTRINGS) {
    if (compact.includes(sub)) {
      return "Please choose a respectful display name appropriate for our student learning community.";
    }
  }

  return null;
}

/**
 * Validates optional high school name for profanity or pure-symbol spam.
 */
export function validateSchoolName(rawSchool: string): string | null {
  const trimmed = rawSchool.trim();
  if (!trimmed) return null; // Optional field
  if (trimmed.length > 70) {
    return "High school name must be 70 characters or fewer.";
  }
  const letterMatches = trimmed.match(/\p{L}/gu) || [];
  if (letterMatches.length < 2) {
    return "Please enter a valid high school name with at least 2 letters.";
  }
  const normalized = normalizeForModeration(trimmed);
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    if (PROFANE_EXACT_TOKENS.has(token)) {
      return "Please enter a respectful high school name.";
    }
  }
  for (const sub of PROFANE_SUBSTRINGS) {
    if (compact.includes(sub)) {
      return "Please enter a respectful high school name.";
    }
  }
  return null;
}

/**
 * Sanitizes a display name retrieved from the database so that any legacy row
 * containing profanity or symbol spam (e.g. "=)") never renders on the Leaderboard.
 */
export function sanitizeDisplayName(
  rawName: string | null | undefined,
  fallback = "STEM Explorer"
): string {
  const candidate = (rawName || "").trim();
  if (!candidate) return fallback;
  if (validateDisplayName(candidate) !== null) {
    return fallback;
  }
  return candidate;
}

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
  schoolName: string;
  avatar: string;
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
  /** Update the current user's display name, school name, or avatar in Supabase profiles */
  updateProfile: (updates: {
    displayName?: string;
    schoolName?: string;
    avatar?: string;
  }) => Promise<{ error: string | null }>;
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

      const isHardcodedAdminEmail =
        email.trim().toLowerCase() === "trietdoan2103@gmail.com";

      if (profile && !error) {
        const cleanFallbackName = sanitizeDisplayName(
          metaName,
          sanitizeDisplayName(deriveDisplayName(email), "STEM Explorer")
        );
        const safeName = sanitizeDisplayName(
          profile.display_name,
          cleanFallbackName
        );
        const safeSchool =
          validateSchoolName(profile.school_name || "") === null
            ? (profile.school_name || "").trim() || metaSchool
            : "High School Student";
        const resolvedRole: "student" | "admin" =
          profile.role === "admin" || isHardcodedAdminEmail
            ? "admin"
            : "student";

        // Auto-clean legacy profane/symbol-spam display_name or promote configured admin email in Supabase
        if (
          (profile.display_name && profile.display_name.trim() !== safeName) ||
          (isHardcodedAdminEmail && profile.role !== "admin")
        ) {
          void supabase
            .from("profiles")
            .update({
              display_name: safeName,
              ...(isHardcodedAdminEmail ? { role: "admin" } : {}),
            })
            .eq("id", user.id);
        }

        return {
          id: user.id,
          email: profile.email || email,
          displayName: safeName,
          schoolName: safeSchool,
          avatar: getDeterministicAvatar(
            user.id,
            profile.avatar_url,
            profile.freeze_count
          ),
          role: resolvedRole,
          subscriptionTier:
            profile.subscription_tier === "pro" ||
            profile.subscription_tier === "pro_trial"
              ? profile.subscription_tier
              : "free",
        };
      }

      const safeMetaName = sanitizeDisplayName(
        metaName,
        sanitizeDisplayName(deriveDisplayName(email), "STEM Explorer")
      );
      const safeMetaSchool =
        validateSchoolName(metaSchool) === null
          ? metaSchool
          : "High School Student";

      // Upsert fallback profile if trigger hasn't fired or row is missing
      const { data: upserted } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email,
            display_name: safeMetaName,
            school_name: safeMetaSchool,
          },
          { onConflict: "id" }
        )
        .select("*")
        .maybeSingle<DbProfile>();

      return {
        id: user.id,
        email: upserted?.email || email,
        displayName: sanitizeDisplayName(upserted?.display_name, safeMetaName),
        schoolName: upserted?.school_name || safeMetaSchool,
        avatar: getDeterministicAvatar(
          user.id,
          upserted?.avatar_url,
          upserted?.freeze_count
        ),
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
      const rawName = displayName.trim();

      const nameValidationError = validateDisplayName(rawName);
      if (nameValidationError) {
        return { error: nameValidationError };
      }

      const rawSchool = (schoolName || "").trim();
      if (rawSchool) {
        const schoolValidationError = validateSchoolName(rawSchool);
        if (schoolValidationError) {
          return { error: schoolValidationError };
        }
      }

      const cleanName = rawName;
      const cleanSchool = rawSchool || "High School Student";

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

  const updateProfile = useCallback(
    async (updates: {
      displayName?: string;
      schoolName?: string;
      avatar?: string;
    }): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured()) {
        return { error: "Supabase is not configured." };
      }

      if (updates.displayName !== undefined) {
        const nameErr = validateDisplayName(updates.displayName);
        if (nameErr) return { error: nameErr };
      }

      if (updates.schoolName !== undefined && updates.schoolName.trim()) {
        const schoolErr = validateSchoolName(updates.schoolName);
        if (schoolErr) return { error: schoolErr };
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { error: "You must be logged in to update your profile." };
      }

      const { data: currentProf } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle<DbProfile>();

      const nextName =
        updates.displayName !== undefined
          ? updates.displayName.trim()
          : currentProf?.display_name || session?.displayName || "STEM Explorer";
      const nextSchool =
        updates.schoolName !== undefined
          ? updates.schoolName.trim() || "High School Student"
          : currentProf?.school_name || session?.schoolName || "High School Student";
      const nextAvatar =
        updates.avatar &&
        (LEADERBOARD_AVATAR_POOL as readonly string[]).includes(updates.avatar)
          ? updates.avatar
          : getDeterministicAvatar(
              user.id,
              currentProf?.avatar_url,
              currentProf?.freeze_count
            );

      const avatarIdx = Math.max(
        0,
        (LEADERBOARD_AVATAR_POOL as readonly string[]).indexOf(nextAvatar)
      );
      const rawFreeze =
        typeof currentProf?.freeze_count === "number"
          ? currentProf.freeze_count
          : 1;
      const actualFreeze = rawFreeze >= 100 ? rawFreeze % 100 : rawFreeze;
      const existingModules =
        rawFreeze >= 1000
          ? Math.floor((rawFreeze % 1000) / 100)
          : rawFreeze >= 100
            ? Math.floor((rawFreeze % 10000) / 100)
            : typeof currentProf?.completed_modules === "number"
              ? currentProf.completed_modules
              : 0;
      const encodedFreeze =
        (avatarIdx + 1) * 10000 +
        1000 +
        Math.min(6, Math.max(0, existingModules)) * 100 +
        (actualFreeze % 100);

      const basePayload: Record<string, unknown> = {
        display_name: nextName,
        school_name: nextSchool,
        freeze_count: encodedFreeze,
      };

      const { error: fullErr } = await supabase
        .from("profiles")
        .update({
          ...basePayload,
          avatar_url: nextAvatar,
        })
        .eq("id", user.id);

      if (fullErr) {
        const { error: fallbackErr } = await supabase
          .from("profiles")
          .update(basePayload)
          .eq("id", user.id);
        if (fallbackErr) {
          return { error: fallbackErr.message };
        }
      }

      const updatedSession = await fetchOrEnsureProfile(user);
      setSession({
        ...updatedSession,
        displayName: nextName,
        schoolName: nextSchool,
        avatar: nextAvatar,
      });

      return { error: null };
    },
    [fetchOrEnsureProfile, session?.displayName, session?.schoolName]
  );

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("wordwise_progress");
        localStorage.removeItem("wordwise_curriculum_progress");
      } catch {
        // ignore
      }
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
    updateProfile,
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
