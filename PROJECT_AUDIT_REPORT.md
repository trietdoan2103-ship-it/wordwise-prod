# Wordwise — Full-Lifecycle Technical & Codebase Audit Report

**Audit Date:** November 12, 2026  
**Role:** Lead Technical Architect & Codebase Auditor  
**Scope:** End-to-End Repository Audit (Game Core M1–M10 through Platform Milestones P1–P4.4)  
**Target Environment:** Client-side Next.js 16 (App Router) + React 19 + Tailwind CSS v4 (Zero-Backend Architecture)

---

## Executive Summary

Wordwise has evolved from an interactive single-mission English learning game demo (**Milestones M1–M10**) into a full-featured **STEM & Clean-Tech English Learning Platform** (**Milestones P1–P4.4**) tailored for Vietnamese high-school students.

- **Build & Type Safety:** `npx tsc --noEmit` passes with **0 errors and 0 warnings** under strict TypeScript configuration.
- **Zero-Backend Compliance:** Confirmed 100% client-side execution with **zero** backend, database, ORM, or payment processor dependencies.
- **Data Architecture:** Cleanly partitioned across **7 `localStorage` keys** with custom `window` event synchronization (`wordwise_curriculum_updated`, `wordwise_streak_updated`, `wordwise_events_updated`, `wordwise_subscription_updated`) and strict isolation between user session (`wordwise_session`), game adventure progress (`wordwise_progress`), and STEM curriculum progress (`wordwise_curriculum_progress`).

---

## 1. Tech Stack & Project Architecture

### 1.1 Configuration & Compiler Settings (`package.json` & `tsconfig.json`)

| Category | Package / Setting | Version / Value | Audit Verdict |
| :--- | :--- | :--- | :--- |
| **Framework** | `next` | `16.3.1` | Latest App Router architecture |
| **UI Library** | `react` / `react-dom` | `19.2.8` | React 19 concurrent features enabled |
| **Animations** | `canvas-confetti` | `^1.9.4` | Lightweight celebratory particle effects |
| **Styling** | `tailwindcss` / `@tailwindcss/postcss` | `^4` | Tailwind v4 + custom design tokens in `globals.css` |
| **Language** | `typescript` | `^5` | `strict: true`, `noEmit: true`, `moduleResolution: "bundler"` |
| **Linting** | `eslint` / `eslint-config-next` | `^9` / `16.3.1` | Standard Next.js lint rules |
| **Path Alias** | `@/*` | `./src/*` | Clean module imports across all layers |

> **Zero Backend / Database Verification:**  
> Inspected `package.json` `dependencies` and `devDependencies`. There are **zero** backend, database, authentication, or external API SDK packages (no Prisma, Drizzle, Supabase, Firebase, NextAuth, Stripe, or Axios). Audio synthesis uses the native browser `window.speechSynthesis` Web Speech API (`src/lib/audio.ts`).

### 1.2 Directory Layout (`src/`)

```text
src/
├── app/                          # Next.js App Router pages & global styles
│   ├── completion/usa/page.tsx   # USA Mission Completion Ceremony route
│   ├── dashboard/                # Protected STEM Learning Hub routes
│   │   ├── achievements/page.tsx # P4.1 Achievements & Streak Hub
│   │   ├── events/page.tsx       # P4.3 STEM Events & Challenges
│   │   ├── library/page.tsx      # P3.1–P3.3 Learning Library Hub
│   │   ├── rankings/page.tsx     # P4.2 National High School Leaderboard
│   │   ├── subscription/page.tsx # P4.4 Freemium & Pro Trial Hub
│   │   ├── videos/page.tsx       # P3.1 Video Lessons tab route
│   │   └── page.tsx              # P2 Main Dashboard Overview
│   ├── mission/usa/page.tsx      # M3–M10 USA Mission Room route
│   ├── world/page.tsx            # M2 Interactive World Map route
│   ├── globals.css               # Design tokens & component styling (~10,070 lines)
│   ├── layout.tsx                # Root layout wrapping SessionProvider & GameProvider
│   └── page.tsx                  # P1 Public Landing Page
├── components/
│   ├── auth/                     # ProtectedRoute client-side session guard
│   ├── dashboard/                # 12 Dashboard views, cards, shell, and sidebar
│   ├── home/                     # SignUpModal & LoginModal
│   ├── layout/                   # World Map Topbar
│   ├── library/                  # LessonReaderModal, FlashcardDeck, LessonQuiz
│   ├── mission/                  # MissionRoom, MissionBriefing, MissionStepper, LearningRecap, StageShell
│   ├── passport/                 # PassportModal
│   ├── rewards/                  # CompletionCeremony, RewardCard
│   ├── stages/                   # VocabularyStage, ListeningStage, SentenceStage
│   └── world/                    # WorldMap, CountryPin
├── context/
│   ├── GameContext.tsx           # Global game XP, completedStages, USA rewards
│   └── SessionContext.tsx        # Demo authentication session & profile lookup
├── data/
│   ├── countries.ts              # USA (unlocked) & England (locked) map coordinates
│   ├── events.ts                 # 4 curated STEM English events & contests
│   ├── lessons.ts                # 6 complete Renewable Energy STEM lessons
│   ├── listening.ts              # 3 Coffee Shop TTS listening items
│   ├── missions.ts               # USA "Ordering Coffee" mission, briefing, recap, rewards
│   ├── rankings.ts               # 30 leaderboard entries across 3 leagues (THPT Chuyên)
│   ├── sentences.ts              # 10 progressive Sentence Assembler rounds
│   └── vocabulary.ts             # 6 Coffee Shop vocabulary items
├── lib/
│   ├── achievements.ts           # Dynamic 7-badge evaluator & timestamp persistence
│   ├── audio.ts                  # Browser SpeechSynthesis wrapper (en-US, rate 0.9)
│   ├── curriculumStorage.ts      # CRUD & custom event dispatch for curriculum progress
│   ├── eventsStorage.ts          # CRUD & custom event dispatch for event RSVPs
│   ├── learningProgress.ts       # Progress percentage calculator & storage re-exports
│   ├── progress.ts               # Game progress localStorage persistence
│   ├── streak.ts                 # 7-day learning streak engine & calendar generator
│   ├── subscriptionStorage.ts    # Free vs. Pro Trial state persistence
│   └── xp.ts                     # Centralized XP constants
└── types/
    ├── curriculum.ts             # Lesson, Flashcard, QuizQuestion, ReadingText types
    ├── game.ts                   # Country, Mission, Stage, Reward, UserProgress types
    └── learning.ts               # LearningLesson & LearningProgressSummary interfaces
```

---

## 2. Complete Route & Screen Inventory

Every route under `src/app/` has been audited for file location, authentication guard status, and implementation completeness:

| Route Path | File Path | Protection Status | Implementation Status | Key Components & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | **Public** | **Complete** | Public marketing landing page with Hero, Features, How It Works, About Us, Contact, CTA, `SignUpModal`, and `LoginModal`. |
| `/dashboard` | `src/app/dashboard/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `DashboardShell` with `DashboardSidebar`, `LearningProgressCard`, `ExploreWorldCard`, `DashboardGoalCard`, and `DashboardTopicCard`. |
| `/dashboard/library` | `src/app/dashboard/library/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `LearningLibraryView` (`defaultTab="all"`) with 4 filter tabs (`all`, `reading`, `flashcards`, `videos`) and `LessonReaderModal`. |
| `/dashboard/videos` | `src/app/dashboard/videos/page.tsx` | **`ProtectedRoute`** | **Complete (Intentional Empty State)** | Renders `LearningLibraryView` (`defaultTab="videos"`), showing the polished "No video lessons yet / Coming in Beta" empty state card with CTA back to Reading Modules. *(Note: Unlinked from sidebar, accessible via direct URL).* |
| `/dashboard/achievements` | `src/app/dashboard/achievements/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `AchievementsView` with live 7-day streak calendar, flame showcase, and 7 dynamically calculated badges with filter tabs (`all`, `unlocked`, `locked`). |
| `/dashboard/rankings` | `src/app/dashboard/rankings/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `RankingsView` with Pitch Demonstration banner, 3 league tabs (`national`, `cleantech`, `weekly`), Top 3 Podium, sticky "YOU" row, and Top 10 table. |
| `/dashboard/events` | `src/app/dashboard/events/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `EventsView` with 4 STEM events, category filters (`all`, `webinar`, `contest`, `registered`), interactive RSVP toggle, live attendee count increment, and toast notifications. |
| `/dashboard/subscription` | `src/app/dashboard/subscription/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `SubscriptionView` with Prototype Mode notice, Monthly/Annual billing toggle, Free vs. Pro Explorer comparison cards, 1-click 7-Day Pro Trial activation (with confetti), and Vietnam B2B/B2C scaling rationale. |
| `/world` | `src/app/world/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `Topbar` + `WorldMap` (equirectangular SVG map + `CountryPin` cards for USA and England). |
| `/mission/usa` | `src/app/mission/usa/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `MissionRoom` for `"ordering-coffee"`, orchestrating Briefing → Vocabulary → Listening → Sentence → Learning Recap. |
| `/completion/usa` | `src/app/completion/usa/page.tsx` | **`ProtectedRoute`** | **Complete** | Renders `CompletionCeremony` with multi-burst `canvas-confetti`, idempotent `+30 XP` bonus, stage checklist, and 3 `RewardCard` items. |

---

## 3. Milestone-by-Milestone Audit

### 3.1 Phase 1: Game Core (M1–M10)

#### World Map (`/world` — `WorldMap.tsx`, `CountryPin.tsx`, `countries.ts`)
- **SVG Map:** Custom 1600×900 equirectangular projection SVG with latitude/longitude grid lines, Equator/Tropics, angular continental polygons, island ellipses, and decorative plane/compass badges.
- **USA Pin (`unlocked: true`):** Positioned at `{ x: "23%", y: "28%" }`. Renders an interactive `<Link href="/mission/usa">` card with pulsing aura, 🇺🇸 flag, `"Ordering Coffee"` subtitle, and `"Start Mission"` CTA.
- **England Pin (`unlocked: false`):** Positioned at `{ x: "49%", y: "21%" }`. Renders a muted locked card with 🔒 badge, 🇬🇧 flag, and `"Locked"` label.

#### Mission Room (`/mission/usa` — `MissionRoom.tsx`)
- **Mission Briefing (M10 — `MissionBriefing.tsx`):** Displays location (`🇺🇸 New York Coffee Shop`), scenario prose, 3 bulleted objectives, and `"Start Mission →"` button. Pure presentation layer (no XP side effects).
- **Vocabulary Stage (M4 — `VocabularyStage.tsx`, `vocabulary.ts`):** 6 coffee-related items (`latte`, `iced`, `hot`, `vanilla`, `medium`, `please`) with Vietnamese multiple-choice options. Awards `+10 XP` per correct answer (`XP.VOCABULARY_CORRECT`).
- **Listening Stage (M5 — `ListeningStage.tsx`, `listening.ts`, `audio.ts`):** 3 coffee-shop audio scenarios powered by `window.speechSynthesis` (`en-US`, `rate: 0.9`). Includes `idle`, `playing`, `done`, and `unavailable` fallback states (renders blockquoted English transcript if browser TTS is unavailable). Awards `+10 XP` per correct answer (`XP.LISTENING_CORRECT`).
- **Sentence Assembler (M6 — `SentenceStage.tsx`, `sentences.ts`):** 10 progressive rounds with decreasing time limits (`30s` → `25s` → `20s` → `15s` → `10s`) and increasing points (`10` → `15` → `20` → `25` → `30` pts). Enforces **3 lives (`❤️❤️❤️`)** with heart depletion on wrong submission or timer expiration (`timeLeft === 0`), correct answer reveal on failure, and a `"Game Over / Try Again ↺"` screen if all 3 lives are lost.
- **Learning Recap (M10 — `LearningRecap.tsx`):** Post-gameplay summary displaying outcomes for Vocabulary (6 words), Listening (3 phrases), and Communication takeaway (`"Can I get a latte, please?"`) before navigating to `/completion/usa`.

#### Completion Ceremony & Passport (`/completion/usa`, `CompletionCeremony.tsx`, `PassportModal.tsx`)
- **Completion Ceremony (M7):** Fires a center confetti burst (80 particles) followed by dual side bursts at 350ms. Calls `completeMission("ordering-coffee")` idempotently via `hasTriggered` ref and `usaCompleted` guard in `GameContext`, awarding `+30 XP` (`XP.MISSION_COMPLETE`) and unlocking the USA Stamp, USA Explorer Badge, and Artisanal Coffee Cup gift.
- **Passport Modal Verification (M8 — `PassportModal.tsx`):**
  > **Audit Finding on Passport Design:** `src/components/passport/PassportModal.tsx` (and its styling in `src/app/globals.css` lines 2773–3100) is currently the **single-panel dark modal** (`max-width: 480px`, dark navy gradient `rgba(18, 30, 60, 0.98)`), containing the Header, XP Summary row, Travel Record card (with 4 stage rows including `"Speaking — Coming Soon"`), and 3-column Rewards grid. **It has NOT been upgraded to a 2-page interactive Booklet Passport.**

---

### 3.2 Phase 2: Platform & Dashboard (P1–P2)

- **Landing Page (`src/app/page.tsx`):** Full public marketing page with navigation bar, Hero section with sample USA mission preview card, 6-card Features grid, 4-step "How Wordwise works" section, About Us section, Contact section, Footer, and modal triggers. *(Note: The bottom CTA includes an `"Explore the demo ↗"` link pointing to `/world`, which redirects unauthenticated users back to `/` because `/world` is wrapped in `ProtectedRoute`).*
- **Auth Modals (`SignUpModal.tsx`, `LoginModal.tsx`) & `SessionContext.tsx`:**
  - Collects display name, email, and demo password.
  - **Privacy/Security Compliance:** Passwords are validated only for length/non-emptiness in UI state and **never stored** in `localStorage`.
  - Saves email-to-displayName mapping in `wordwise_profiles` so returning users logging in with just an email receive their saved display name (or a formatted name via `deriveDisplayName()`).
- **`DashboardShell.tsx` & `DashboardSidebar.tsx`:**
  - Responsive layout with desktop fixed sidebar and mobile slide-over drawer.
  - **Sidebar Redundant Links Check:** Confirmed that redundant `"Video Lessons"` and `"Flashcards"` links **have already been removed** from `DASHBOARD_NAV_ITEMS`. The sidebar cleanly displays 7 items:
    1. `Overview` (`/dashboard`)
    2. `Learning Library` (`/dashboard/library`)
    3. `Achievements` (`/dashboard/achievements`)
    4. `Rankings` (`/dashboard/rankings`)
    5. `Events` (`/dashboard/events`)
    6. `Subscription` (`/dashboard/subscription`)
    7. `Content Management` (Disabled with `"Demo"` badge)
- **`LearningProgressCard.tsx`:** Reads `wordwise_curriculum_progress` on mount and listens to `wordwise_curriculum_updated` and `storage` events. Displays `completedLessons / 6`, percentage badge, accessible progress bar, and remaining lessons note. Strictly isolated from game XP.

---

### 3.3 Phase 3: Learning Library (P3.1–P3.3)

- **`lessons.ts` Data Completeness:**
  All **6 out of 6** Renewable Energy STEM lessons are **100% complete** and richly populated:

| Lesson ID | Title | Topic | Category | Level | Reading Paragraphs | Highlighted Terms | Flashcards | Quiz Questions |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `lesson-re-01` | Solar Photovoltaic Systems & Energy Conversion | Solar Energy & Photovoltaics | `reading` | Intermediate | 3 | 7 | 4 | 2 |
| `lesson-re-02` | Wind Power: Turbine Aerodynamics & Grid Integration | Wind Power & Aerodynamics | `vocabulary` | Intermediate | 3 | 6 | 4 | 2 |
| `lesson-re-03` | Hydroelectric Dams & Pumped Energy Storage | Hydroelectric Power | `notes` | Advanced | 3 | 6 | 4 | 2 |
| `lesson-re-04` | Geothermal Heat & Subsurface Energy Extraction | Geothermal Energy | `reading` | Intermediate | 3 | 6 | 4 | 2 |
| `lesson-re-05` | Battery Storage & Electrochemical Systems | Energy Storage & BESS | `vocabulary` | Intermediate | 3 | 6 | 4 | 2 |
| `lesson-re-06` | Smart Grids, Microgrids & Grid Modernization | Smart Grids & Automation | `quiz` | Advanced | 3 | 6 | 4 | 2 |

- **Interactive Lesson Reader Modal (`LessonReaderModal.tsx`):**
  - 3 sub-navigation tabs: `Reading`, `Flashcards (4)`, and `Quick Quiz (2)`.
  - Dynamic regex parser highlights technical terms inline with a `✦` indicator; clicking any term opens a positioned tooltip popover with phonetic transcription, Vietnamese meaning, example sentence, and Web Speech API pronunciation button (`🔊`).
  - Footer includes a `"Mark Lesson as Completed ✓"` toggle button and `"Practice Flashcards →"` step button.
- **3D Flashcard Flip Deck (`FlashcardDeck.tsx`):**
  - Interactive 3D perspective card flip (`isFlipped`), keyboard navigation (`ArrowLeft`, `ArrowRight`, `Space`/`Enter` to flip), progress bar, numbered dot indicators, and TTS audio buttons for both the English term (front) and contextual example sentence (back).
- **Quick Quiz & Progress Persistence (`LessonQuiz.tsx` & `curriculumStorage.ts`):**
  - Question-by-question radio options with instant explanation feedback (`quiz-feedback-box`).
  - Calculates final percentage score (`>= 60%` required to pass).
  - Passing unlocks the `"Complete Lesson & Save Progress"` button, which updates `wordwise_curriculum_progress`, triggers `recordStreakAction()`, and dispatches `wordwise_curriculum_updated` to immediately sync `LearningProgressCard` and `DashboardTopicCard`.

---

### 3.4 Phase 4: Engagement & Monetization (P4.1–P4.4)

- **P4.1 Achievements & Learning Streaks (`AchievementsView.tsx`, `achievements.ts`, `streak.ts`):**
  - **Learning Streak (`wordwise_streak`):** Initializes with a 3-day active demo streak ending yesterday (`freezeCount: 1`) so judges can immediately see the streak increment from **3 → 4 days** upon completing any lesson or mission stage today (`recordStreakAction()`). Renders a 7-day mini-calendar with active flame indicators.
  - **7 Real-Action Badges:** Dynamically computed from live state (`First Step`, `Barista Diplomat`, `Streak Starter`, `Vocabulary Scholar`, `World Citizen`, `Clean Tech Master`, `Sentence Architect`) with persistent unlock dates stored in `wordwise_achievements_timestamps`.
- **P4.2 Community Rankings (`RankingsView.tsx`, `rankings.ts`):**
  - Includes a prominent **Pitch Demonstration Notice Banner** explaining that peer profiles are simulated while the user's own row reflects live device XP and completed modules.
  - Features 3 leagues (`National High Schools`, `Clean Tech League`, `This Week`) with Vietnamese specialized high schools (*THPT Chuyên Lê Hồng Phong, Hà Nội - Amsterdam, Lam Sơn, KHTN, Quốc Học Huế*, etc.), a Top 3 Gamified Podium, and a dynamic sticky `"YOU"` row that calculates the user's rank against the top 10.
- **P4.3 STEM English Events (`EventsView.tsx`, `events.ts`, `eventsStorage.ts`):**
  - 4 curated events (*Green Tech Youth Debate 2026*, *Speaking with MIT Clean Energy Mentors*, *Global Climate English Hackathon*, *STEM Paper Reading & Slide Presentation Workshop*).
  - Category filtering (`All Events`, `Live Webinars`, `English Contests`, `Registered`), persistent 1-click RSVP toggle (`wordwise_registered_events`), live attendee counter (`attendeesCount + 1`), and auto-dismissing toast notifications.
- **P4.4 Subscription & Pricing Hub (`SubscriptionView.tsx`, `subscriptionStorage.ts`):**
  - Includes a **Prototype Mode Notice Banner** clarifying zero payment dependencies.
  - Monthly (`99,000₫/mo`) vs. Annual (`65,800₫/mo` — Save 33%) billing cycle toggle.
  - 2-column comparison (`Free Starter` vs. `Wordwise Pro Explorer`) with 1-click `"🚀 Activate 7-Day Demo Trial"` button (triggers confetti + persists `"pro_trial"` in `wordwise_subscription_tier`) and a `"Revert to Free"` reset button for pitch replayability.

---

## 4. Data Persistence & Reset Audit (`localStorage`)

### 4.1 Complete Inventory of `localStorage` Keys

Every `localStorage` key across `src/` has been cataloged:

| # | `localStorage` Key | Defined In | Data Shape / Type | Purpose | Cleared on **Sign Out**? | Cleared on **Reset Demo**? |
| :-: | :--- | :--- | :--- | :--- | :-: | :-: |
| 1 | `wordwise_session` | `src/context/SessionContext.tsx` | `{ displayName: string, email: string }` | Active user authentication session | **YES** (`removeItem`) | **NO** (Preserved) |
| 2 | `wordwise_profiles` | `src/context/SessionContext.tsx` | `Record<string, string>` (`email -> displayName`) | Non-sensitive lookup to remember display names on subsequent logins | **NO** (Preserved) | **NO** (Preserved) |
| 3 | `wordwise_progress` | `src/lib/progress.ts` | `UserProgress` (`xp`, `usaCompleted`, `usaStampUnlocked`, `usaBadgeUnlocked`, `coffeeCupUnlocked`, `completedStages`) | Game adventure XP, stage completion, and USA rewards | **NO** (Preserved) | **YES** (`removeItem` + state reset) |
| 4 | `wordwise_curriculum_progress` | `src/lib/curriculumStorage.ts` | `{ completedLessonIds: string[] }` | Completed STEM lessons in the Learning Library | **NO** (Preserved) | **YES** (`removeItem` + event dispatch) |
| 5 | `wordwise_streak` | `src/lib/streak.ts` | `{ currentStreak: number, lastActiveDate: string, freezeCount: number }` | Daily study streak counter and 7-day calendar state | **NO** (Preserved) | **YES** (Reset to initial 3-day demo state) |
| 6 | `wordwise_achievements_timestamps` | `src/lib/achievements.ts` | `Record<string, string>` (`badgeId -> dateStr`) | Unlock date stamps for earned achievement badges | **NO** (Preserved) | **YES** (`removeItem`) |
| 7 | `wordwise_registered_events` | `src/lib/eventsStorage.ts` | `string[]` (Event IDs) | User's RSVP'd STEM events and contests | **NO** (Preserved) | **YES** (`removeItem` + event dispatch) |
| 8 | `wordwise_subscription_tier` | `src/lib/subscriptionStorage.ts` | `"free" \| "pro_trial"` | Active subscription tier simulation | **NO** (Preserved) | **YES** (Reset to `"free"`) |

### 4.2 Data Isolation & Reset Verification

1. **Sign Out Isolation (`DashboardSidebar.tsx` → `signOut()`):**
   - Calls `clearSession()` in `SessionContext.tsx`, which executes `localStorage.removeItem("wordwise_session")` and routes to `/`.
   - **Verified:** All learning progress, game XP, stamps, streaks, event RSVPs, and subscription tiers remain untouched when signing out and logging back in.
2. **Reset Demo Completeness (`DashboardSidebar.tsx` & `Topbar.tsx`):**
   - Both the Dashboard Sidebar (`handleResetDemo`) and World Map Topbar (`handleReset`) invoke the exact same 6 cleanup functions after confirmation:
     - `resetProgress()` → clears `wordwise_progress`
     - `clearCurriculumProgress()` → clears `wordwise_curriculum_progress`
     - `resetStreak(true)` → resets `wordwise_streak` to the 3-day demo baseline
     - `clearStoredUnlockTimestamps()` → clears `wordwise_achievements_timestamps`
     - `clearRegisteredEvents()` → clears `wordwise_registered_events`
     - `resetSubscription()` → resets `wordwise_subscription_tier` to `"free"`
   - **Verified:** User remains signed in (`wordwise_session` is untouched) while all platform and game state cleanly resets.

---

## 5. Build Health, Known Bugs & Polish Checklist

### 5.1 TypeScript & Build Health
- **TypeScript Check (`npx tsc --noEmit`):** **PASSED** (Exit code `0`, zero errors, zero warnings).
- **React Hydration Safety:** Root layout (`layout.tsx`) uses `suppressHydrationWarning`, and all client-side `localStorage` reads occur inside `useEffect` hooks after mount, preventing SSR/client hydration mismatches.

### 5.2 Identified UI Discrepancies, Minor Quirks & Legacy Artifacts

1. **`PassportModal.tsx` is Still the Single-Panel Dark Modal (Not 2-Page Booklet):**
   - While the rest of the app uses the warm cream/light pastel brand theme and the audit specification mentions checking whether `PassportModal.tsx` is the single-panel dark modal or the upgraded 2-page interactive Booklet Passport, `PassportModal.tsx` is currently the **Milestone 8 single-panel dark modal** (`max-width: 480px`).
2. **World Map Topbar Lacks a Direct `"← Dashboard"` Navigation Link:**
   - In `src/components/layout/Topbar.tsx`, the Wordwise logo links to `/world` (`<Link href="/world">`). Once a user clicks `"Explore the World"` from `/dashboard` to enter `/world`, there is no button or link in `Topbar.tsx` to return to `/dashboard` (users must use the browser Back button or type the URL).
3. **Landing Page `"Explore the demo ↗"` Link Redirects to `/` When Signed Out:**
   - In `src/app/page.tsx` (line 339), `<Link href="/world" className="home-final-cta-secondary">Explore the demo ↗</Link>` links directly to `/world`. Because `/world` is wrapped in `<ProtectedRoute>`, clicking this link while signed out briefly shows `"Checking access…"` and redirects right back to `/`.
4. **Sentence Stage Double `completeStage("sentence")` Call & XP Replay Behavior:**
   - In `SentenceStage.tsx` (line 125), finishing Round 10 calls `completeStage("sentence")` and shows the `"Sentence Complete!"` summary screen; clicking `"Continue →"` then triggers `MissionRoom.handleStageComplete("sentence")`, which calls `completeStage("sentence")` a second time (safe/idempotent, though redundant).
   - Additionally, while `completeMission("ordering-coffee")` is idempotent (`if (prev.usaCompleted) return prev;`), individual stages (`VocabularyStage`, `ListeningStage`, `SentenceStage`) call `addXP()` on each correct answer without checking if the stage was already completed in a prior run. Replaying the mission allows farming stage XP.
5. **Dashboard Goal Card (`DashboardGoalCard.tsx`) is Static:**
   - `DashboardGoalCard.tsx` displays `"○ Complete 1 Clean Energy reading lesson"` with a static hollow circle `○` rather than dynamically checking `completedIds.length >= 1` to show a completed checkmark `✓`.
6. **Unused / Legacy Files & Minor Cleanup Items:**
   - `src/components/mission/StageShell.tsx`: M3 placeholder fallback component; no longer reached since all 3 stage types (`vocabulary`, `listening`, `sentence`) have dedicated components.
   - `src/components/dashboard/LessonModal.tsx`: 1-line re-export (`export { default } from "@/components/library/LessonReaderModal";`) not imported anywhere.
   - `src/app/dashboard/videos/page.tsx`: Standalone route for the videos tab; functional if visited directly, though unlinked from `DashboardSidebar`.
   - `src/components/mission/MissionRoom.tsx` (line 88): Leftover `console.log("Transitioning to vocabulary stage...");`.
   - `src/data/lessons.ts` (line 327): Minor typo in Lesson 4 Quiz Question 2 option A: `"municipal municipal mains"`.

---

### 5.3 Prioritized Final Polish Checklist (Pre-Pitch to Judges)

#### Priority 1 — High-Impact UX & Navigation Fixes (Recommended Before Live Demo)
- [ ] **Add a `"← Dashboard"` button to `Topbar.tsx` on `/world`:** Allow judges and users on the World Map to return to the STEM Learning Hub (`/dashboard`) with one click instead of relying on the browser Back button.
- [ ] **Fix the `"Explore the demo ↗"` CTA on `src/app/page.tsx`:** Either wire it to open `LoginModal` / `SignUpModal` (or auto-login a demo guest session) when `!session`, or navigate to `/dashboard` if already signed in, preventing the silent redirect loop back to `/`.
- [ ] **Upgrade `PassportModal.tsx` to the 2-Page Interactive Booklet Passport *(if required by pitch script)*:** If the competition pitch highlights a 2-page open passport spread (Identity page + Visa Stamps/Rewards page), upgrade `PassportModal.tsx`; otherwise, the current single-panel dark modal is stable and functional.

#### Priority 2 — Dynamic Polish & Data Consistency
- [ ] **Make `DashboardGoalCard.tsx` reactive to `wordwise_curriculum_progress`:** Toggle the `○` indicator to a green `✓` badge when the learner completes at least 1 Clean Energy lesson (`completedIds.length >= 1`).
- [ ] **Connect Pro Trial (`wordwise_subscription_tier === "pro_trial"`) to UI badges:** Optionally display a `"PRO"` badge next to the user's name in `DashboardSidebar.tsx` when the 7-day Pro Trial is active so judges see cross-page reactivity after activating the trial.

#### Priority 3 — Code Hygiene & Minor Copy Fixes
- [ ] Fix the duplicate word typo `"municipal municipal mains"` in `src/data/lessons.ts` (line 327).
- [ ] Remove the debug `console.log("Transitioning to vocabulary stage...")` in `src/components/mission/MissionRoom.tsx` (line 88).
- [ ] *(Optional)* Guard per-question `addXP()` in `VocabularyStage`, `ListeningStage`, and `SentenceStage` if strict XP cap (`280 XP` max from USA mission) is desired across mission replays.

