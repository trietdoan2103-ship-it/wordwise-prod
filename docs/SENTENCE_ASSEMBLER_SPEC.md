# SENTENCE_ASSEMBLER_SPEC.md
> Canonical product requirement — Sentence Assembler replacement.
> Status: **SPEC COMPLETE — NOT YET IMPLEMENTED**
> Last updated: 2026-08-25

---

## 0. Context

This document specifies the **replacement** of the existing `SentenceStage`
mini-game (M6) with a redesigned Sentence Assembler.

The current implementation (M6) works and must NOT be broken until the
replacement is ready.  
See `src/components/stages/SentenceStage.tsx` for the current code.

---

## 1. Game Concept

A sentence-building game where the player assembles an English sentence by
selecting/reordering word chunks.

The game should feel like a **timed puzzle**, not a conventional
multiple-choice quiz.

---

## 1.2 Pre-game / Content Selection

Before entering the game, the user can select the content/topic they want to
practice based on unlocked topics.

Example topics:
- Hobbies
- Sports
- Grammar topics such as Present Simple

The number of available rounds can depend on the number of unlocked topics.

**Example:** If *Present Simple* and *Sports* are unlocked, the player can
choose one or both.

The game supports up to **3 lives**.

> **Implementation note — topic unlocking:**
> Do not invent a large topic-unlocking system just for this feature.
> Use whatever topic/unlock state already exists in the project where practical.
> If the project does not have the necessary unlock system, document that
> dependency instead of creating a large new progression system without
> instruction.
>
> **Current project state:** The existing unlock model tracks `usaCompleted`,
> `usaStampUnlocked`, `usaBadgeUnlocked`, and `coffeeCupUnlocked` per-mission.
> There is no per-topic unlock system.
> For the initial implementation, a single curated topic set that fits the
> existing "Ordering Coffee" mission is acceptable.
> A multi-topic selection UI is a future enhancement, not a blocker.

---

## 1.3 Main UI

The screen has three major areas.

### Top Bar

Display:
- Game title: `SENTENCE ASSEMBLER`
- Current topic
- Score
- Lives: 3 heart icons

Conceptual layout:

```
[SENTENCE ASSEMBLER]   [Topic: Sports]   [Score]   [♥ ♥ ♥]
```

### Play Area

Contains shuffled word blocks / chunks.

The player interacts with these blocks to construct the sentence.

### Interaction Rule

**Use click-to-add / click-to-remove.**
Do NOT use drag-and-drop.

When a word/chunk is selected:

```
Word Bank
    ↓ click
Assembly Line
```

When a selected chunk is clicked again or otherwise removed:

```
Assembly Line
    ↓ remove
Word Bank
```

---

## 1.3.1 Assembly Line

A row of slots near the bottom of the game area.

Selected chunks are placed into these slots from left to right according to
selection order.

The player can remove selected chunks and adjust the constructed sentence.

---

## 1.4 Core Gameplay

Each round asks the player to construct the correct English sentence from
shuffled pieces.

### Time Limit

The time limit decreases as the round progresses:

| Round | Time Limit |
|------:|-----------:|
|     1 |     30 sec |
|     2 |     25 sec |
|     3 |     20 sec |
|     4 |     15 sec |
|     5 |     15 sec |
|     6 |     15 sec |
|     7 |     10 sec |
|     8 |     10 sec |
|     9 |     10 sec |
|    10 |     10 sec |

Maximum: **10 rounds per topic.**

> The timer is an intentional part of the gameplay and MUST NOT be removed
> merely to make automated testing easier.

---

## 1.4.1 Difficulty Progression

Sentence length and complexity should increase over time.

**Early rounds:**
- Longer sentences can still be used
- Structures should remain relatively simple
- Prefer basic single-clause structures

**Later rounds:**
- Mix simpler sentences with more difficult content
- Allow advanced vocabulary
- Allow more complex grammatical structures

The content should become progressively more challenging rather than simply
longer.

---

## 1.5 Lives / Mistakes

The player starts with:

```
♥ ♥ ♥
```

If the player submits an incorrect sentence:

1. Show that the answer is incorrect.
2. Reveal the correct arrangement.
3. Remove 1 life.
4. Continue to the next round.

```
Incorrect
→ Show correct arrangement
→ -1 ♥
→ Continue
```

When all 3 lives are lost:

```
GAME OVER
```

Use a short failure message/animation where appropriate.
Do not create a complex game-over system.

> **Change from current implementation:**
> Current behaviour on incorrect: shows "Almost! Try arranging the words again."
> and offers a **retry on the same sentence** without advancing.
> New behaviour: always advance to next round after revealing correct answer,
> regardless of correctness. The penalty is the life loss only.

---

## 1.6 Scoring

Award points based on round difficulty.

| Round | Points |
|------:|-------:|
|     1 |     10 |
|     2 |     15 |
|     3 |     20 |
|     4 |     25 |
|     5 |     25 |
|     6 |     25 |
|     7 |     30 |
|     8 |     30 |
|     9 |     30 |
|    10 |     30 |

When the answer is correct, award the corresponding round points.

Keep the scoring deterministic.

> **Change from current implementation:**
> Current: flat `+20 XP` per correct sentence (from `XP.SENTENCE_CORRECT`).
> New: per-round variable points as above.
> The XP constant `XP.SENTENCE_CORRECT` will need updating or replacement.

---

## 1.7 Implementation Notes

- Sentence content must remain in data files (`src/data/sentences.ts` or a
  new file — do not embed in component code).
- The data model should have a canonical `targetSentence`.
- Word chunks should be derived from or associated with the target sentence.
- Validation must be deterministic.
- Do NOT use drag-and-drop.
- Keep timer state logically separated from sentence-selection state.
- Lives and score should be managed explicitly.

---

## 1.8 Content Consistency Rule

The canonical target sentence and its chunks must use the **same punctuation
convention**.

Do NOT create mismatches such as:

```
target:  "Can I get a latte please"
chunks:  ["Can", "I", "get", "a", "latte,", "please?"]
```

Prefer a clear canonical representation and deterministic validation.

---

## 2. Architecture Requirements

Reuse the existing project architecture wherever reasonable.

Do NOT introduce:
- Backend
- Database
- Supabase
- Authentication
- Speaking AI / speech recognition
- New external game engine
- New persistence system

Do not redesign unrelated parts of the app.

The new Sentence Assembler must continue to fit into the existing mission flow:

```
MissionRoom → SentenceStage (type="sentence") → onComplete() → /completion/usa
```

The `onComplete` prop interface does not change.

---

## 3. Testing Rule

Manual browser testing will be performed for interactive gameplay.

Do NOT:
- Wait through 30-sec / 25-sec / 20-sec / 15-sec / 10-sec timers during
  automated verification.
- Remove, disable, or bypass the countdown.
- Simplify the timer purely for testing convenience.

Perform only lightweight verification:
- TypeScript/build checks
- Lint checks if available
- Static logic inspection
- Component integration
- Import/type verification

---

## 4. Codebase Analysis — What Changes vs What Stays

### Files That Will Change

| File | Change |
|---|---|
| `src/components/stages/SentenceStage.tsx` | **Full replacement** — new UI, new round system, new scoring |
| `src/data/sentences.ts` | **Expand** — needs 10 round entries; current type needs extension |
| `src/lib/xp.ts` | **May need updating** — flat `SENTENCE_CORRECT` replaced by per-round values |
| `src/types/game.ts` → `SentenceItem` | **Extend** — add `round`, `timeLimit`, `points` fields |
| `src/app/globals.css` | **Extend** — new CSS for score display, correct-answer reveal, etc. |

### Files That Stay Unchanged

| File | Reason |
|---|---|
| `src/context/GameContext.tsx` | `addXP()`, `completeStage()` interface unchanged |
| `src/components/mission/MissionRoom.tsx` | `<SentenceStage onComplete={...} />` interface unchanged |
| `src/lib/progress.ts` | localStorage shape unchanged |
| `src/data/missions.ts` | Stage definition unchanged |
| `src/components/mission/MissionStepper.tsx` | No changes needed |
| `src/components/stages/VocabularyStage.tsx` | Untouched |
| `src/components/stages/ListeningStage.tsx` | Untouched |
| `src/components/rewards/CompletionCeremony.tsx` | Untouched |

### Architectural Gaps / Dependencies

| Gap | Status | Action Required |
|---|---|---|
| Per-topic unlock system | **Not present** | For initial implementation, use a single topic set matching the existing mission. Topic selection UI is a future enhancement. |
| Per-round XP constants | **Not present** — currently flat `SENTENCE_CORRECT=20` | Define per-round points in data file or lookup table |
| Correct-answer reveal UI | **Not present** | New CSS + JSX needed in `SentenceStage` |
| Score display in top bar | **Not present** (current shows round progress) | New UI state + CSS class needed |
| Timer per-round lookup table | **Not present** — currently hardcoded `30` seconds | Add lookup derived from round index in new data shape |

---

## 5. Planned Data Shape (New `SentenceItem`)

The current type:

```ts
type SentenceItem = {
  id: string;
  targetSentence: string;
  words: string[];
  xp: number;            // flat, currently 20 for all
};
```

Proposed extension for the new design:

```ts
type SentenceItem = {
  id: string;
  round: number;          // 1-based round number (1–10)
  targetSentence: string;
  words: string[];        // pre-shuffled chunks
  points: number;         // per-round award (10/15/20/25/25/25/30/30/30/30)
  timeLimit: number;      // seconds (30/25/20/15/15/15/10/10/10/10)
};
```

> The `xp` field name may be renamed to `points` or kept as `xp` — decide
> at implementation time for consistency with VocabularyItem / ListeningItem
> which also have `xp` fields.

---

## 6. Timer Table (Lookup)

```ts
const ROUND_TIME: Record<number, number> = {
  1: 30, 2: 25, 3: 20,
  4: 15, 5: 15, 6: 15,
  7: 10, 8: 10, 9: 10, 10: 10,
};
```

---

## 7. Points Table (Lookup)

```ts
const ROUND_POINTS: Record<number, number> = {
  1: 10, 2: 15, 3: 20,
  4: 25, 5: 25, 6: 25,
  7: 30, 8: 30, 9: 30, 10: 30,
};
```

---

## 8. Open Questions (Resolved or Deferred)

| Question | Resolution |
|---|---|
| Multi-topic selection UI | **Deferred** — use single topic for initial implementation |
| Which topic name to show in top bar | Use the mission context (e.g. "Ordering Coffee") or a label from the data file |
| Retry on incorrect vs advance | **Resolved** — always advance after incorrect, show correct answer, lose 1 life |
| What happens when all 10 rounds complete with lives remaining | Show completion screen, call `onComplete()` to proceed in mission flow |
| XP field name — keep `xp` or rename to `points` | Decide at implementation; `xp` is consistent with other items but `points` is clearer for display |

---

*End of specification.*
