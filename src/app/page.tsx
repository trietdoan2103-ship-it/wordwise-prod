"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SignUpModal from "@/components/home/SignUpModal";
import LoginModal from "@/components/home/LoginModal";

/**
 * Home page — Milestone P1.
 *
 * Replaces the previous root redirect to /world.
 * Serves as the public-facing landing page for Wordwise.
 * Contains: Hero, Features, About, Contact, and auth modals.
 */

type ModalState = "none" | "signup" | "login";

export default function HomePage() {
  const [modal, setModal] = useState<ModalState>("none");

  function openSignUp() { setModal("signup"); }
  function openLogin()  { setModal("login");  }
  function closeModal() { setModal("none");   }

  return (
    <>
      <div className="home-page">

        {/* ── Navbar ──────────────────────────────────────────────────────── */}
        <header className="home-nav">
          <Link href="/" className="home-nav-logo" aria-label="Wordwise home">
            <img
              src="/images/wordwise-mascot.png"
              alt="Wordwise"
              className="h-12 md:h-14 w-auto object-contain"
            />
          </Link>

          <nav className="home-nav-links" aria-label="Site navigation">
            <a href="#about" className="home-nav-link">About Us</a>
            <a href="#contact" className="home-nav-link">Contact</a>
          </nav>

          <div className="home-nav-actions">
            <button
              type="button"
              id="home-login-btn"
              className="btn-home-login text-orange-700 border-orange-200 hover:bg-orange-50"
              onClick={openLogin}
            >
              Log In
            </button>
            <button
              type="button"
              id="home-signup-btn"
              className="btn-home-signup bg-orange-500 hover:bg-orange-600 text-white"
              onClick={openSignUp}
            >
              Sign Up Free
            </button>
          </div>
        </header>

        <main>
          {/* ── Hero ────────────────────────────────────────────────────── */}
          <section className="home-hero" aria-label="Hero">
            {/* Decorative background blobs */}
            <div className="home-hero-blob home-hero-blob--1" aria-hidden="true" />
            <div className="home-hero-blob home-hero-blob--2" aria-hidden="true" />
            <div className="home-hero-blob home-hero-blob--3" aria-hidden="true" />

            <div className="home-hero-content">
              <div className="home-hero-badge bg-orange-50 border-orange-200 text-orange-700">
                <span aria-hidden="true">🌍</span>
                <span>Learn English Through Real-World Adventures</span>
              </div>

              <h1 className="home-hero-title">
                Speak English with
                <span className="home-hero-title-accent bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent"> Confidence</span>
              </h1>

              <p className="home-hero-subtitle">
                Wordwise is a next-generation English learning platform designed for Vietnamese high-school students. Master vocabulary, listening, reading, and conversation through interactive lessons and gamified world adventures.
              </p>

              <div className="home-hero-cta-row">
                <button
                  type="button"
                  id="hero-signup-btn"
                  className="btn-hero-primary bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={openSignUp}
                >
                  Start Learning Free →
                </button>
                <button
                  type="button"
                  id="hero-login-btn"
                  className="btn-hero-secondary"
                  onClick={openLogin}
                >
                  Already a member? Log in
                </button>
              </div>

              <div className="home-hero-stats">
                <div className="home-stat">
                  <span className="home-stat-value">6+</span>
                  <span className="home-stat-label">Learning Modules</span>
                </div>
                <div className="home-stat-divider" aria-hidden="true" />
                <div className="home-stat">
                  <span className="home-stat-value">10</span>
                  <span className="home-stat-label">Lesson Rounds</span>
                </div>
                <div className="home-stat-divider" aria-hidden="true" />
                <div className="home-stat">
                  <span className="home-stat-value">100%</span>
                  <span className="home-stat-label">Interactive</span>
                </div>
              </div>
            </div>

            {/* Hero visual card */}
            <div className="home-hero-visual" aria-hidden="true">
              <div className="home-hero-card">
                <div className="home-hero-card-flag">🇺🇸</div>
                <p className="home-hero-card-country">United States</p>
                <p className="home-hero-card-mission">☀️ Renewable Energy</p>
                <div className="home-hero-card-stages">
                  {["📖 Vocabulary", "🎧 Listening", "🧩 Sentences"].map((s) => (
                    <div key={s} className="home-hero-card-stage">
                      <span className="home-hero-card-check">✓</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="home-hero-card-xp">⭐ 180 XP earned</div>
              </div>
            </div>
          </section>

          {/* ── Features ────────────────────────────────────────────────── */}
          <section className="home-features" aria-label="Platform features">
            <div className="home-section-header">
              <p className="home-section-eyebrow">Everything you need</p>
              <h2 className="home-section-title">One platform. All your English skills.</h2>
              <p className="home-section-subtitle">
                From vocabulary flashcards to immersive world missions — Wordwise covers every dimension of English learning.
              </p>
            </div>

            <div className="home-features-grid">
              {[
                {
                  icon: "📚",
                  title: "Learning Library",
                  desc: "Rich vocabulary lists, study notes, reading passages, and quizzes — all organised by topic.",
                },
                {
                  icon: "🎧",
                  title: "Listening Practice",
                  desc: "Train your ear with real-world audio scenarios. Understand native speakers in everyday situations.",
                },
                {
                  icon: "🧩",
                  title: "Sentence Assembler",
                  desc: "Build correct English sentences under time pressure. Ten rounds of increasing difficulty.",
                },
                {
                  icon: "🌍",
                  title: "World Map Missions",
                  desc: "Travel to English-speaking countries. Complete missions in real-world STEM hubs, clean-energy labs, and global transit centers.",
                },
                {
                  icon: "🃏",
                  title: "Flashcards",
                  desc: "Reinforce new vocabulary with spaced-repetition style flashcards you can review anywhere.",
                },
                {
                  icon: "🏅",
                  title: "Rewards & Progress",
                  desc: "Earn XP, unlock badges, and collect country stamps as you master each destination.",
                },
              ].map((f) => (
                <div key={f.title} className="home-feature-card">
                  <span className="home-feature-icon" aria-hidden="true">{f.icon}</span>
                  <h3 className="home-feature-title">{f.title}</h3>
                  <p className="home-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── How It Works ────────────────────────────────────────────── */}
          <section className="home-how" aria-label="How Wordwise works">
            <div className="home-section-header">
              <p className="home-section-eyebrow">Simple and fun</p>
              <h2 className="home-section-title">How Wordwise works</h2>
            </div>

            <div className="home-steps">
              {[
                { step: "01", icon: "🖊️", title: "Create your account", desc: "Sign up in seconds. No credit card required for the demo." },
                { step: "02", icon: "🗺️", title: "Choose your adventure", desc: "Browse the world map and pick a destination to start learning." },
                { step: "03", icon: "📖", title: "Complete the mission", desc: "Work through vocabulary, listening, and sentence challenges." },
                { step: "04", icon: "🏆", title: "Earn your rewards", desc: "Collect XP, stamps, badges, and cultural gifts for each country." },
              ].map((s) => (
                <div key={s.step} className="home-step">
                  <div className="home-step-number" aria-hidden="true">{s.step}</div>
                  <span className="home-step-icon" aria-hidden="true">{s.icon}</span>
                  <h3 className="home-step-title">{s.title}</h3>
                  <p className="home-step-desc">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="home-how-cta">
              <button
                type="button"
                id="how-signup-btn"
                className="btn-hero-primary bg-orange-500 hover:bg-orange-600 text-white"
                onClick={openSignUp}
              >
                Get started for free →
              </button>
            </div>
          </section>

          {/* ── About ───────────────────────────────────────────────────── */}
          <section id="about" className="home-about" aria-label="About us">
            <div className="home-about-content">
              <div className="home-about-text">
                <p className="home-section-eyebrow">Who we are</p>
                <h2 className="home-section-title home-about-title">
                  Built for Vietnamese learners, by people who care
                </h2>
                <p className="home-about-body">
                  Wordwise was created with one goal: to make English learning genuinely engaging for Vietnamese high-school students. We know that traditional textbooks can feel dry and disconnected from real life.
                </p>
                <p className="home-about-body">
                  Our platform blends modern learning science with interactive game design. Every mission is grounded in a real-world English scenario — so students learn not just grammar rules, but how to actually communicate.
                </p>
                <div className="home-about-values">
                  {[
                    { icon: "🎯", label: "Mission-driven learning" },
                    { icon: "🧠", label: "Evidence-based methods" },
                    { icon: "🎮", label: "Engaging game design" },
                    { icon: "🤝", label: "Built for Vietnamese students" },
                  ].map((v) => (
                    <div key={v.label} className="home-about-value">
                      <span aria-hidden="true">{v.icon}</span>
                      <span>{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="home-about-visual" aria-hidden="true">
                <div className="home-about-card">
                  <div className="home-about-card-row">
                    <span className="home-about-card-icon">🌏</span>
                    <div>
                      <p className="home-about-card-label">Countries available</p>
                      <p className="home-about-card-value">Growing library</p>
                    </div>
                  </div>
                  <div className="home-about-card-row">
                    <span className="home-about-card-icon">📝</span>
                    <div>
                      <p className="home-about-card-label">Lesson types</p>
                      <p className="home-about-card-value">Vocab · Listening · Speaking · Writing</p>
                    </div>
                  </div>
                  <div className="home-about-card-row">
                    <span className="home-about-card-icon">🇻🇳</span>
                    <div>
                      <p className="home-about-card-label">Designed for</p>
                      <p className="home-about-card-value">Vietnamese high-school students</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Contact ─────────────────────────────────────────────────── */}
          <section id="contact" className="home-contact" aria-label="Contact us">
            <div className="home-section-header">
              <p className="home-section-eyebrow">Get in touch</p>
              <h2 className="home-section-title">We&apos;d love to hear from you</h2>
              <p className="home-section-subtitle">
                Have a question, feedback, or want to partner with us? Reach out and we&apos;ll get back to you soon.
              </p>
            </div>

            <div className="home-contact-cards">
              <div className="home-contact-card">
                <span className="home-contact-icon" aria-hidden="true">📧</span>
                <h3 className="home-contact-label">Email</h3>
                <p className="home-contact-value">hello@wordwise.demo</p>
                <p className="home-contact-note">We reply within 1–2 business days</p>
              </div>
              <div className="home-contact-card">
                <span className="home-contact-icon" aria-hidden="true">💬</span>
                <h3 className="home-contact-label">Feedback</h3>
                <p className="home-contact-value">feedback@wordwise.demo</p>
                <p className="home-contact-note">Tell us how to improve</p>
              </div>
              <div className="home-contact-card">
                <span className="home-contact-icon" aria-hidden="true">🏢</span>
                <h3 className="home-contact-label">Partnerships</h3>
                <p className="home-contact-value">partners@wordwise.demo</p>
                <p className="home-contact-note">Schools &amp; educational organisations</p>
              </div>
            </div>
          </section>

          {/* ── Final CTA ───────────────────────────────────────────────── */}
          <section className="home-final-cta" aria-label="Call to action">
            <div className="home-final-cta-blob" aria-hidden="true" />
            <div className="home-final-cta-content">
              <h2 className="home-final-cta-title">Ready to start your English adventure?</h2>
              <p className="home-final-cta-sub">Join Wordwise today and explore the world through language.</p>
              <div className="home-final-cta-actions">
                <button
                  type="button"
                  id="final-signup-btn"
                  className="btn-hero-primary bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={openSignUp}
                >
                  Create your free account →
                </button>
                <Link href="/world" className="home-final-cta-secondary">
                  Explore the demo ↗
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="home-footer">
          <div className="home-footer-inner">
            <div className="home-footer-brand">
              <Image src="/wordwise-logo.png" alt="Wordwise" width={28} height={28} className="home-footer-logo" />
              <span className="home-footer-name">Wordwise</span>
            </div>
            <p className="home-footer-tagline">English learning for Vietnamese high-school students.</p>
            <p className="home-footer-copy">© 2026 Wordwise. Demo product — not for production use.</p>
          </div>
        </footer>
      </div>

      {/* ── Auth Modals ─────────────────────────────────────────────────── */}
      {modal === "signup" && (
        <SignUpModal
          onClose={closeModal}
          onSwitchToLogin={() => setModal("login")}
        />
      )}
      {modal === "login" && (
        <LoginModal
          onClose={closeModal}
          onSwitchToSignUp={() => setModal("signup")}
        />
      )}
    </>
  );
}
