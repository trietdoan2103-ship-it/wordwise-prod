"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useSession } from "@/context/SessionContext";
import DashboardSidebar from "./DashboardSidebar";
import {
  fetchUserSubscriptionTier,
  getSubscriptionTier,
  setSubscriptionTier,
  type SubscriptionTier,
} from "@/lib/subscriptionStorage";

export default function SubscriptionView() {
  const { session, refreshProfile } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hydrate subscription tier from Supabase + localStorage and listen to updates
  useEffect(() => {
    let isMounted = true;
    setTier(getSubscriptionTier());

    if (session?.id) {
      fetchUserSubscriptionTier(session.id).then((fetchedTier) => {
        if (isMounted) {
          setTier(fetchedTier);
        }
      });
    }

    function handleUpdate(e: Event) {
      const customEvent = e as CustomEvent<SubscriptionTier>;
      if (customEvent.detail) {
        setTier(customEvent.detail);
      } else {
        setTier(getSubscriptionTier());
      }
    }

    function handleStorage() {
      setTier(getSubscriptionTier());
    }

    window.addEventListener("wordwise_subscription_updated", handleUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("wordwise_subscription_updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session?.id]);

  // Toast timer cleanup
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const isPro = tier === "pro_trial" || tier === "pro";
  const displayName = session?.displayName || "Explorer";

  function handleActivateTrial() {
    setSubscriptionTier("pro_trial", () => {
      void refreshProfile();
    });
    setTier("pro_trial");

    // Celebratory confetti burst
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f97316", "#f5c842", "#22d3a5", "#f59e0b", "#ea580c"],
      });
    } catch {
      // ignore
    }

    setToastMessage(
      "🌟 Pro Trial Activated! You now have full access to all 20+ countries, Speaking AI, and STEM modules."
    );
  }

  function handleRevertToFree() {
    setSubscriptionTier("free", () => {
      void refreshProfile();
    });
    setTier("free");
    setToastMessage("Reverted to Free Starter tier.");
  }

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="dashboard-container">
      {/* ── Sidebar Navigation ── */}
      <DashboardSidebar
        currentSection="subscription"
        isOpenOnMobile={mobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      {/* ── Main Area ── */}
      <div className="dashboard-main-wrapper">
        {/* Mobile Header */}
        <header className="dashboard-mobile-header" aria-label="Mobile navigation bar">
          <button
            type="button"
            className="dashboard-menu-toggle-btn"
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-sidebar"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <span className="dashboard-menu-bar" aria-hidden="true" />
            <span className="dashboard-menu-bar" aria-hidden="true" />
            <span className="dashboard-menu-bar" aria-hidden="true" />
          </button>

          <Link href="/dashboard" className="dashboard-mobile-logo-link">
            <Image
              src="/wordwise-logo.png"
              alt="Wordwise"
              width={32}
              height={32}
              className="dashboard-mobile-logo-img"
              priority
            />
            <span className="dashboard-mobile-wordmark">Wordwise</span>
          </Link>

          <div className="dashboard-mobile-user-initial" aria-label={`User: ${displayName}`}>
            {(displayName.charAt(0) || "U").toUpperCase()}
          </div>
        </header>

        {/* ── Main Pricing Hub Content ── */}
        <main id="main-content" className="dashboard-content-area" tabIndex={-1}>
          {/* ── Pitch Prototype Notice Banner ── */}
          <div className="subscription-notice-banner" role="alert">
            <div className="subscription-notice-icon" aria-hidden="true">🎓</div>
            <div className="subscription-notice-text">
              <strong>Prototype Mode:</strong> Demonstrating freemium educational model for judges. No real payment required.
              <span className="subscription-notice-sub">
                You can activate and revert the 7-Day Demo Trial below with zero credit card or processor dependencies.
              </span>
            </div>
          </div>

          {/* ── Header Title & Subtitle ── */}
          <div className="subscription-header-banner">
            <div className="subscription-title-group">
              <div className="subscription-tag-pill">
                <span aria-hidden="true">💎</span>
                <span>Freemium Education Model</span>
              </div>
              <h1 className="subscription-main-title">
                Subscription Tiers &amp; Plans
              </h1>
              <p className="subscription-main-subtitle">
                Accessible, high-impact STEM English learning tailored for Vietnamese high-school students and specialized classrooms.
              </p>
            </div>

            {/* Current Plan Status Box */}
            <div className={`subscription-status-card ${isPro ? "subscription-status-card--pro" : ""}`}>
              <div className="subscription-status-icon" aria-hidden="true">
                {isPro ? "🌟" : "📘"}
              </div>
              <div className="subscription-status-info">
                <div className="subscription-status-label">Your Account Status</div>
                <div className="subscription-status-value">
                  {isPro ? "7-Day Pro Trial Active • 7 days remaining" : "Free Student Tier"}
                </div>
                <div className="subscription-status-desc">
                  {isPro
                    ? "Full catalog unlocked: All 20+ countries & clean tech modules"
                    : "Standard starter access to USA mission & foundational modules"}
                </div>
              </div>
              {isPro && (
                <button
                  type="button"
                  onClick={handleRevertToFree}
                  className="subscription-revert-btn"
                  title="Reset to free tier for pitch replay"
                >
                  Revert to Free
                </button>
              )}
            </div>
          </div>

          {/* ── Billing Cycle Toggle ── */}
          <div className="subscription-billing-bar">
            <div className="subscription-billing-toggle" role="group" aria-label="Billing cycle">
              <button
                type="button"
                className={`subscription-cycle-btn ${
                  billingCycle === "monthly" ? "subscription-cycle-btn--active" : ""
                }`}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                className={`subscription-cycle-btn ${
                  billingCycle === "annual" ? "subscription-cycle-btn--active" : ""
                }`}
                onClick={() => setBillingCycle("annual")}
              >
                Annual Billing <span className="subscription-discount-badge">Save 33%</span>
              </button>
            </div>
          </div>

          {/* ── 2-Column Pricing Tier Cards Grid ── */}
          <div className="subscription-pricing-grid">
            {/* ── Tier 1: Free Starter ── */}
            <article className={`pricing-card ${!isPro ? "pricing-card--current" : ""}`}>
              <div className="pricing-card-header">
                <div className="pricing-tier-badge pricing-tier-badge--free">
                  Free Student Tier
                </div>
                <h2 className="pricing-tier-title">Free Starter</h2>
                <p className="pricing-tier-desc">
                  Essential tools for high schoolers to explore English missions and foundational clean energy terms.
                </p>
              </div>

              <div className="pricing-price-box">
                <div className="pricing-amount">0₫</div>
                <div className="pricing-period">Forever Free</div>
              </div>

              <div className="pricing-divider" />

              <div className="pricing-features-section">
                <div className="pricing-features-label">Included in Free Starter:</div>
                <ul className="pricing-features-list">
                  <li className="pricing-feature-item">
                    <span className="pricing-check-icon" aria-hidden="true">✓</span>
                    <span><strong>USA Mission Room:</strong> Renewable Energy simulation</span>
                  </li>
                  <li className="pricing-feature-item">
                    <span className="pricing-check-icon" aria-hidden="true">✓</span>
                    <span><strong>2 STEM Modules:</strong> Solar &amp; Wind Energy reading</span>
                  </li>
                  <li className="pricing-feature-item">
                    <span className="pricing-check-icon" aria-hidden="true">✓</span>
                    <span><strong>Basic Flashcards:</strong> Flip cards &amp; definitions</span>
                  </li>
                  <li className="pricing-feature-item">
                    <span className="pricing-check-icon" aria-hidden="true">✓</span>
                    <span><strong>Community Leaderboard:</strong> View school rankings</span>
                  </li>
                  <li className="pricing-feature-item">
                    <span className="pricing-check-icon" aria-hidden="true">✓</span>
                    <span><strong>Learning Streak:</strong> Daily activity tracking</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--locked">
                    <span className="pricing-cross-icon" aria-hidden="true">✕</span>
                    <span>20+ Global Countries &amp; Diplomatic Stages (Locked)</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--locked">
                    <span className="pricing-cross-icon" aria-hidden="true">✕</span>
                    <span>Speaking AI Pronunciation Coach (Locked)</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--locked">
                    <span className="pricing-cross-icon" aria-hidden="true">✕</span>
                    <span>Official Completion Certificate (Locked)</span>
                  </li>
                </ul>
              </div>

              <div className="pricing-card-footer">
                {!isPro ? (
                  <button
                    type="button"
                    disabled
                    className="pricing-btn pricing-btn--current"
                    aria-label="Free Starter is currently active"
                  >
                    Current Active Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRevertToFree}
                    className="pricing-btn pricing-btn--downgrade"
                  >
                    Revert to Free Starter
                  </button>
                )}
              </div>
            </article>

            {/* ── Tier 2: Wordwise Pro Explorer (Featured) ── */}
            <article className={`pricing-card pricing-card--featured ${isPro ? "pricing-card--active-pro" : ""}`}>
              {/* Highlight ribbon / pill */}
              <div className="pricing-featured-ribbon">
                <span>🔥 Most Popular for High Schoolers</span>
              </div>

              <div className="pricing-card-header">
                <div className="pricing-tier-badge pricing-tier-badge--pro">
                  Pro Scholar Edition
                </div>
                <h2 className="pricing-tier-title">Wordwise Pro Explorer</h2>
                <p className="pricing-tier-desc">
                  Complete mastery suite for students preparing for international scholarships, debate contests, and STEM careers.
                </p>
              </div>

              <div className="pricing-price-box">
                {billingCycle === "annual" ? (
                  <>
                    <div className="pricing-amount">
                      52,500₫ <span className="pricing-unit">/ month</span>
                    </div>
                    <div className="pricing-period">
                      Billed annually at 630,000₫ / year (approx. 1,700₫ / day)
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pricing-amount">
                      79,000₫ <span className="pricing-unit">/ month</span>
                    </div>
                    <div className="pricing-period">Billed monthly • Cancel anytime</div>
                  </>
                )}
              </div>

              <div className="pricing-divider" />

              <div className="pricing-features-section">
                <div className="pricing-features-label">Everything in Free, plus:</div>
                <ul className="pricing-features-list">
                  <li className="pricing-feature-item pricing-feature-item--highlight">
                    <span className="pricing-sparkle-icon" aria-hidden="true">✨</span>
                    <span><strong>All 20+ World Countries:</strong> Unlock UK, Japan, Germany &amp; more</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--highlight">
                    <span className="pricing-sparkle-icon" aria-hidden="true">✨</span>
                    <span><strong>Speaking AI:</strong> Real-time pronunciation &amp; pitch feedback</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--highlight">
                    <span className="pricing-sparkle-icon" aria-hidden="true">✨</span>
                    <span><strong>Full Clean Tech Curriculum:</strong> All 6 STEM specialized modules</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--highlight">
                    <span className="pricing-sparkle-icon" aria-hidden="true">✨</span>
                    <span><strong>Weekly Expert Webinars:</strong> Live MIT &amp; industry guest sessions</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--highlight">
                    <span className="pricing-sparkle-icon" aria-hidden="true">✨</span>
                    <span><strong>Official Certificate:</strong> Verifiable STEM English diploma</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--highlight">
                    <span className="pricing-sparkle-icon" aria-hidden="true">✨</span>
                    <span><strong>Unlimited Streak Freezes:</strong> Protect hard-earned momentum</span>
                  </li>
                  <li className="pricing-feature-item pricing-feature-item--highlight">
                    <span className="pricing-sparkle-icon" aria-hidden="true">✨</span>
                    <span><strong>Priority Hackathon Matching:</strong> Form national student teams</span>
                  </li>
                </ul>
              </div>

              <div className="pricing-card-footer">
                {!isPro ? (
                  <button
                    type="button"
                    onClick={handleActivateTrial}
                    className="pricing-btn pricing-btn--activate"
                    id="activate-trial-btn"
                  >
                    🚀 Activate 7-Day Demo Trial
                  </button>
                ) : (
                  <div className="pricing-pro-active-box">
                    <div className="pricing-pro-active-indicator">
                      <span aria-hidden="true">✓</span> Pro Trial Active
                    </div>
                    <button
                      type="button"
                      onClick={handleRevertToFree}
                      className="pricing-btn-subtle"
                    >
                      Reset to Free (Replay Demo)
                    </button>
                  </div>
                )}
                <div className="pricing-guarantee-note">
                  🔒 Zero payment required • Instant sandbox trial for evaluators
                </div>
              </div>
            </article>
          </div>

          {/* ── Business Model Insights for Evaluators ── */}
          <section className="subscription-business-section" aria-labelledby="business-model-heading">
            <h2 id="business-model-heading" className="subscription-business-title">
              Why This Model Scales in Vietnam
            </h2>
            <div className="subscription-business-grid">
              <div className="subscription-business-card">
                <div className="business-card-icon" aria-hidden="true">💰</div>
                <h3 className="business-card-title">95% Cost Savings vs. Offline Centers</h3>
                <p className="business-card-desc">
                  Traditional IELTS or academic speech tutoring centers in Hanoi and HCMC charge 2.5M–6M₫/month. Wordwise Pro delivers specialized STEM English for only ~52,500₫/month (~1,700₫/day).
                </p>
              </div>

              <div className="subscription-business-card">
                <div className="business-card-icon" aria-hidden="true">🏫</div>
                <h3 className="business-card-title">B2B School &amp; District Licensing</h3>
                <p className="business-card-desc">
                  Specialized high schools (THPT Chuyên) can purchase institutional seat bundles for clean tech clubs, student councils, and scholarship applicant cohorts at volume discounts.
                </p>
              </div>

              <div className="subscription-business-card">
                <div className="business-card-icon" aria-hidden="true">🌏</div>
                <h3 className="business-card-title">Equitable National Access</h3>
                <p className="business-card-desc">
                  The robust Free Starter tier ensures ambitious high-schoolers in all 63 provinces can build daily learning streaks and access core STEM curriculum regardless of family income.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="subscription-toast" role="status" aria-live="polite">
          <span className="subscription-toast-icon" aria-hidden="true">✨</span>
          <span className="subscription-toast-text">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
