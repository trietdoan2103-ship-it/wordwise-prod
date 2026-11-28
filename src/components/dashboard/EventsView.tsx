"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import DashboardSidebar from "./DashboardSidebar";
import { STEM_EVENTS, type EventCategory, type STEMEvent } from "@/data/events";
import {
  fetchCommunityEvents,
  fetchRegisteredEventIds,
  getRegisteredEventIds,
  toggleEventRegistration,
} from "@/lib/eventsStorage";

export default function EventsView() {
  const { session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EventCategory>("all");
  const [eventsList, setEventsList] = useState<STEMEvent[]>(STEM_EVENTS);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Hydrate community events and registered event IDs from Supabase + listen to events
  useEffect(() => {
    let isMounted = true;
    setRegisteredIds(getRegisteredEventIds());

    async function hydrateEventsFromSupabase() {
      const [fetchedEvents, fetchedRsvps] = await Promise.all([
        fetchCommunityEvents(),
        session?.id
          ? fetchRegisteredEventIds(session.id)
          : Promise.resolve(getRegisteredEventIds()),
      ]);
      if (!isMounted) return;
      setEventsList(fetchedEvents);
      setRegisteredIds(fetchedRsvps);
    }

    hydrateEventsFromSupabase();

    function handleUpdate(e: Event) {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail) {
        setRegisteredIds(customEvent.detail);
      } else {
        setRegisteredIds(getRegisteredEventIds());
      }
    }

    function handleStorage() {
      setRegisteredIds(getRegisteredEventIds());
      void hydrateEventsFromSupabase();
    }

    function handleCatalogUpdate() {
      void hydrateEventsFromSupabase();
    }

    window.addEventListener("wordwise_events_updated", handleUpdate);
    window.addEventListener("wordwise_events_catalog_updated", handleCatalogUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("wordwise_events_updated", handleUpdate);
      window.removeEventListener("wordwise_events_catalog_updated", handleCatalogUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [session?.id]);

  // Toast timer cleanup
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const displayName = session?.displayName || "Explorer";

  // Filter events based on active category
  const filteredEvents = useMemo(() => {
    return eventsList.filter((event) => {
      if (activeCategory === "all") return true;
      if (activeCategory === "meetup") return event.category === "meetup";
      if (activeCategory === "challenge") return event.category === "challenge";
      if (activeCategory === "registered") return registeredIds.includes(event.id);
      return true;
    });
  }, [eventsList, activeCategory, registeredIds]);

  function handleToggleRSVP(eventId: string, eventTitle: string) {
    const result = toggleEventRegistration(eventId);
    setRegisteredIds(result.updatedIds);

    if (result.isRegistered) {
      setToast({
        message: `You have joined "${eventTitle}"! A reminder will be sent to your email.`,
        type: "success",
      });
    } else {
      setToast({
        message: `Registration cancelled for "${eventTitle}".`,
        type: "info",
      });
    }
  }

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const registeredCount = registeredIds.length;
  const meetupCount = eventsList.filter((e) => e.category === "meetup").length;
  const challengeCount = eventsList.filter((e) => e.category === "challenge").length;

  return (
    <div className="dashboard-container">
      {/* ── Sidebar Navigation ── */}
      <DashboardSidebar
        currentSection="events"
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

        {/* ── Main Events Hub Content ── */}
        <main id="main-content" className="dashboard-content-area" tabIndex={-1}>
          {/* ── Header Title Banner ── */}
          <div className="events-header-banner">
            <div className="events-title-group">
              <div className="events-tag-pill">
                <span aria-hidden="true">📅</span>
                <span>Community &amp; Speaking Clubs</span>
              </div>
              <h1 className="events-main-title">
                Student Community Events &amp; Sprints
              </h1>
              <p className="events-main-subtitle">
                Join relaxed speaking sessions, connect with fellow learners at our monthly meetup, and build your daily English habit.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="events-quick-stats">
              <div className="events-quick-stat-item">
                <span className="events-quick-stat-icon" aria-hidden="true">🎯</span>
                <div>
                  <div className="events-quick-stat-value">{eventsList.length} Events</div>
                  <div className="events-quick-stat-label">Community Activities</div>
                </div>
              </div>

              <div className="events-quick-stat-item">
                <span className="events-quick-stat-icon" aria-hidden="true">☕</span>
                <div>
                  <div className="events-quick-stat-value">1 Monthly Meetup</div>
                  <div className="events-quick-stat-label">Hangout &amp; Study Tips</div>
                </div>
              </div>

              <div className="events-quick-stat-item events-quick-stat-item--registered">
                <span className="events-quick-stat-icon" aria-hidden="true">✓</span>
                <div>
                  <div className="events-quick-stat-value">{registeredCount} Registered</div>
                  <div className="events-quick-stat-label">Your RSVPs</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Filter Tabs Bar ── */}
          <div className="events-filter-bar">
            <div className="events-tabs-group" role="tablist" aria-label="Event Categories">
              <button
                type="button"
                role="tab"
                id="tab-all"
                aria-selected={activeCategory === "all"}
                className={`events-tab-btn ${activeCategory === "all" ? "events-tab-btn--active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                All Events ({eventsList.length})
              </button>
              <button
                type="button"
                role="tab"
                id="tab-meetup"
                aria-selected={activeCategory === "meetup"}
                className={`events-tab-btn ${activeCategory === "meetup" ? "events-tab-btn--active" : ""}`}
                onClick={() => setActiveCategory("meetup")}
              >
                Meetups &amp; Clubs ({meetupCount})
              </button>
              <button
                type="button"
                role="tab"
                id="tab-challenge"
                aria-selected={activeCategory === "challenge"}
                className={`events-tab-btn ${activeCategory === "challenge" ? "events-tab-btn--active" : ""}`}
                onClick={() => setActiveCategory("challenge")}
              >
                Challenges ({challengeCount})
              </button>
              <button
                type="button"
                role="tab"
                id="tab-registered"
                aria-selected={activeCategory === "registered"}
                className={`events-tab-btn ${activeCategory === "registered" ? "events-tab-btn--active" : ""}`}
                onClick={() => setActiveCategory("registered")}
              >
                Registered ({registeredCount})
              </button>
            </div>

            <div className="events-community-note">
              <span>All events free &amp; friendly for high-school learners</span>
            </div>
          </div>

          {/* ── Events Grid ── */}
          {filteredEvents.length === 0 ? (
            <div className="events-empty-state">
              <div className="events-empty-icon" aria-hidden="true">📅</div>
              <h2 className="events-empty-title">No Registered Events Yet</h2>
              <p className="events-empty-desc">
                You haven&apos;t RSVP&apos;d to any events yet. Check out the Monthly Community Meeting or Weekend STEM Speaking Club to join for free!
              </p>
              <button
                type="button"
                className="events-empty-btn"
                onClick={() => setActiveCategory("all")}
              >
                Browse All Events →
              </button>
            </div>
          ) : (
            <div className="events-cards-grid" role="region" aria-label="Events list">
              {filteredEvents.map((event) => {
                const isRegistered = registeredIds.includes(event.id);

                return (
                  <article
                    key={event.id}
                    id={`event-card-${event.id}`}
                    className={`event-card ${isRegistered ? "event-card--registered" : ""}`}
                    aria-labelledby={`event-title-${event.id}`}
                  >
                    {/* Top Row: Format badge, cover emoji, RSVP state */}
                    <div className="event-card-top">
                      <div className="event-header-left">
                        <div className="event-cover-icon" aria-hidden="true">
                          {event.coverEmoji}
                        </div>
                        <div>
                          <span
                            className={`event-badge-pill event-badge-pill--${event.badge.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {event.badge}
                          </span>
                          <span className="event-format-label">{event.format}</span>
                        </div>
                      </div>

                      <div className="event-date-badge">
                        <span>{event.dateBadge}</span>
                      </div>
                    </div>

                    {/* Body: Title, Subtitle, Description */}
                    <div className="event-card-body">
                      <h2 id={`event-title-${event.id}`} className="event-card-title">
                        {event.title}
                      </h2>
                      <p className="event-card-subtitle">{event.subtitle}</p>
                      <p className="event-card-desc">{event.description}</p>
                    </div>

                    {/* Metadata Specs: Date/Time, Location, Host */}
                    <div className="event-meta-list">
                      <div className="event-meta-item">
                        <span className="event-meta-icon" aria-hidden="true">🗓️</span>
                        <div>
                          <strong>{event.date}</strong>
                          <span className="event-meta-sub">{event.time}</span>
                        </div>
                      </div>

                      <div className="event-meta-item">
                        <span className="event-meta-icon" aria-hidden="true">📍</span>
                        <div>
                          <span>{event.location}</span>
                        </div>
                      </div>

                      <div className="event-meta-item">
                        <span className="event-meta-icon" aria-hidden="true">🏢</span>
                        <div>
                          <span className="event-meta-host">Hosted by {event.host}</span>
                        </div>
                      </div>
                    </div>

                    {/* Perks & Reward */}
                    <div className="event-perks-box">
                      <span className="event-perks-star" aria-hidden="true">⭐</span>
                      <div className="event-perks-text">
                        <strong>Rewards &amp; Benefits:</strong> {event.perks}
                      </div>
                    </div>

                    {/* Footer: Attendees counter & Interactive Register Button */}
                    <div className="event-card-footer">
                      <div className="event-attendees-counter">
                        <span aria-hidden="true">👥</span>
                        <span>
                          {event.attendeesCount + (isRegistered ? 1 : 0)} students registered
                        </span>
                      </div>

                      <button
                        type="button"
                        id={`rsvp-btn-${event.id}`}
                        onClick={() => handleToggleRSVP(event.id, event.title)}
                        className={`event-rsvp-btn ${
                          isRegistered ? "event-rsvp-btn--registered" : "event-rsvp-btn--unregistered"
                        }`}
                        aria-pressed={isRegistered}
                      >
                        {isRegistered ? (
                          <>
                            <span aria-hidden="true">✓</span> Registered
                          </>
                        ) : (
                          <>Register Free →</>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ── Community Guidelines / Support Banner ── */}
          <div className="events-support-banner">
            <div className="events-support-content">
              <span className="events-support-icon" aria-hidden="true">🌱</span>
              <div>
                <h3 className="events-support-title">Learn Together, Grow Together</h3>
                <p className="events-support-desc">
                  Wordwise events are friendly, low-pressure spaces where you can practice speaking English, ask questions about clean energy topics, and connect with high-school peers across Vietnam.
                </p>
              </div>
            </div>
            <Link href="/dashboard/library" className="events-support-btn">
              Explore Learning Library →
            </Link>
          </div>
        </main>
      </div>

      {/* ── Instant Feedback Toast Notification ── */}
      {toast && (
        <div
          className={`events-toast events-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <span className="events-toast-icon" aria-hidden="true">
            {toast.type === "success" ? "🎉" : "ℹ️"}
          </span>
          <span className="events-toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
