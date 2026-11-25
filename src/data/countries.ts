import type { Country } from "@/types/game";

/**
 * All countries available in Wordwise.
 * Only USA is unlocked by default for this demo.
 * England is visible (toggleable via Admin CMS).
 *
 * Pin positions use the same equirectangular formula as WorldMap.tsx:
 *   left = (lon + 180) / 360 × 100%
 *   top  = (90  - lat) / 180 × 100%
 *
 * USA  — Kansas/central US  (lon=-98, lat=39) → 22.8%, 28.3%
 * UK   — England center     (lon= -2, lat=53) → 49.4%, 20.6%
 */
export const countries: Country[] = [
  {
    id: "usa",
    name: "USA",
    flag: "🇺🇸",
    unlocked: true,
    position: { x: "23%", y: "28%" },
    missions: [], // Populated via missions.ts to avoid circular refs
    missionTitle: "Renewable Energy",
  },
  {
    id: "england",
    name: "England",
    flag: "🇬🇧",
    unlocked: false,
    position: { x: "49%", y: "21%" },
    missions: [],
    missionTitle: "Clean Transit & Grid",
  },
];
