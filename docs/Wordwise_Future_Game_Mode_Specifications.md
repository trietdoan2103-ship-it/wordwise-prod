# Wordwise — Future Game Mode Specifications

> \*\*Purpose:\*\* This document preserves the original design descriptions for four Wordwise game modes so a future coding Agent can understand the intended gameplay, UI structure, rules, progression, scoring, and interaction model.
>
> \*\*Important:\*\* These game modes are future expansion candidates. They are not required for the current Demo roadmap. Do not implement them until the current M1–M8 plan is complete unless explicitly instructed.

\---

# 1\. Sentence Assembler

## 1.1 Game concept

A sentence-building game where the player assembles an English sentence by selecting/reordering word chunks.

The game should feel like a timed puzzle rather than a conventional multiple-choice quiz.

## 1.2 Pre-game / content selection

Before entering the game, the user can select the content/topic they want to practice based on unlocked topics.

Examples:

* Hobbies
* Sports
* Grammar topics such as Present Simple

The number of available rounds can depend on the number of unlocked topics.

Example:

* If Present Simple and Sports are unlocked, the player can choose one or both.
* The game can have up to 3 lives.

## 1.3 Main UI

The screen is divided into three major areas.

### Top Bar

Display:

* Game title: `SENTENCE ASSEMBLER`
* Current topic
* Score
* Lives: 3 heart icons

Conceptually:

```text
\[SENTENCE ASSEMBLER]   \[Topic: Sports]   \[Score]   \[♥ ♥ ♥]
```

### Play Area

Contains shuffled word blocks / chunks.

The player interacts with these blocks to construct the sentence.

Important interaction rule:

> Use click-to-add / click-to-remove. Do NOT use drag-and-drop.

When a word/chunk is selected, it is added to the Assembly Line.

### Assembly Line

A row of empty slots near the bottom of the game area.

Selected word chunks are placed into these slots from left to right according to selection order.

The player can remove selected chunks and adjust the constructed sentence.

## 1.4 Core gameplay

Each round asks the player to construct the correct English sentence from shuffled pieces.

### Time limit

The time limit decreases as the round progresses:

|Round|Time|
|-|-:|
|1|30 seconds|
|2|25 seconds|
|3|20 seconds|
|4|15 seconds|
|5|15 seconds|
|6|15 seconds|
|7|10 seconds|
|8|10 seconds|
|9|10 seconds|
|10|10 seconds|

Maximum: 10 rounds per topic.

### Difficulty progression

Sentence length and complexity increase over time.

* Early rounds: longer sentences but simple structures, such as basic single-clause sentences.
* Later rounds: mix simpler vocabulary sentences with more difficult sentences containing advanced vocabulary and/or more complex structures.

## 1.5 Lives / mistakes

The player starts with 3 lives.

If the player submits an incorrect sentence:

1. The sentence is rearranged into the correct order.
2. The player loses 1 life.
3. The player continues to the next round.

Example state:

```text
Incorrect
→ Show correct arrangement
→ -1 ♥
→ Continue
```

When all 3 lives are lost:

```text
Game Over
```

The intended visual can communicate defeat with a short failure message/animation.

## 1.6 Scoring

Scoring increases with round difficulty.

|Round|Points|
|-|-:|
|1|10|
|2|15|
|3|20|
|4|25|
|5|25|
|6|25|
|7|30|
|8|30|
|9|30|
|10|30|

If the answer is correct, award the corresponding points.

## 1.7 Implementation notes

The future implementation should keep:

* Sentence content in data files.
* Target sentence as the canonical answer.
* Word chunks derived from / associated with the target sentence.
* Validation deterministic.
* No drag-and-drop dependency.
* Timer state isolated from the sentence-selection state.
* Lives and score managed explicitly.

### Important content consistency rule

The canonical target sentence and its chunks must use the same punctuation convention.

For example, do not have:

```text
target: "Can I get a latte please"
```

while expecting:

```text
"Can I get a latte, please?"
```

unless normalization is deliberately implemented.

\---

# 2\. Circuit Repair

## 2.1 Game concept

A vocabulary/grammar game presented as repairing an electronic circuit.

The user chooses a topic and solves a sequence of circuit boards under increasing time pressure.

The interface should visually resemble an interactive electronic circuit rather than a normal quiz.

## 2.2 Pre-game / topic selection

Before the game begins, the student chooses a topic from unlocked vocabulary or grammar topics.

Examples:

* Vocabulary: AI \& Machine Learning
* Grammar: Relative Clauses
* Grammar: Conditionals

## 2.3 Main UI

The game has three major areas.

### Top Bar — Status

Display:

* Game title
* Selected topic
* Time / energy bar
* Current score
* Lives: 3 pin/battery-style icons

Example:

```text
Circuit Repair | Topic: AI \& Machine Learning

\[Energy bar]        \[Score]   \[● ● ●]
```

The energy/time bar gradually decreases during the round.

### Play Area — Main Circuit

The circuit board contains:

#### Left side: 4 clue chips

These contain:

* vocabulary terms/technical terms, or
* beginnings/fragments of grammar sentences.

#### Right side: 4 answer nodes

These contain:

* Vietnamese meanings corresponding to vocabulary terms, or
* grammar completions corresponding to sentence fragments.

The answer nodes should be shuffled randomly.

#### Connecting wires

Flexible wires visually connect the player's selections.

The user interacts by selecting/pairing the appropriate left and right items.

## 2.4 Core gameplay

A match consists of up to 10 circuit boards.

Time decreases as the board number increases.

|Board|Time|
|-|-:|
|1|30 seconds|
|2|25 seconds|
|3|20 seconds|
|4–6|15 seconds|
|7–10|10 seconds|

Difficulty increases in the same general direction as Sentence Assembler.

## 2.5 Lives / error handling

The player starts with 3 lives.

A wrong connection causes:

* an electrical error effect,
* loss of 1 life,
* an appropriate short feedback state.

A correct/finished board causes:

* the circuit to light up / become active,
* a short success feedback,
* progression to the next board.

When all 3 lives are lost:

```text
Game Over
```

### Timeout behavior

When the timer reaches zero:

* the system should handle the board as a failed/expired attempt,
* show the appropriate feedback,
* proceed according to the game's life/progression rules.

The source specification explicitly states that when the time expires, the system should provide a brief visual indication before moving to the next board or ending the game.

## 2.6 Feedback states

The final feedback area can show messages such as:

```text
"Electric Surge! +25 points"
```

or

```text
"Short Circuit! -1 Battery"
```

The visual language should reinforce the electronics metaphor.

## 2.7 Scoring

|Board|Points|
|-|-:|
|1|10|
|2|15|
|3|20|
|4–6|25|
|7–10|30|

### Perfect Circuit bonus

If the player completes all 4 pairs correctly without making a mistake:

```text
+5 points
```

This is a bonus on top of the normal board score.

## 2.8 Implementation notes

Keep the content data-driven.

Conceptually:

```text
CircuitBoard
├── clues\[4]
├── answers\[4]
├── correctPairs
├── difficulty
├── timeLimit
└── score
```

The right-side answers should be shuffled at runtime while the correct mapping remains deterministic.

The interaction should be designed for both desktop and touch devices.

\---

# 3\. Tech Runner

## 3.1 Game concept

A fast-paced 3-lane running game for vocabulary and grammar practice.

The player controls a robot/runner moving forward automatically. The player answers questions by moving the character into the lane containing the correct answer.

The game should feel like a lightweight 2D/3D runner rather than a static quiz.

## 3.2 Pre-game / topic selection

Before starting, the user chooses a STEM or grammar topic from unlocked content.

Examples:

* Cybersecurity
* Grammar topics
* STEM vocabulary

## 3.3 Main UI

### Top Bar

Display:

* Game title
* Topic
* 60-second countdown
* Accumulated score

Example:

```text
Tech Runner | Topic: Cybersecurity
Time: 60       Score: 0000
```

### Play Area

The main running path has 3 lanes:

```text
\[ LEFT ] \[ CENTER ] \[ RIGHT ]
```

The robot/character automatically runs forward.

### Question

A question appears in front of the character.

Example:

```text
He is the person \_\_\_\_\_ coaches the football team.
```

### Three answer gates

Each lane contains one answer.

Example:

```text
\[ who ]   \[ where ]   \[ which ]
```

The player chooses the lane containing the correct answer.

## 3.4 Controls

Support:

### Touch / mouse

* Swipe left/right on touch devices.
* Or use equivalent left/right screen interaction.

### Keyboard

* Arrow keys / equivalent lane controls.

The implementation should keep controls responsive and simple.

## 3.5 Core gameplay

Each round lasts exactly:

```text
60 seconds
```

There is no fixed maximum number of questions.

The player can answer as many questions as possible within one minute.

After passing through a gate:

1. The current question ends.
2. After approximately 1 second, a new question and three new gates appear.
3. The runner continues automatically.

## 3.6 Difficulty progression

Difficulty increases throughout the 60-second session.

### First 20 seconds

* Simple vocabulary
* Short/simple sentences

### Middle 20 seconds

* More difficult vocabulary
* More complex sentence structures

### Final 20 seconds

* Complex grammar
* Advanced vocabulary definitions / terminology

## 3.7 Correct / incorrect feedback

### Correct

* Character accelerates slightly.
* A green visual effect appears.
* Score increases.

### Incorrect

* Character slows down / a brief impact state occurs.
* Screen can briefly shake for about 1 second.
* The game does **not** immediately end.
* The correct answer is highlighted immediately so the learner can learn from the mistake.

The runner then continues.

## 3.8 Scoring

Base score:

```text
+100 points per correct answer
```

### Combo

A streak of at least 3 consecutive correct answers activates an Overdrive state.

Each subsequent correct answer during the combo receives:

```text
+200 bonus points per question
```

The exact presentation of the combo state should be visually obvious.

## 3.9 End condition

When the countdown reaches:

```text
00:00
```

the game stops.

The result screen should show:

* Total score
* Questions answered
* Correct / incorrect results
* A list of questions answered incorrectly so the learner can review them

## 3.10 Implementation notes

Conceptually:

```text
TechRunnerGame
├── timer
├── score
├── combo
├── currentQuestion
├── lanes\[3]
├── runnerPosition
└── questionHistory
```

Question generation should be data-driven.

The number of questions is determined by player speed, not by a fixed question count.

\---

# 4\. Target Smasher

## 4.1 Game concept

An arcade-style vocabulary/concept recognition game.

The player sees a target concept at the top/center and must hit the matching moving vocabulary target.

The experience should resemble an arcade shooting / target-smashing game.

## 4.2 Pre-game / topic selection

Before playing, the user chooses a vocabulary/concept topic from unlocked content.

Examples:

* Emotions
* Weather
* Food \& Drinks
* Jobs
* Hobbies
* Nature

## 4.3 Main UI

The game contains three main areas.

### Top Bar

Display:

* Game title
* Selected topic
* 60-second countdown
* Current score

Example:

```text
Target Smasher | Topic: Weather \& Nature
Time: 60       Score: 0000
```

### Target / Objective Area

At the top/center, show an icon or image representing the concept that must be found.

Example:

```text
Target: Rain
```

or a visual icon/image for the requested concept.

### Play Area

Multiple vocabulary targets move around the play area.

The initial specification describes:

* 4 target/balloon-like choices
* Targets can move horizontally or float upward
* Their positions are randomized

The player taps/clicks the target that corresponds exactly to the requested concept.

## 4.4 Core gameplay

Each round lasts exactly:

```text
60 seconds
```

When the player successfully hits the correct target:

1. The target disappears.
2. A new group of targets immediately appears / floats into the play area.
3. The player receives points.
4. Feedback animation plays.

The player can therefore complete multiple targets during one 60-second session.

## 4.5 Difficulty and speed progression

The game becomes progressively harder.

### First 20 seconds

* Targets are stationary or move slowly.
* Only 3 targets are available.

### Next 20 seconds

* Targets begin moving horizontally.
* 4 targets are available.

### Final 20 seconds

* Targets move faster.
* Targets can change direction.
* 4 targets remain available.
* Vocabulary becomes more difficult.

The number of successful targets also depends on how quickly the player can respond.

Example stated in the source:

```text
First 20 seconds: approximately 3–4 successful targets
```

## 4.6 Correct / incorrect feedback

### Correct target

Show:

* Explosion / star / “Puff!” style effect
* Positive feedback such as “Bullseye!”
* Score increase

### Incorrect target

Show:

* Brief shake effect
* “Boing!” style negative feedback

After an incorrect selection, the correct target should be clearly indicated briefly (approximately 1 second) so the learner knows the answer.

## 4.7 Scoring

Each correct target:

```text
+100 points
```

### Sharpshooter Combo

If the player hits 5 targets correctly in a row without missing:

```text
Fever Mode
```

is activated.

During Fever Mode:

```text
+200 bonus points per subsequent target
```

The visual state should clearly communicate that the player entered a special scoring mode.

## 4.8 End / results screen

After 60 seconds:

```text
Game Over / Results
```

Show:

* Total score
* Accuracy percentage
* Vocabulary / targets missed
* Reviewable missed words

This allows the arcade experience to still produce a learning outcome.

## 4.9 Implementation notes

Conceptually:

```text
TargetSmasherGame
├── timer
├── score
├── combo
├── currentTarget
├── movingTargets\[]
├── difficultyPhase
└── missedItems\[]
```

Target positions and movement should be generated dynamically.

The movement system should be lightweight enough to remain responsive on mobile devices.

\---

# 5\. Shared Design Principles

Although these are different game modes, they should eventually share a common Wordwise visual and technical language.

## 5.1 Data-driven content

Game content should live in dedicated data structures/files rather than being hard-coded into UI components.

The game engine should receive content and rules as data.

## 5.2 Shared progression concepts

Where appropriate, games can share:

* XP
* Score
* Topic progress
* Completion state
* Rewards
* Difficulty progression

But each game may have its own scoring mechanic.

## 5.3 Responsive interaction

Every future game should consider:

* Desktop mouse/keyboard
* Tablet
* Mobile touch

Do not design a game that works only with desktop drag interactions.

## 5.4 Learning feedback is mandatory

These games should not be pure arcade mechanics.

When the learner makes a mistake, the game should ideally reveal or communicate the correct answer so the mistake becomes a learning opportunity.

## 5.5 Avoid unnecessary backend complexity

The original Demo architecture is local-first.

Unless the product requirements change, these game modes should be implementable with:

* React state
* Game/content data
* Existing Wordwise context/progress mechanisms
* localStorage where persistence is needed

No backend/database should be assumed merely to implement the gameplay.

\---

# 6\. Future Agent Implementation Checklist

Before implementing any of these games, the Agent should:

1. Read this document completely.
2. Inspect the existing Wordwise architecture.
3. Identify reusable components and utilities.
4. Inspect the existing data/content conventions.
5. Avoid breaking the existing Demo.
6. Avoid introducing drag-and-drop where click/touch interaction is sufficient.
7. Keep game content separate from rendering logic.
8. Implement one game mode at a time.
9. Test desktop and mobile interaction.
10. Verify timer, scoring, lives/combo, feedback, and end states.
11. Run TypeScript checks.
12. Perform browser QA for the complete gameplay loop.

\---

# 7\. Scope Reminder

These four game modes are **future product specifications**.

Current priority remains the original Demo roadmap:

```text
M5 → M6 → M7 → M8
```

Only after the current vertical slice is complete should these designs be used to expand the Wordwise activity ecosystem.

