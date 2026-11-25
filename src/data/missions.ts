import type { Mission } from "@/types/game";

/**
 * Mission definitions for Wordwise.
 * Each mission references its stage IDs; stage content lives in separate data files.
 *
 * `briefing`      — shown before the first learning stage (M10)
 * `learningRecap` — shown after all stages and before the Completion Ceremony (M10)
 */
export const missions: Mission[] = [
  {
    id: "renewable-energy",
    title: "Renewable Energy",
    countryId: "usa",
    stages: [
      { id: "vocabulary", type: "vocabulary", title: "Vocabulary" },
      { id: "listening", type: "listening", title: "Listening" },
      { id: "sentence", type: "sentence", title: "Sentence" },
    ],
    reward: {
      stamp: { name: "Clean Energy Grid Pioneer", icon: "🇺🇸" },
      badge: { name: "USA Clean-Tech Pioneer", icon: "🏅" },
      gift: {
        name: "Mini Solar Turbine Model",
        icon: "☀️",
        description:
          "A precision kinetic solar-and-wind turbine engineering model from the USA Clean Energy Innovation Lab.",
      },
      bonusXP: 30,
    },

    // ── Mission Briefing (M10) ──────────────────────────────────────────────
    briefing: {
      location: "🇺🇸 California & Texas Clean Energy Grid Lab",
      scenario:
        "You are collaborating with renewable energy engineers in the United States. Your challenge is to communicate clearly about solar photovoltaic arrays, wind turbines, and smart battery storage in English.",
      objectives: [
        { icon: "☀️", text: "Master core renewable energy & grid vocabulary" },
        { icon: "🎧", text: "Understand clean-tech engineering briefings" },
        { icon: "🧩", text: "Construct technical sustainability statements" },
      ],
    },

    // ── Learning Recap (M10) ───────────────────────────────────────────────
    learningRecap: {
      stages: [
        {
          icon: "☀️",
          label: "Vocabulary",
          summary: "6 core renewable energy & smart-grid terms",
        },
        {
          icon: "🎧",
          label: "Listening",
          summary: "3 real-world clean-tech lab briefings",
        },
        {
          icon: "🧩",
          label: "Communication",
          summary: "You can now explain:",
        },
      ],
      communicationTakeaway:
        "Solar panels convert sunlight directly into clean electricity.",
    },
  },
];

/** Convenience lookup by mission id (with fallback to the primary USA mission). */
export const getMissionById = (id: string) =>
  missions.find((m) => m.id === id) || missions[0];
