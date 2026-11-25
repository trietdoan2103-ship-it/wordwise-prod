# PROJECT_CONTEXT.md
> Last verified: 2026-08-25 — Full codebase inspection performed.
> M6 Sentence Assembler replacement planned — see `docs/SENTENCE_ASSEMBLER_SPEC.md`.

---

## Product Overview

**Wordwise** is a gamified English-learning adventure for Vietnamese high-school students.

This is a **lightweight playable demo / vertical slice** — not a production application.

The single completed end-to-end experience is:

```
World Map → 🇺🇸 USA → ☕ Ordering Coffee Mission
  → Vocabulary → Listening → Sentence Assembler
  → Mission Completion / Ceremony → World Map
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.1 (App Router) |
| UI library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 (via `@tailwindcss/postcss`) |
| Fonts | Geist Sans + Geist Mono (Google Fonts via `next/font`) |
| Confetti | `canvas-confetti` ^1.9.4 |
| Persistence | `localStorage` (key: `wordwise_progress`) |
| Audio | Browser SpeechSynthesis API (TTS only, no speech recognition) |
| Backend | None |
| Database | None |
| Auth | None |

---

## Milestone Status (verified against actual codebase)

| Milestone | Status | Notes |
|---|---|---|
| M1 — Foundation | COMPLETE | Next.js app, Tailwind, TypeScript, layout, GameContext, localStorage |
| M2 — World Map | COMPLETE | SVG map, CountryPin, Topbar (XP, Reset), USA unlocked, England locked |
| M3 — Mission Room | COMPLETE | MissionRoom, MissionStepper, StageShell, routing, stage transitions |
| M4 — Vocabulary | COMPLETE | VocabularyStage (6 questions, MCQ, feedback, XP) |
| M5 — Listening | COMPLETE | ListeningStage (3 questions, TTS, MCQ, feedback, XP) |
| M6 — Sentence Assembler | COMPLETE (PLANNED REDESIGN) | SentenceStage (3 sentences, word-bank clicks, lives, timer, XP) — see `docs/SENTENCE_ASSEMBLER_SPEC.md` for replacement spec |
| M7 — Completion Ceremony | COMPLETE | CompletionCeremony (confetti, XP award, checklist, reward cards, CTA) |
| M8 — Passport Modal | NOT STARTED | Passport button in Topbar is disabled; no PassportModal component exists |

---

## Routing

| URL | Component | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Redirects to `/world` |
| `/world` | `app/world/page.tsx` → WorldMap + Topbar | World Map (home screen) |
| `/mission/usa` | `app/mission/usa/page.tsx` → MissionRoom | USA Ordering Coffee mission |
| `/completion/usa` | `app/completion/usa/page.tsx` → CompletionCeremony | Mission Completion Ceremony |

---

## Key Source Files

### App Routes
- `src/app/layout.tsx` — Root layout; wraps everything in GameProvider
- `src/app/page.tsx` — Root redirect to /world
- `src/app/world/page.tsx` — World Map page
- `src/app/mission/usa/page.tsx` — USA mission page
- `src/app/completion/usa/page.tsx` — Completion Ceremony page

### Components
- `src/components/layout/Topbar.tsx` — Logo, XP counter, Passport button (disabled), Reset Demo
- `src/components/world/WorldMap.tsx` — SVG world map + CountryPins
- `src/components/world/CountryPin.tsx` — Individual map pin (unlocked/locked)
- `src/components/mission/MissionRoom.tsx` — Mission shell (header, stepper, stage routing, completion nav)
- `src/components/mission/MissionStepper.tsx` — Horizontal 3-step progress indicator
- `src/components/mission/StageShell.tsx` — Fallback placeholder (no longer reached in normal flow)
- `src/components/stages/VocabularyStage.tsx` — Vocabulary mini-game
- `src/components/stages/ListeningStage.tsx` — Listening mini-game (TTS)
- `src/components/stages/SentenceStage.tsx` — Sentence Assembler mini-game
- `src/components/rewards/CompletionCeremony.tsx` — Ceremony screen (confetti, checklist, rewards)
- `src/components/rewards/RewardCard.tsx` — Individual reward display card
- `src/components/passport/` — Directory exists, only .gitkeep (M8 placeholder)
- `src/components/ui/` — Directory exists, only .gitkeep (reserved)

### Data (static, content-separated from UI)
- `src/data/countries.ts` — USA (unlocked) + England (locked)
- `src/data/missions.ts` — Ordering Coffee mission definition + reward data
- `src/data/vocabulary.ts` — 6 vocabulary items (latte, iced, hot, vanilla, medium, please)
- `src/data/listening.ts` — 3 listening scenarios
- `src/data/sentences.ts` — 3 sentence assembler challenges

### Context and Lib
- `src/context/GameContext.tsx` — GameProvider + useGame() hook
- `src/lib/progress.ts` — loadProgress, saveProgress, clearProgress (localStorage key: wordwise_progress)
- `src/lib/xp.ts` — XP constants (VOCABULARY_CORRECT=10, LISTENING_CORRECT=10, SENTENCE_CORRECT=20, MISSION_COMPLETE=30)
- `src/lib/audio.ts` — speak(), stopSpeech(), isTTSAvailable() (SpeechSynthesis wrapper)
- `src/types/game.ts` — All TypeScript types (Country, Mission, MissionStage, VocabularyItem, ListeningItem, SentenceItem, Reward, UserProgress, GameContextValue)

### Styling
- `src/app/globals.css` — All CSS (~49KB); Tailwind 4 + custom game CSS classes

---

## GameContext State Shape

```ts
type UserProgress = {
  xp: number;                    // Total earned XP
  usaCompleted: boolean;         // USA mission fully done
  usaStampUnlocked: boolean;     // Visa stamp reward
  usaBadgeUnlocked: boolean;     // Explorer badge reward
  coffeeCupUnlocked: boolean;    // Cultural gift reward
  completedStages: string[];     // Stage IDs: "vocabulary", "listening", "sentence"
};
```

Stored in localStorage under key `wordwise_progress`. Hydrated on first client mount; saved on every state change.

### GameContext Actions
- `addXP(amount)` — increments XP
- `completeStage(stageId)` — idempotently adds stage to completedStages
- `completeMission("ordering-coffee")` — idempotently sets usaCompleted + all reward flags + adds bonus XP
- `resetProgress()` — clears localStorage and resets to defaults

---

## XP System

| Activity | XP |
|---|---|
| Vocabulary correct answer | +10 |
| Listening correct answer | +10 |
| Sentence correct answer | +20 |
| Mission complete bonus | +30 |

Maximum XP for one full run (all correct): (6x10) + (3x10) + (3x20) + 30 = 180 XP

---

## Gameplay Flow (verified end-to-end)

```
/ → /world (redirect)
  Topbar: Logo | XP Counter | Passport (disabled) | Reset Demo
  WorldMap: USA Pin (unlocked, glowing) | England Pin (locked)
    ↓ Click USA
/mission/usa
  MissionRoom: Header (← Map | Flag | Country | Mission title)
  MissionStepper: Vocabulary → Listening → Sentence
    Stage 1: VocabularyStage
      - 6 MCQ questions (Vietnamese options)
      - Select → Check Answer → feedback (correct/incorrect) → Next Question
      - +10 XP per correct answer
    Stage 2: ListeningStage
      - 3 TTS scenarios (browser SpeechSynthesis)
      - Play Audio / Replay → Select answer → Check Answer → feedback → Next Question
      - Fallback text transcript if TTS unavailable
      - +10 XP per correct answer
    Stage 3: SentenceStage
      - 3 sentence assembler challenges
      - Word bank chips → Answer area → Check Answer → feedback → Next/Retry
      - Lives system (3 hearts), 30-second countdown timer
      - Game Over screen if lives reach 0, with restart option
      - +20 XP per correct answer
    ↓ All 3 stages complete → router.push("/completion/usa")
/completion/usa
  CompletionCeremony:
    - completeMission("ordering-coffee") called on mount (idempotent via useRef)
    - Confetti: centre burst + delayed side bursts (canvas-confetti)
    - XP badge (+30 displayed)
    - Completed stages checklist (dynamically from mission.stages)
    - RewardCards: USA Stamp | USA Explorer Badge | Artisanal Coffee Cup (staggered reveals)
    - "Continue Journey →" → router.push("/world")
```

---

## M7 — Completion Ceremony: Verified Complete

`src/components/rewards/CompletionCeremony.tsx` is fully implemented:
- completeMission("ordering-coffee") called idempotently via useRef guard
- canvas-confetti: centre burst + delayed side bursts
- XP bonus badge (+30 displayed from mission.reward.bonusXP)
- Completed stages checklist mapped from mission.stages
- Three RewardCard components (stamp, badge, gift) with staggered animation delays
- "Continue Journey →" CTA navigating back to /world
- RewardCard at `src/components/rewards/RewardCard.tsx`
- Route shell at `src/app/completion/usa/page.tsx`
- All reward data sourced from `src/data/missions.ts`

---

## M6 — Sentence Assembler Redesign (PLANNED)

The current `SentenceStage` (3 sentences, flat scoring, retry-on-wrong behaviour) will be replaced
with a 10-round timed puzzle as specified in `docs/SENTENCE_ASSEMBLER_SPEC.md`.

Key changes versus current M6:
- 10 rounds instead of 3
- Per-round time limits (30 → 10 sec over 10 rounds)
- Per-round variable points (10 → 30 over 10 rounds)
- Incorrect answer always advances to next round (shows correct answer first, removes 1 life)
- Score display added to top bar
- `SentenceItem` type extended with `round`, `timeLimit`, `points` fields
- `src/data/sentences.ts` expanded to 10 entries

Files that will NOT change: `GameContext.tsx`, `MissionRoom.tsx`, `progress.ts`, `missions.ts`,
all other stages, `CompletionCeremony.tsx`.

Implementation of the redesign has NOT started. Do not modify `SentenceStage.tsx` until
explicitly instructed.

---

## M8 — Passport Modal (FINISHED)
## Architecture Principles (Permanent Rules)

- NO backend, database, Supabase, authentication, or API routes
- NO speech recognition, speaking AI, or pronunciation scoring
- NO drag-and-drop for Sentence Assembler (click-based word bank is intentional)
- Content is data-driven: `src/data/` is separate from `src/components/`
- localStorage ONLY for persistence
- One milestone at a time — do not add future features in advance
- StageShell is a fallback only — all three real stage components exist

---

## Known Issues and Observations

1. **StageShell docstring is stale**: Comment says "will be replaced in M4-M6" but those milestones are done. StageShell is now only a fallback for hypothetical unknown stage types. Not a functional bug.

2. **Passport button intentionally disabled**: M8 placeholder, not a bug.

3. **countries.ts missions array is empty**: Each Country has `missions: []` with comment about circular refs. Mission lookup uses getMissionById() from missions.ts directly. By design, not a bug.

4. **Sentence Assembler strict string comparison**: Targets have no punctuation (e.g., "Can I get a latte please"). Intentional to avoid player frustration with punctuation edge cases.

5. **SentenceStage earnedXP resets on Game Over retry**: When the player restarts after losing all lives, earnedXP local state resets to 0. XP already awarded to the global total (via addXP) is preserved, but the session display resets. Minor UX quirk, not blocking.

6. **No /passport route**: Per spec the Passport is a modal opened from Topbar, not a separate page. Correct.

---

## Scope Boundaries — Do NOT Add Unless Explicitly Requested

- Backend / database / Supabase / authentication
- Speaking AI / speech recognition / pronunciation scoring
- Additional countries or missions beyond USA demo
- Leaderboards, streaks, personalized learning
- Drag-and-drop for Sentence Assembler
- Production infrastructure

---

## Development Workflow

```
One small milestone
      ↓
Implement only the requested scope
      ↓
Lightweight verification (TypeScript/build check, lint, component integration)
      ↓
Report: files changed | what was implemented | what to manually test | concerns
      ↓
User manually tests in browser
      ↓
Review / bug fixes if necessary
      ↓
Next milestone
```

# Testing Responsibility

**Important testing instruction:**

Do not spend significant time attempting to fully automate or repeatedly test interactive gameplay flows, especially flows involving countdowns, timers, animations, or time-based state transitions.

Your responsibility is to implement the requested feature correctly and perform only lightweight verification where practical, such as:

* TypeScript/build checks
* Lint checks if available
* Checking for obvious runtime or compilation errors
* Verifying static logic and component integration

For interactive gameplay behavior, including countdowns and timer-based mechanics, **I will perform the manual testing myself in the browser after your implementation is complete**.

Therefore:

* Do **not** remove, simplify, disable, or bypass countdown/timer mechanics just to make automated testing easier.
* Do **not** spend excessive time waiting for countdowns to finish during testing.
* Do **not** repeatedly run long interactive test cycles.
* Preserve the intended gameplay behavior unless I explicitly ask you to change it.

After implementation, clearly report:

1. What files were changed
2. What was implemented
3. Any lightweight verification you performed
4. What I should manually test in the browser
5. Any potential issues or assumptions
