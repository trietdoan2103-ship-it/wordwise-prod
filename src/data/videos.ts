import type {
  DbVideo,
  VideoDomain,
  VideoLevel,
  VideoQuizQuestion,
  VideoTranscriptNote,
} from "@/types/database";

export const VIDEO_LEVELS: VideoLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

export const VIDEO_DOMAINS: VideoDomain[] = [
  "AI & Tech",
  "Engineering",
  "Science",
  "Daily Culture",
];

export const VIDEO_QUIZ_XP = 20;

export const DEFAULT_STEM_VIDEOS: DbVideo[] = [
  {
    id: "video-stem-solar-01",
    title: "How Do Solar Panels Work? — Photovoltaic Physics",
    description:
      "Explore the semiconductor physics behind silicon solar cells, p-n junctions, and how photons generate clean electricity.",
    youtube_url: "https://www.youtube.com/watch?v=xKxrkht7CpY",
    duration_label: "5 mins",
    category: "Solar Energy",
    sort_order: 1,
    is_published: true,
    created_at: "2026-01-01T00:00:00.000Z",
    level: "Intermediate",
    domain: "Science",
    transcript_notes: [
      {
        term: "photovoltaic",
        meaning: "quang điện — chuyển ánh sáng thành điện",
        contextSentence:
          "A photovoltaic cell converts sunlight directly into electricity.",
      },
      {
        term: "semiconductor",
        meaning: "chất bán dẫn",
        contextSentence:
          "Silicon is a semiconductor, so it only conducts electricity under certain conditions.",
      },
      {
        term: "photon",
        meaning: "hạt ánh sáng (quang tử)",
        contextSentence:
          "When a photon hits the cell, it knocks an electron loose.",
      },
      {
        term: "current",
        meaning: "dòng điện",
        contextSentence:
          "The moving electrons create an electric current we can use.",
      },
    ],
    quiz_questions: [
      {
        question: "What does a photovoltaic cell do?",
        options: [
          "Stores heat from the sun",
          "Converts sunlight into electricity",
          "Burns fuel to make power",
          "Cools down a house",
        ],
        correctIndex: 1,
      },
      {
        question: "Which material is mainly used in solar cells?",
        options: ["Copper", "Plastic", "Silicon", "Glass wool"],
        correctIndex: 2,
      },
      {
        question: "What knocks electrons loose inside the cell?",
        options: ["Photons", "Magnets", "Water", "Wind"],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "video-stem-wind-02",
    title: "How Do Wind Turbines Work? — Aerodynamics & Grid Power",
    description:
      "Learn how rotor blades, nacelles, and generators convert kinetic wind energy into grid-scale alternating current.",
    youtube_url: "https://www.youtube.com/watch?v=xy9nj94xvKA",
    duration_label: "6 mins",
    category: "Clean Tech",
    sort_order: 2,
    is_published: true,
    created_at: "2026-01-01T00:00:00.000Z",
    level: "Beginner",
    domain: "Engineering",
    transcript_notes: [
      {
        term: "turbine",
        meaning: "tua-bin (máy biến chuyển động quay thành điện)",
        contextSentence: "The wind makes the turbine blades spin.",
      },
      {
        term: "blade",
        meaning: "cánh quạt",
        contextSentence: "Each blade is shaped like an airplane wing.",
      },
      {
        term: "generator",
        meaning: "máy phát điện",
        contextSentence:
          "Inside the nacelle, a generator turns rotation into electricity.",
      },
      {
        term: "grid",
        meaning: "lưới điện",
        contextSentence: "The electricity travels to the power grid.",
      },
    ],
    quiz_questions: [
      {
        question: "What makes the turbine blades spin?",
        options: ["Sunlight", "Wind", "Rain", "Gravity only"],
        correctIndex: 1,
      },
      {
        question: "What does the generator do?",
        options: [
          "Turns rotation into electricity",
          "Stores wind",
          "Cleans the blades",
          "Measures the weather",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: "video-stem-grid-03",
    title: "Can 100% Renewable Energy Power the World?",
    description:
      "An engineering breakdown of grid-scale battery storage, smart microgrids, and global clean-energy transition challenges.",
    youtube_url: "https://www.youtube.com/watch?v=RnvCbquYeIM",
    duration_label: "6 mins",
    category: "STEM",
    sort_order: 3,
    is_published: true,
    created_at: "2026-01-01T00:00:00.000Z",
    level: "Advanced",
    domain: "AI & Tech",
    transcript_notes: [
      {
        term: "renewable",
        meaning: "tái tạo được",
        contextSentence:
          "Solar and wind are renewable, so they never run out.",
      },
      {
        term: "intermittent",
        meaning: "không liên tục, lúc có lúc không",
        contextSentence:
          "Solar power is intermittent because the sun sets every night.",
      },
      {
        term: "storage",
        meaning: "lưu trữ",
        contextSentence:
          "Battery storage lets us save extra energy for later.",
      },
      {
        term: "transition",
        meaning: "quá trình chuyển đổi",
        contextSentence:
          "The energy transition replaces fossil fuels with clean sources.",
      },
    ],
    quiz_questions: [
      {
        question: "Why is solar power called intermittent?",
        options: [
          "It is too expensive",
          "It is not available all the time",
          "It pollutes the air",
          "It only works in cold weather",
        ],
        correctIndex: 1,
      },
      {
        question: "What helps save extra energy for later?",
        options: ["Battery storage", "Longer cables", "Bigger roofs", "Coal"],
        correctIndex: 0,
      },
      {
        question: "What does 'energy transition' mean?",
        options: [
          "Moving power plants to new cities",
          "Switching from fossil fuels to clean energy",
          "Turning off all electricity",
          "Selling electricity abroad",
        ],
        correctIndex: 1,
      },
    ],
  },
];

/**
 * Fills in Language Immersion metadata for videos coming from older storage
 * or from a database that has not yet been migrated.
 */
export function normalizeVideo(v: DbVideo): DbVideo {
  const seed = DEFAULT_STEM_VIDEOS.find((d) => d.id === v.id);
  const notes: VideoTranscriptNote[] =
    Array.isArray(v.transcript_notes) && v.transcript_notes.length > 0
      ? v.transcript_notes
      : seed?.transcript_notes || [];
  const quiz: VideoQuizQuestion[] =
    Array.isArray(v.quiz_questions) && v.quiz_questions.length > 0
      ? v.quiz_questions
      : seed?.quiz_questions || [];
  return {
    ...v,
    level: v.level || seed?.level || "Intermediate",
    domain: v.domain || seed?.domain || "AI & Tech",
    transcript_notes: notes,
    quiz_questions: quiz,
  };
}

/* ── Video completion (localStorage) ─────────────────────────────────── */

const VIDEO_DONE_KEY = "wordwise_video_completed_v1";

export function getCompletedVideoIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VIDEO_DONE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function markVideoCompleted(id: string): string[] {
  const list = getCompletedVideoIds();
  if (list.includes(id)) return list;
  const next = [...list, id];
  try {
    localStorage.setItem(VIDEO_DONE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
