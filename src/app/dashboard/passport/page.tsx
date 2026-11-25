"use client";

import React, { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import PassportModal from "@/components/passport/PassportModal";
import { useSession } from "@/context/SessionContext";

function PassportDashboardView() {
  const { session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = session?.displayName || "Explorer";

  return (
    <div className="dashboard-container">
      <DashboardSidebar
        currentSection="passport"
        isOpenOnMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="dashboard-main-wrapper">
        <header
          className="dashboard-mobile-header"
          aria-label="Mobile navigation bar"
        >
          <button
            type="button"
            className="dashboard-menu-toggle-btn"
            onClick={() => setMobileMenuOpen((p) => !p)}
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-sidebar"
            aria-label="Toggle navigation menu"
          >
            <span className="dashboard-menu-bar" aria-hidden="true" />
            <span className="dashboard-menu-bar" aria-hidden="true" />
            <span className="dashboard-menu-bar" aria-hidden="true" />
          </button>
          <span className="dashboard-mobile-wordmark">Wordwise</span>
          <div
            className="dashboard-mobile-user-initial"
            aria-label={`User: ${displayName}`}
          >
            {(displayName.charAt(0) || "U").toUpperCase()}
          </div>
        </header>

        <main
          id="main-content"
          className="dashboard-content-area"
          tabIndex={-1}
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-orange-700">
                🛂 Diplomatic Registry
              </span>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                My Digital Wordwise Passport
              </h1>
              <p className="text-sm text-slate-600">
                Collect official country immigration stamps and authentic cultural souvenirs as you complete each Country Learning Hub.
              </p>
            </div>
            <Link
              href="/world"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:from-orange-600 hover:to-amber-600"
            >
              🌍 Explore World Map →
            </Link>
          </div>

          <PassportModal inline />
        </main>
      </div>
    </div>
  );
}

export default function DashboardPassportPage() {
  return (
    <ProtectedRoute>
      <PassportDashboardView />
    </ProtectedRoute>
  );
}
