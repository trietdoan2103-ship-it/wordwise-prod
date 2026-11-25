"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  isAvailable: boolean;
  href?: string;
  badge?: string;
}

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: "📊", isAvailable: true, href: "/dashboard" },
  { id: "library", label: "Learning Library", icon: "📚", isAvailable: true, href: "/dashboard/library" },
  { id: "passport", label: "My Passport", icon: "🛂", isAvailable: true, href: "/dashboard/passport" },
  { id: "achievements", label: "Achievements", icon: "🏅", isAvailable: true, href: "/dashboard/achievements" },
  { id: "rankings", label: "Rankings", icon: "🏆", isAvailable: true, href: "/dashboard/rankings" },
  { id: "events", label: "Events", icon: "📅", isAvailable: true, href: "/dashboard/events" },
  { id: "community", label: "Community", icon: "💬", isAvailable: true, href: "/community" },
  { id: "subscription", label: "Subscription", icon: "⭐", isAvailable: true, href: "/dashboard/subscription" },
  { id: "content-mgmt", label: "Content Management", icon: "⚙️", isAvailable: true, href: "/dashboard/admin", badge: "ADMIN" },
];

interface DashboardSidebarProps {
  currentSection?: string;
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
}

export default function DashboardSidebar({
  currentSection = "overview",
  isOpenOnMobile,
  onCloseMobile,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { session, signOut } = useSession();

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  const userInitial = (session?.displayName?.charAt(0) || "U").toUpperCase();
  const visibleNavItems = DASHBOARD_NAV_ITEMS.filter(
    (item) => item.id !== "content-mgmt" || session?.role === "admin"
  );

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpenOnMobile && (
        <div
          className="dashboard-sidebar-overlay"
          aria-hidden="true"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${isOpenOnMobile ? "dashboard-sidebar--open" : ""}`}
        aria-label="Dashboard navigation"
      >
        {/* Brand header */}
        <div className="dashboard-sidebar-brand">
          <Link href="/dashboard" className="dashboard-sidebar-logo-link" onClick={onCloseMobile}>
            <img
              src="/images/wordwise-mascot.png"
              alt="Wordwise"
              className="h-16 md:h-20 w-auto object-contain"
            />
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            className="dashboard-sidebar-close-btn"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation list */}
        <nav className="dashboard-sidebar-nav" aria-label="Main sidebar links">
          <ul className="dashboard-sidebar-menu">
            {visibleNavItems.map((item) => {
              const isActive = item.id === currentSection;

              return (
                <li key={item.id} className="dashboard-sidebar-item">
                  {item.isAvailable ? (
                    <Link
                      href={item.href || "/dashboard"}
                      className={`dashboard-nav-link ${isActive ? "dashboard-nav-link--active bg-amber-100/70 text-orange-700 border-orange-500" : "hover:bg-orange-50 hover:text-orange-700"}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={onCloseMobile}
                    >
                      <span className="dashboard-nav-icon" aria-hidden="true">{item.icon}</span>
                      <span className="dashboard-nav-label">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full border border-orange-300 bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div
                      className="dashboard-nav-link dashboard-nav-link--disabled"
                      title={`${item.label} (Coming in future milestone)`}
                      aria-disabled="true"
                    >
                      <span className="dashboard-nav-icon" aria-hidden="true">{item.icon}</span>
                      <span className="dashboard-nav-label">{item.label}</span>
                      {item.badge && (
                        <span className="dashboard-nav-badge">{item.badge}</span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User profile & session area */}
        <div className="dashboard-sidebar-profile">
          <div className="dashboard-user-card">
            <div className="dashboard-user-avatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="dashboard-user-info">
              <p className="dashboard-user-name" title={session?.displayName}>
                {session?.displayName || "Demo Learner"}
              </p>
              <p className="dashboard-user-email" title={session?.email}>
                {session?.email || "learner@wordwise.demo"}
              </p>
            </div>
          </div>

          <div className="dashboard-sidebar-profile-actions">
            <button
              type="button"
              className="dashboard-signout-btn"
              onClick={handleSignOut}
              aria-label="Sign out of Wordwise"
            >
              <span aria-hidden="true">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
