/**
 * Subscription Tier Storage — Sprint 5 (Supabase + Local Cache Sync).
 *
 * Syncs `subscription_tier` with `public.profiles` in Supabase while maintaining
 * a synchronous cache (`wordwise_subscription_tier`) and dispatching
 * `wordwise_subscription_updated`.
 */

import { createClient } from "@/lib/supabase/client";

export const SUBSCRIPTION_STORAGE_KEY = "wordwise_subscription_tier";

export type SubscriptionTier = "free" | "pro_trial" | "pro";

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isTrial: boolean;
  daysRemaining: number;
}

let memoryTierCache: SubscriptionTier | null = null;

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

/** Read subscription tier synchronously from memory/localStorage (defaults to "free") */
export function getSubscriptionTier(): SubscriptionTier {
  if (typeof window === "undefined") return memoryTierCache || "free";
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (raw === "pro_trial" || raw === "pro") {
      memoryTierCache = raw;
      return raw;
    }
    memoryTierCache = "free";
    return "free";
  } catch {
    return memoryTierCache || "free";
  }
}

/** Save subscription tier to local cache and dispatch sync event */
function saveSubscriptionTierToCache(tier: SubscriptionTier): void {
  memoryTierCache = tier;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, tier);
    window.dispatchEvent(
      new CustomEvent("wordwise_subscription_updated", { detail: tier })
    );
  } catch (err) {
    console.warn(
      "Wordwise: could not save subscription tier to localStorage.",
      err
    );
  }
}

/**
 * Reads `subscription_tier` from `public.profiles WHERE id = userId` in Supabase,
 * updates the local cache, and dispatches `wordwise_subscription_updated`.
 */
export async function fetchUserSubscriptionTier(
  userId: string
): Promise<SubscriptionTier> {
  const fallback = getSubscriptionTier();
  if (!userId || !isSupabaseConfigured()) return fallback;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle<{ subscription_tier: string | null }>();

    if (error || !data) {
      return fallback;
    }

    const tier: SubscriptionTier =
      data.subscription_tier === "pro_trial" || data.subscription_tier === "pro"
        ? data.subscription_tier
        : "free";

    saveSubscriptionTierToCache(tier);
    return tier;
  } catch {
    return fallback;
  }
}

/**
 * Optimistically updates local cache, dispatches `wordwise_subscription_updated`,
 * and updates `public.profiles.subscription_tier` in Supabase.
 */
export function setSubscriptionTier(
  tier: SubscriptionTier,
  onSynced?: () => void
): void {
  saveSubscriptionTierToCache(tier);

  if (isSupabaseConfigured()) {
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from("profiles")
          .update({ subscription_tier: tier })
          .eq("id", user.id);

        if (onSynced) {
          onSynced();
        }
      } catch (err) {
        console.warn(
          "Wordwise: failed to update subscription_tier in Supabase.",
          err
        );
      }
    })();
  }
}

/** Check if Pro Trial / Pro tier is active */
export function isProTrialActive(): boolean {
  const tier = getSubscriptionTier();
  return tier === "pro_trial" || tier === "pro";
}

/** Reset subscription back to free */
export function resetSubscription(): void {
  setSubscriptionTier("free");
}
