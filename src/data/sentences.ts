import type { SentenceItem } from "@/types/game";

/**
 * Sentence assembler challenges for the USA "Renewable Energy" mission.
 *
 * Each item represents one round. Rules:
 * - `words` are pre-shuffled so the correct order is not immediately obvious.
 * - `targetSentence` and all tokens in `words` share the same punctuation
 *   convention (no trailing punctuation), ensuring deterministic validation.
 * - Difficulty increases across rounds: early rounds use simple structures;
 *   later rounds introduce longer, more complex STEM constructions.
 * - `timeLimit` and `points` encode the per-round gameplay rules from the spec.
 */
export const sentenceItems: SentenceItem[] = [
  // ── Round 1 — 30 sec / 10 pts ───────────────────────────────────────────
  {
    id: "sentence-1",
    round: 1,
    targetSentence: "Solar panels convert sunlight into electricity",
    words: ["sunlight", "Solar", "electricity", "convert", "panels", "into"],
    points: 10,
    timeLimit: 30,
  },
  // ── Round 2 — 25 sec / 15 pts ───────────────────────────────────────────
  {
    id: "sentence-2",
    round: 2,
    targetSentence: "Wind turbines generate clean renewable power",
    words: ["clean", "Wind", "power", "generate", "turbines", "renewable"],
    points: 15,
    timeLimit: 25,
  },
  // ── Round 3 — 20 sec / 20 pts ───────────────────────────────────────────
  {
    id: "sentence-3",
    round: 3,
    targetSentence: "Battery storage stabilizes the smart power grid",
    words: ["grid", "Battery", "stabilizes", "the", "storage", "power", "smart"],
    points: 20,
    timeLimit: 20,
  },
  // ── Round 4 — 15 sec / 25 pts ───────────────────────────────────────────
  {
    id: "sentence-4",
    round: 4,
    targetSentence: "Renewable energy reduces our global carbon footprint",
    words: ["carbon", "Renewable", "our", "reduces", "energy", "footprint", "global"],
    points: 25,
    timeLimit: 15,
  },
  // ── Round 5 — 15 sec / 25 pts ───────────────────────────────────────────
  {
    id: "sentence-5",
    round: 5,
    targetSentence: "An inverter changes direct current into alternating current",
    words: ["current", "An", "into", "inverter", "direct", "changes", "alternating", "current"],
    points: 25,
    timeLimit: 15,
  },
  // ── Round 6 — 15 sec / 25 pts ───────────────────────────────────────────
  {
    id: "sentence-6",
    round: 6,
    targetSentence: "Silicon semiconductors absorb photons from solar radiation",
    words: ["photons", "Silicon", "from", "semiconductors", "absorb", "radiation", "solar"],
    points: 25,
    timeLimit: 15,
  },
  // ── Round 7 — 10 sec / 30 pts ───────────────────────────────────────────
  {
    id: "sentence-7",
    round: 7,
    targetSentence: "Offshore wind farms capture strong coastal breezes efficiently",
    words: ["strong", "Offshore", "capture", "wind", "breezes", "farms", "coastal", "efficiently"],
    points: 30,
    timeLimit: 10,
  },
  // ── Round 8 — 10 sec / 30 pts ───────────────────────────────────────────
  {
    id: "sentence-8",
    round: 8,
    targetSentence: "Microgrids can operate independently during severe weather outages",
    words: ["independently", "Microgrids", "during", "can", "weather", "operate", "severe", "outages"],
    points: 30,
    timeLimit: 10,
  },
  // ── Round 9 — 10 sec / 30 pts ───────────────────────────────────────────
  {
    id: "sentence-9",
    round: 9,
    targetSentence: "Geothermal plants harness underground heat for continuous baseload power",
    words: ["underground", "Geothermal", "for", "plants", "heat", "harness", "continuous", "power", "baseload"],
    points: 30,
    timeLimit: 10,
  },
  // ── Round 10 — 10 sec / 30 pts ──────────────────────────────────────────
  {
    id: "sentence-10",
    round: 10,
    targetSentence: "Sustainable infrastructure combines solar arrays with high capacity battery banks",
    words: ["arrays", "Sustainable", "with", "infrastructure", "solar", "combines", "high", "battery", "capacity", "banks"],
    points: 30,
    timeLimit: 10,
  },
];
