import { createClient } from "@/lib/supabase/client";
import {
  getCompletedLessonIds,
  syncCompletedModulesToProfile,
} from "@/lib/curriculumStorage";
import { countries as staticCountries } from "@/data/countries";
import { missions as staticMissions } from "@/data/missions";
import { vocabularyItems as staticVocabularyItems } from "@/data/vocabulary";
import { listeningItems as staticListeningItems } from "@/data/listening";
import { sentenceItems as staticSentenceItems } from "@/data/sentences";
import type {
  Country,
  ListeningItem,
  Mission,
  SentenceItem,
  UserProgress,
  VocabularyItem,
} from "@/types/game";
import type {
  CircuitPair,
  CountryGameType,
  DbCountry,
  DbCountryCircuitBoard,
  DbCountryGame,
  DbCountryListening,
  DbCountryListeningQuestion,
  DbCountryModuleConfig,
  DbCountrySentenceRound,
  DbCountrySpeakingTurn,
  DbCountryTechRunnerQuestion,
  DbCountryTargetSmasherItem,
  DbCountryVocabulary,
  DbCountryVocabularyQuestion,
  DbMission,
  DbMissionStagesData,
  DbUserMissionProgress,
} from "@/types/database";

const STORAGE_KEY = "wordwise_progress";

export const DEFAULT_PROGRESS: UserProgress = {
  xp: 0,
  usaCompleted: false,
  usaStampUnlocked: false,
  usaBadgeUnlocked: false,
  coffeeCupUnlocked: false,
  completedStages: [],
};

export interface CountryModuleConfig {
  vocabularyEnabled: boolean;
  listeningEnabled: boolean;
  speakingEnabled: boolean;
  enabledGames: CountryGameType[];
}

export interface CulturalLocalPhrase {
  phrase: string;
  vietnameseMeaning: string;
}

export interface CountryCulturalBriefing {
  communicationStyle: string;
  keyLocalPhrases: CulturalLocalPhrase[];
  culturalTip: string;
}

export interface CountryPassportSouvenir {
  stampCode: string;
  portCity: string;
  missionLabel: string;
  souvenirName: string;
  souvenirIcon: string;
  souvenirDescription: string;
  medalName: string;
}

export function getDefaultCulturalBriefingForCountry(
  countryId: string
): CountryCulturalBriefing {
  const cid = countryId.toLowerCase();
  if (cid === "england" || cid === "uk" || cid === "gb") {
    return {
      communicationStyle:
        "British conversation is polite, understated, and rich with 'please', 'thank you', and 'sorry'—even when making a simple request at a research hub or train station.",
      keyLocalPhrases: [
        {
          phrase: "Could we possibly review the offshore wind data, please?",
          vietnameseMeaning: "Chúng ta có thể xem lại dữ liệu điện gió ngoài khơi được không ạ?",
        },
        {
          phrase: "Shall we take the electric underground?",
          vietnameseMeaning: "Chúng ta đi tàu điện ngầm nhé?",
        },
        {
          phrase: "Cheers! / Brilliant work on the grid model!",
          vietnameseMeaning: "Cảm ơn nhiều! / Mô hình lưới điện làm rất tuyệt!",
        },
      ],
      culturalTip:
        "Always respect the queue (line) and punctuality in the UK—arriving on time for engineering briefings and saying 'Cheers' is expected everywhere.",
    };
  }
  if (cid === "usa" || cid === "us") {
    return {
      communicationStyle:
        "US clean-tech and engineering teams communicate with direct, collaborative enthusiasm—meetings start with brief friendly small talk before diving straight into data and solutions.",
      keyLocalPhrases: [
        {
          phrase: "How much peak solar capacity can this microgrid handle?",
          vietnameseMeaning: "Lưới điện siêu nhỏ này có thể xử lý công suất điện mặt trời tối đa bao nhiêu?",
        },
        {
          phrase: "Let's scale up battery storage to cut carbon emissions.",
          vietnameseMeaning: "Hãy mở rộng quy mô lưu trữ pin để cắt giảm khí thải carbon.",
        },
        {
          phrase: "That's a game-changer for sustainable infrastructure!",
          vietnameseMeaning: "Đó là bước đột phá cho cơ sở hạ tầng bền vững!",
        },
      ],
      culturalTip:
        "In US STEM labs and clean-energy startups, asking proactive questions, sharing concise data points, and proposing hands-on prototypes is highly valued.",
    };
  }
  return {
    communicationStyle:
      "Greet colleagues warmly with a smile and a clear, constructive opening before presenting your technical question or proposal.",
    keyLocalPhrases: [
      {
        phrase: "Excuse me, could you share the latest energy metrics?",
        vietnameseMeaning: "Xin lỗi, bạn có thể chia sẻ số liệu năng lượng mới nhất được không?",
      },
      {
        phrase: "What clean-tech solution do you recommend here?",
        vietnameseMeaning: "Ở đây bạn khuyến nghị giải pháp công nghệ sạch nào?",
      },
    ],
    culturalTip:
      "Observe local collaboration norms—starting with a polite 'Excuse me' and backing ideas with clear evidence opens doors everywhere.",
  };
}

export function getCountryPassportSouvenir(
  countryId: string,
  countryName = "Country"
): CountryPassportSouvenir {
  const cid = countryId.toLowerCase();
  if (cid === "usa" || cid === "us") {
    return {
      stampCode: "US CLEAN ENERGY GRID",
      portCity: "SAN FRANCISCO & AUSTIN",
      missionLabel: "RENEWABLE ENERGY",
      souvenirName: "Mini Solar Turbine Model",
      souvenirIcon: "☀️",
      souvenirDescription:
        "Precision kinetic solar-photovoltaic and wind-turbine desktop model from the USA Clean Energy Innovation Lab.",
      medalName: "Clean Energy Grid Pioneer",
    };
  }
  if (cid === "england" || cid === "uk" || cid === "gb") {
    return {
      stampCode: "UK BORDER FORCE",
      portCity: "LONDON HEATHROW",
      missionLabel: "CLEAN TRANSIT & GRID",
      souvenirName: "Offshore Wind Compass Emblem",
      souvenirIcon: "🧭",
      souvenirDescription:
        "Brass maritime engineering compass commemorating North Sea offshore wind mastery.",
      medalName: "Britannia Clean-Tech Scholar",
    };
  }
  return {
    stampCode: `${countryName.toUpperCase()} BORDER`,
    portCity: "INTERNATIONAL PORT",
    missionLabel: `${countryName.toUpperCase()} HUB`,
    souvenirName: `${countryName} Cultural Keepsake`,
    souvenirIcon: "🏺",
    souvenirDescription: `Authentic cultural souvenir earned by mastering the ${countryName} learning hub.`,
    medalName: `${countryName} Global Explorer`,
  };
}

export interface MissionBundle {
  countryId: string;
  countryName: string;
  countryFlag: string;
  mission: Mission;
  vocabularyItems: VocabularyItem[];
  listeningItems: ListeningItem[];
  sentenceItems: SentenceItem[];
  speakingTurns: DbCountrySpeakingTurn[];
  circuitBoards: DbCountryCircuitBoard[];
  techRunnerQuestions: DbCountryTechRunnerQuestion[];
  targetSmasherItems: DbCountryTargetSmasherItem[];
  moduleConfig: CountryModuleConfig;
  culturalBriefing: CountryCulturalBriefing;
  /** Active mini-game assignments configured in the Admin Country Studio. */
  gameAssignments?: DbCountryGame[];
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url !== "your_supabase_project_url" &&
      key !== "your_supabase_anon_key" &&
      url.startsWith("http")
  );
}

type StoredUserProgress = UserProgress & {
  userId?: string;
};

let lastKnownUserId: string | undefined = undefined;

/** Read progress from localStorage. Returns defaults if nothing is stored. */
export function loadProgress(forUserId?: string): UserProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as StoredUserProgress;
    if (forUserId && parsed.userId && parsed.userId !== forUserId) {
      return DEFAULT_PROGRESS;
    }
    if (parsed.userId) {
      lastKnownUserId = parsed.userId;
    }
    return {
      xp: typeof parsed.xp === "number" ? parsed.xp : DEFAULT_PROGRESS.xp,
      usaCompleted: Boolean(parsed.usaCompleted),
      usaStampUnlocked: Boolean(parsed.usaStampUnlocked),
      usaBadgeUnlocked: Boolean(parsed.usaBadgeUnlocked),
      coffeeCupUnlocked: Boolean(parsed.coffeeCupUnlocked),
      completedStages: Array.isArray(parsed.completedStages)
        ? parsed.completedStages
        : DEFAULT_PROGRESS.completedStages,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

/** Persist progress to localStorage. */
export function saveProgress(progress: UserProgress, userId?: string): void {
  const effectiveUserId = userId ?? lastKnownUserId;
  if (effectiveUserId) {
    lastKnownUserId = effectiveUserId;
  }
  if (typeof window === "undefined") return;
  try {
    const payload: StoredUserProgress = {
      ...progress,
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    console.warn("Wordwise: could not save progress to localStorage.");
  }
}

/** Clear all progress and reset to defaults. */
export function clearProgress(): void {
  lastKnownUserId = undefined;
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Queries `public.profiles` (for `xp`) and `public.user_mission_progress`
 * (for `country_id = 'usa'`) in Supabase, maps the database rows into
 * `UserProgress`, syncs the local cache (and pushes higher user-owned local XP
 * back to `public.profiles`), and returns it.
 */
export async function fetchUserGameProgress(
  userId: string
): Promise<UserProgress> {
  const fallback = loadProgress(userId);
  if (!userId || !isSupabaseConfigured()) return fallback;

  try {
    const supabase = createClient();

    let rawStoredUserId: string | undefined = undefined;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { userId?: string };
          rawStoredUserId = parsed.userId;
        }
      } catch {
        // ignore
      }
    }

    const [profileRes, missionRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("xp")
        .eq("id", userId)
        .maybeSingle<{ xp: number | null }>(),
      supabase
        .from("user_mission_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("country_id", "usa")
        .maybeSingle<DbUserMissionProgress>(),
    ]);

    const dbXp =
      typeof profileRes.data?.xp === "number"
        ? Math.max(0, profileRes.data.xp)
        : 0;

    // Only merge local XP if the cache explicitly belongs to this user
    // or if this is an existing user with dbXp > 0 and an untagged legacy cache
    const canMergeLocal =
      rawStoredUserId === userId || (!rawStoredUserId && dbXp > 0);
    const profileXp = canMergeLocal ? Math.max(dbXp, fallback.xp) : dbXp;

    const missionRow = missionRes.data;
    const dbStages = Array.isArray(missionRow?.completed_stages)
      ? missionRow.completed_stages.filter(
          (s: unknown): s is string => typeof s === "string"
        )
      : [];
    const completedStages = canMergeLocal
      ? Array.from(new Set([...dbStages, ...fallback.completedStages]))
      : dbStages;

    const nextProgress: UserProgress = {
      xp: profileXp,
      usaCompleted:
        Boolean(missionRow?.mission_completed) ||
        (canMergeLocal && fallback.usaCompleted),
      usaStampUnlocked:
        Boolean(missionRow?.stamp_unlocked) ||
        (canMergeLocal && fallback.usaStampUnlocked),
      usaBadgeUnlocked:
        Boolean(missionRow?.badge_unlocked) ||
        (canMergeLocal && fallback.usaBadgeUnlocked),
      coffeeCupUnlocked:
        Boolean(missionRow?.gift_unlocked) ||
        (canMergeLocal && fallback.coffeeCupUnlocked),
      completedStages,
    };

    saveProgress(nextProgress, userId);

    // If local progress had unsynced XP or stages, persist immediately to Supabase
    if (profileXp > dbXp || completedStages.length > dbStages.length) {
      await saveUserGameProgressToDb(userId, nextProgress);
    }

    return nextProgress;
  } catch {
    return fallback;
  }
}

/**
 * Persists `UserProgress` to `public.profiles` (`xp`) and upserts
 * `public.user_mission_progress` for `(user_id, country_id = 'usa')`.
 */
export async function saveUserGameProgressToDb(
  userId: string,
  progress: UserProgress
): Promise<void> {
  if (!userId || !isSupabaseConfigured()) return;

  try {
    const supabase = createClient();

    await Promise.all([
      supabase
        .from("profiles")
        .update({ xp: progress.xp })
        .eq("id", userId),
      syncCompletedModulesToProfile(userId, getCompletedLessonIds().length),
      supabase.from("user_mission_progress").upsert(
        {
          user_id: userId,
          country_id: "usa",
          completed_stages: progress.completedStages,
          mission_completed: progress.usaCompleted,
          stamp_unlocked: progress.usaStampUnlocked,
          badge_unlocked: progress.usaBadgeUnlocked,
          gift_unlocked: progress.coffeeCupUnlocked,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,country_id" }
      ),
    ]);
  } catch (err) {
    console.warn("Wordwise: failed to sync game progress to Supabase.", err);
  }
}

/**
 * Fetches World Map countries from `public.countries` ordered by `sort_order`,
 * falling back to `src/data/countries.ts` if offline or unconfigured.
 */
export async function fetchWorldCountries(): Promise<Country[]> {
  if (!isSupabaseConfigured()) return staticCountries;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .order("sort_order", { ascending: true });

    const rows = (data || []) as DbCountry[];
    if (error || rows.length === 0) {
      return staticCountries;
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      flag: row.flag || "🌍",
      unlocked: Boolean(row.unlocked),
      position: {
        x: row.map_x || "50%",
        y: row.map_y || "50%",
      },
      missions: [],
      missionTitle:
        row.id.toLowerCase() === "usa" &&
        (!row.mission_title ||
          /coffee/i.test(row.mission_title))
          ? "Renewable Energy"
          : row.mission_title || undefined,
    }));
  } catch {
    return staticCountries;
  }
}

/**
 * Builds the static fallback bundle for a given country ID.
 */
export function getStaticMissionBundle(
  countryId: string
): MissionBundle | null {
  const normalizedId = countryId.toLowerCase();
  const country =
    staticCountries.find((c) => c.id === normalizedId) || staticCountries[0];
  const mission =
    staticMissions.find((m) => m.countryId === normalizedId) ||
    (normalizedId === "usa" ? staticMissions[0] : undefined);

  if (!mission) return null;

  return {
    countryId: country?.id || normalizedId,
    countryName: country?.name || "USA",
    countryFlag: country?.flag || "🇺🇸",
    mission,
    vocabularyItems: staticVocabularyItems,
    listeningItems: staticListeningItems,
    sentenceItems: staticSentenceItems,
    speakingTurns: DEFAULT_USA_SPEAKING_TURNS,
    circuitBoards: DEFAULT_USA_CIRCUIT_BOARDS,
    techRunnerQuestions: DEFAULT_USA_TECH_RUNNER_QUESTIONS,
    targetSmasherItems: DEFAULT_USA_TARGET_SMASHER_ITEMS,
    moduleConfig: {
      vocabularyEnabled: true,
      listeningEnabled: true,
      speakingEnabled: true,
      enabledGames: ["sentence_assembler", "circuit_repair", "tech_runner", "target_smasher"],
    },
    culturalBriefing: getDefaultCulturalBriefingForCountry(normalizedId),
  };
}

/**
 * Fetches a country's mission and stage items from `public.countries` and
 * `public.missions` in Supabase, falling back to static data if offline or empty.
 */
async function fetchMissionBase(
  countryId: string
): Promise<MissionBundle | null> {
  const normalizedId = countryId.toLowerCase();
  const fallback = getStaticMissionBundle(normalizedId);

  if (!isSupabaseConfigured()) return fallback;

  try {
    const supabase = createClient();

    const [countryRes, missionRes] = await Promise.all([
      supabase
        .from("countries")
        .select("*")
        .eq("id", normalizedId)
        .maybeSingle<DbCountry>(),
      supabase
        .from("missions")
        .select("*")
        .eq("country_id", normalizedId)
        .maybeSingle<DbMission>(),
    ]);

    const dbMission = missionRes.data;
    if (missionRes.error || !dbMission) {
      return fallback;
    }

    const dbCountry = countryRes.data;
    const stagesData = dbMission.stages_data;

    const stages =
      Array.isArray(stagesData?.stages) && stagesData.stages.length > 0
        ? stagesData.stages
        : fallback?.mission.stages || [
            { id: "vocabulary", type: "vocabulary", title: "Vocabulary" },
            { id: "listening", type: "listening", title: "Listening" },
            { id: "sentence", type: "sentence", title: "Sentence" },
          ];

    const rawReward = stagesData?.reward || fallback?.mission.reward;
    const reward =
      rawReward && !/coffee/i.test(rawReward.gift?.name || "")
        ? rawReward
        : {
            stamp: { name: "Clean Energy Grid Pioneer", icon: "🇺🇸" },
            badge: { name: "USA Clean-Tech Pioneer", icon: "🏅" },
            gift: {
              name: "Mini Solar Turbine Model",
              icon: "☀️",
              description:
                "A precision kinetic solar-and-wind turbine engineering model from the USA Clean Energy Innovation Lab.",
            },
            bonusXP: dbMission.bonus_xp || 30,
          };

    const normalizedTitle =
      dbMission.country_id?.toLowerCase() === "usa" &&
      (!dbMission.title || /coffee/i.test(dbMission.title))
        ? "Renewable Energy"
        : dbMission.title;

    const normalizedBriefing =
      dbMission.briefing && !/coffee|barista/i.test(dbMission.briefing.scenario || "")
        ? dbMission.briefing
        : fallback?.mission.briefing;

    const normalizedRecap =
      dbMission.learning_recap &&
      !/latte|coffee/i.test(dbMission.learning_recap.communicationTakeaway || "")
        ? dbMission.learning_recap
        : fallback?.mission.learningRecap;

    const mission: Mission = {
      id: dbMission.id,
      title: normalizedTitle,
      countryId: dbMission.country_id,
      stages,
      reward,
      briefing: normalizedBriefing,
      learningRecap: normalizedRecap,
    };

    const vocabularyItems =
      Array.isArray(stagesData?.vocabularyItems) &&
      stagesData.vocabularyItems.length > 0 &&
      !stagesData.vocabularyItems.some((v) => /latte|barista/i.test(v.word || ""))
        ? stagesData.vocabularyItems
        : staticVocabularyItems;

    const listeningItems =
      Array.isArray(stagesData?.listeningItems) &&
      stagesData.listeningItems.length > 0 &&
      !stagesData.listeningItems.some((l) => /latte|coffee/i.test(l.sentence || ""))
        ? stagesData.listeningItems
        : staticListeningItems;

    const sentenceItems =
      Array.isArray(stagesData?.sentenceItems) &&
      stagesData.sentenceItems.length > 0 &&
      !stagesData.sentenceItems.some((s) => /latte|espresso/i.test(s.targetSentence || ""))
        ? stagesData.sentenceItems
        : staticSentenceItems;

    const speakingTurns =
      Array.isArray(stagesData?.speakingTurns) &&
      stagesData.speakingTurns.length > 0
        ? stagesData.speakingTurns
        : DEFAULT_USA_SPEAKING_TURNS;

    const circuitBoards =
      Array.isArray(stagesData?.circuitBoards) &&
      stagesData.circuitBoards.length > 0
        ? stagesData.circuitBoards
        : DEFAULT_USA_CIRCUIT_BOARDS;

    const techRunnerQuestions =
      Array.isArray(stagesData?.techRunnerQuestions) &&
      stagesData.techRunnerQuestions.length > 0
        ? stagesData.techRunnerQuestions
        : DEFAULT_USA_TECH_RUNNER_QUESTIONS;

    const targetSmasherItems =
      Array.isArray(stagesData?.targetSmasherItems) &&
      stagesData.targetSmasherItems.length > 0
        ? stagesData.targetSmasherItems
        : DEFAULT_USA_TARGET_SMASHER_ITEMS;

    const defaultEnabledGames: CountryGameType[] =
      normalizedId === "usa"
        ? ["sentence_assembler", "circuit_repair", "tech_runner", "target_smasher"]
        : ["sentence_assembler"];

    const moduleConfig: CountryModuleConfig = stagesData?.moduleConfig
      ? {
          vocabularyEnabled: Boolean(stagesData.moduleConfig.vocabularyEnabled),
          listeningEnabled: Boolean(stagesData.moduleConfig.listeningEnabled),
          speakingEnabled: Boolean(stagesData.moduleConfig.speakingEnabled),
          enabledGames: Array.isArray(stagesData.moduleConfig.enabledGames)
            ? stagesData.moduleConfig.enabledGames
            : defaultEnabledGames,
        }
      : {
          vocabularyEnabled: true,
          listeningEnabled: true,
          speakingEnabled: true,
          enabledGames: defaultEnabledGames,
        };

    return {
      countryId: dbCountry?.id || normalizedId,
      countryName: dbCountry?.name || fallback?.countryName || "USA",
      countryFlag: dbCountry?.flag || fallback?.countryFlag || "🇺🇸",
      mission,
      vocabularyItems,
      listeningItems,
      sentenceItems,
      speakingTurns,
      circuitBoards,
      techRunnerQuestions,
      targetSmasherItems,
      moduleConfig,
      culturalBriefing:
        stagesData?.culturalBriefing &&
        typeof stagesData.culturalBriefing.communicationStyle === "string" &&
        !/barista|latte/i.test(stagesData.culturalBriefing.communicationStyle)
          ? stagesData.culturalBriefing
          : getDefaultCulturalBriefingForCountry(normalizedId),
    };
  } catch {
    return fallback;
  }
}


// ─── Live Country Content (Admin Country Studio) ─────────────────────────────

const GENERIC_DISTRACTORS = [
  "Nhiệm vụ",
  "Đồ uống",
  "Thành phố",
  "Công nghệ",
  "Năng lượng",
  "Giao thông",
];

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Builds multiple-choice VocabularyItems from country_vocabularies rows. */
export function buildVocabularyItemsFromRows(
  rows: DbCountryVocabulary[]
): VocabularyItem[] {
  const meanings = rows.map((r) => r.vietnamese_meaning).filter(Boolean);
  return rows.map((row, idx) => {
    const pool = meanings.filter((m) => m !== row.vietnamese_meaning);
    const distractors = shuffleWithSeed(
      [...pool, ...GENERIC_DISTRACTORS.filter((g) => !pool.includes(g))],
      idx + 7
    ).slice(0, 3);
    const options = shuffleWithSeed(
      [row.vietnamese_meaning, ...distractors],
      idx + 13
    );
    return {
      id: row.id,
      word: row.term,
      meaning: row.vietnamese_meaning,
      question: `"${row.term}" có nghĩa là gì?`,
      options,
      correctIndex: options.indexOf(row.vietnamese_meaning),
      xp: 10,
    };
  });
}

/** Flattens country_listenings rows into one ListeningItem per question. */
export function buildListeningItemsFromRows(
  rows: DbCountryListening[]
): ListeningItem[] {
  const items: ListeningItem[] = [];
  rows.forEach((row) => {
    const qs = Array.isArray(row.questions) ? row.questions : [];
    qs.forEach((q, qi) => {
      if (!q?.question || !Array.isArray(q.options) || q.options.length < 2) return;
      items.push({
        id: `${row.id}-q${qi + 1}`,
        scenario: row.title,
        sentence: row.transcript,
        question: q.question,
        options: q.options,
        correctIndex:
          typeof q.correctIndex === "number" ? q.correctIndex : 0,
        xp: 10,
      });
    });
  });
  return items;
}

/**
 * Converts `country_vocabulary_questions` rows into `VocabularyItem[]`.
 */
export function mapVocabQuestionsToItems(
  rows: DbCountryVocabularyQuestion[]
): VocabularyItem[] {
  return rows.map((r) => {
    const opts = Array.isArray(r.options) ? r.options : [];
    const correctIndex =
      typeof r.correct_index === "number" ? r.correct_index : 0;
    const inferredMeaning =
      r.meaning?.trim() || opts[correctIndex] || opts[0] || "";
    const inferredWord =
      r.word?.trim() ||
      r.question_text.match(/"([^"]+)"/)?.[1] ||
      r.question_text;
    return {
      id: r.id,
      word: inferredWord,
      meaning: inferredMeaning,
      question: r.question_text,
      options: opts,
      correctIndex,
      xp: 10,
    };
  });
}

/**
 * Converts `country_listening_questions` rows into `ListeningItem[]`.
 */
export function mapListeningQuestionsToItems(
  rows: DbCountryListeningQuestion[]
): ListeningItem[] {
  return rows.map((r) => ({
    id: r.id,
    scenario:
      r.title && !/coffee/i.test(r.title) ? r.title : "Renewable Energy Lab",
    sentence: r.transcript,
    question: r.question_text,
    options: Array.isArray(r.options) ? r.options : [],
    correctIndex: typeof r.correct_index === "number" ? r.correct_index : 0,
    xp: 10,
  }));
}

/**
 * Converts `country_sentence_rounds` rows into `SentenceItem[]`.
 */
export function mapSentenceRoundsToItems(
  rows: DbCountrySentenceRound[]
): SentenceItem[] {
  return rows.map((r, idx) => ({
    id: r.id,
    round: r.round_number || idx + 1,
    targetSentence: r.target_sentence,
    words:
      Array.isArray(r.word_chunks) && r.word_chunks.length > 0
        ? r.word_chunks
        : r.target_sentence.trim().split(/\s+/),
    points: typeof r.points === "number" && r.points > 0 ? r.points : 20,
    timeLimit:
      typeof r.time_limit === "number" && r.time_limit > 0 ? r.time_limit : 20,
  }));
}

export const DEFAULT_USA_SPEAKING_TURNS: DbCountrySpeakingTurn[] = [
  {
    id: "usa-turn-1",
    country_id: "usa",
    speaker_role: "GRID ENGINEER SAYS",
    npc_prompt:
      "Welcome to the California Clean Energy Lab! What renewable power source should we prioritize for the campus microgrid?",
    target_line:
      "We should install rooftop solar photovoltaic panels first.",
    vietnamese_translation:
      "Chúng ta nên lắp đặt các tấm pin mặt trời quang điện trên mái nhà trước tiên.",
    coach_tip:
      "Stress 'rooftop', 'solar', and 'photovoltaic' with clear, confident pacing.",
    sort_order: 1,
  },
  {
    id: "usa-turn-2",
    country_id: "usa",
    speaker_role: "GRID ENGINEER SAYS",
    npc_prompt:
      "Great call! How will we keep the power grid stable when the sun sets in the evening?",
    target_line:
      "We can store excess daytime energy in grid-scale lithium battery banks.",
    vietnamese_translation:
      "Chúng ta có thể lưu trữ năng lượng dư thừa ban ngày vào hệ thống pin lithium quy mô lưới điện.",
    coach_tip:
      "Link 'store excess' smoothly and emphasize 'grid-scale lithium battery banks'.",
    sort_order: 2,
  },
  {
    id: "usa-turn-3",
    country_id: "usa",
    speaker_role: "GRID ENGINEER SAYS",
    npc_prompt:
      "Awesome! What is the biggest environmental benefit of switching this facility to 100% clean power?",
    target_line:
      "It will dramatically reduce our carbon footprint and greenhouse gas emissions.",
    vietnamese_translation:
      "Nó sẽ giúp giảm đáng kể dấu chân carbon và lượng khí thải nhà kính của chúng ta.",
    coach_tip:
      "Emphasize 'carbon footprint' and 'greenhouse gas emissions' clearly.",
    sort_order: 3,
  },
];

export function getCircuitDefaultsForBoard(boardNum: number): {
  timeLimit: number;
  points: number;
} {
  if (boardNum <= 1) return { timeLimit: 30, points: 10 };
  if (boardNum === 2) return { timeLimit: 25, points: 15 };
  if (boardNum === 3) return { timeLimit: 20, points: 20 };
  if (boardNum <= 6) return { timeLimit: 15, points: 25 };
  return { timeLimit: 10, points: 30 };
}

export const DEFAULT_USA_CIRCUIT_BOARDS: DbCountryCircuitBoard[] = [
  {
    id: "usa-cb-1",
    country_id: "usa",
    board_number: 1,
    topic: "Solar Photovoltaic Foundations",
    pairs: [
      { clue: "photovoltaic", answer: "quang điện" },
      { clue: "solar panel", answer: "tấm pin mặt trời" },
      { clue: "sunlight", answer: "ánh sáng mặt trời" },
      { clue: "semiconductor", answer: "chất bán dẫn" },
    ],
    points: 10,
    time_limit: 30,
    sort_order: 1,
  },
  {
    id: "usa-cb-2",
    country_id: "usa",
    board_number: 2,
    topic: "Wind & Kinetic Power Systems",
    pairs: [
      { clue: "wind turbine", answer: "tua-bin gió" },
      { clue: "rotor blade", answer: "cánh quạt rô-to" },
      { clue: "generator", answer: "máy phát điện" },
      { clue: "kinetic energy", answer: "động năng" },
    ],
    points: 15,
    time_limit: 25,
    sort_order: 2,
  },
  {
    id: "usa-cb-3",
    country_id: "usa",
    board_number: 3,
    topic: "Smart Grid & Battery Storage",
    pairs: [
      { clue: "inverter", answer: "bộ biến tần (DC sang AC)" },
      { clue: "power grid", answer: "lưới điện quốc gia" },
      { clue: "battery storage", answer: "lưu trữ pin năng lượng" },
      { clue: "microgrid", answer: "lưới điện siêu nhỏ" },
    ],
    points: 20,
    time_limit: 20,
    sort_order: 3,
  },
  {
    id: "usa-cb-4",
    country_id: "usa",
    board_number: 4,
    topic: "Clean Energy Statements (Grammar)",
    pairs: [
      { clue: "Solar arrays convert", answer: "sunlight into electricity." },
      { clue: "Wind turbines harness", answer: "coastal breezes for power." },
      { clue: "Lithium batteries store", answer: "excess daytime energy." },
      { clue: "Clean microgrids reduce", answer: "our carbon footprint." },
    ],
    points: 25,
    time_limit: 15,
    sort_order: 4,
  },
  {
    id: "usa-cb-5",
    country_id: "usa",
    board_number: 5,
    topic: "Sustainability & Climate Impact",
    pairs: [
      { clue: "renewable", answer: "tái tạo bền vững" },
      { clue: "carbon footprint", answer: "lượng khí thải carbon" },
      { clue: "geothermal", answer: "địa nhiệt" },
      { clue: "zero-emission", answer: "không phát thải" },
    ],
    points: 25,
    time_limit: 15,
    sort_order: 5,
  },
];

export const DEFAULT_USA_TECH_RUNNER_QUESTIONS: DbCountryTechRunnerQuestion[] =
  [
    // ── Tier 1 (First 20s: Core Renewable Energy Vocabulary) ───────────────
    {
      id: "usa-tr-1",
      country_id: "usa",
      tier: 1,
      prompt: "Solar panels convert _____ directly into clean electricity.",
      options: ["sunlight", "coal", "plastic"],
      correct_index: 0,
      sort_order: 1,
    },
    {
      id: "usa-tr-2",
      country_id: "usa",
      tier: 1,
      prompt:
        "A giant _____ spins in the wind to generate clean electricity.",
      options: ["furnace", "wind turbine", "radiator"],
      correct_index: 1,
      sort_order: 2,
    },
    {
      id: "usa-tr-3",
      country_id: "usa",
      tier: 1,
      prompt: "Solar and wind are _____ energy sources that never run out.",
      options: ["fossil", "disposable", "renewable"],
      correct_index: 2,
      sort_order: 3,
    },
    {
      id: "usa-tr-4",
      country_id: "usa",
      tier: 1,
      prompt: "Large lithium _____ store extra solar power for nighttime use.",
      options: ["batteries", "pipes", "chimneys"],
      correct_index: 0,
      sort_order: 4,
    },
    // ── Tier 2 (Middle 20s: Grid Engineering Phrases & Prepositions) ───────
    {
      id: "usa-tr-5",
      country_id: "usa",
      tier: 2,
      prompt: "An inverter converts direct current (DC) _____ alternating current (AC).",
      options: ["into", "under", "against"],
      correct_index: 0,
      sort_order: 5,
    },
    {
      id: "usa-tr-6",
      country_id: "usa",
      tier: 2,
      prompt: "Transitioning to clean tech drastically cuts our carbon _____.",
      options: ["shadow", "footprint", "ceiling"],
      correct_index: 1,
      sort_order: 6,
    },
    {
      id: "usa-tr-7",
      country_id: "usa",
      tier: 2,
      prompt: "Our campus microgrid operates _____ 100% renewable solar and wind power.",
      options: ["at", "in", "on"],
      correct_index: 2,
      sort_order: 7,
    },
    {
      id: "usa-tr-8",
      country_id: "usa",
      tier: 2,
      prompt: "Offshore wind farms are built _____ the coast where winds are strongest.",
      options: ["along", "inside", "beneath"],
      correct_index: 0,
      sort_order: 8,
    },
    // ── Tier 3 (Final 20s: Relative Clauses, Conditionals & STEM Terms) ────
    {
      id: "usa-tr-9",
      country_id: "usa",
      tier: 3,
      prompt:
        "Silicon is the semiconductor material _____ absorbs photons in solar cells.",
      options: ["who", "that", "whom"],
      correct_index: 1,
      sort_order: 9,
    },
    {
      id: "usa-tr-10",
      country_id: "usa",
      tier: 3,
      prompt:
        "If the grid _____ smart battery storage, it will prevent evening blackouts.",
      options: ["integrates", "integrated", "integrating"],
      correct_index: 0,
      sort_order: 10,
    },
    {
      id: "usa-tr-11",
      country_id: "usa",
      tier: 3,
      prompt:
        "Geothermal power plants harness _____ heat from deep inside the Earth.",
      options: ["optical", "acoustic", "thermal"],
      correct_index: 2,
      sort_order: 11,
    },
    {
      id: "usa-tr-12",
      country_id: "usa",
      tier: 3,
      prompt:
        "Had we upgraded the transmission lines earlier, we _____ lost clean wind energy.",
      options: ["will not have", "would not have", "would not"],
      correct_index: 1,
      sort_order: 12,
    },
  ];

const tsItem = (
  n: number,
  tier: 1 | 2 | 3,
  icon: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string]
): DbCountryTargetSmasherItem => ({
  id: `usa-ts-${n}`,
  country_id: "usa",
  tier,
  icon,
  prompt,
  correct_word: correct,
  distractors,
  sort_order: n,
});

export const DEFAULT_USA_TARGET_SMASHER_ITEMS: DbCountryTargetSmasherItem[] = [
  // Tier 1 (0–20s): foundational renewable energy concepts
  tsItem(1, 1, "☀️", "Natural radiant light and heat from the sun", "sunlight", ["coal dust", "diesel", "steam"]),
  tsItem(2, 1, "🌬️", "Tall structure with spinning blades that generates power from wind", "wind turbine", ["chimney", "oil rig", "boiler"]),
  tsItem(3, 1, "🔋", "Device that stores electrical energy for later use", "battery", ["radiator", "exhaust pipe", "valve"]),
  tsItem(4, 1, "🌱", "Energy source that naturally replenishes and never runs out", "renewable", ["fossil", "toxic", "finite"]),
  // Tier 2 (20–40s): clean-tech & grid infrastructure vocabulary
  tsItem(5, 2, "⚡", "Network of cables and substations that delivers electricity to homes", "power grid", ["water pipe", "coal mine", "fuel tank"]),
  tsItem(6, 2, "🔄", "Electronic device that converts DC solar power into AC grid power", "inverter", ["compressor", "burner", "piston"]),
  tsItem(7, 2, "🌍", "Total greenhouse gas emissions caused by an activity or organization", "carbon footprint", ["wind speed", "cloud cover", "tide level"]),
  tsItem(8, 2, "🏘️", "Localized energy system that can disconnect and run independently", "microgrid", ["landfill", "pipeline", "refinery"]),
  // Tier 3 (40–60s): advanced physics & sustainability terminology
  tsItem(9, 3, "🔆", "Direct conversion of light into electricity using semiconductor cells", "photovoltaic", ["combustion", "fermentation", "erosion"]),
  tsItem(10, 3, "💎", "Crystalline material like silicon used to manufacture solar cells", "semiconductor", ["insulator", "lubricant", "solvent"]),
  tsItem(11, 3, "🌋", "Clean thermal energy generated and stored deep within the Earth's crust", "geothermal", ["atmospheric", "tidal wave", "synthetic"]),
  tsItem(12, 3, "♻️", "Designed to operate long-term without depleting natural resources", "sustainable", ["intermittent", "hazardous", "obsolete"]),
];

const USA_CIRCUIT_FLAG_KEY = "wordwise_usa_circuit_repair_saved_v1";

/**
 * Ensures Circuit Repair is ON for USA until an admin has saved module settings
 * (after which the admin's explicit ON/OFF choice is respected).
 */
export function withUsaCircuitRepair(
  countryId: string,
  games: CountryGameType[]
): CountryGameType[] {
  if (countryId.toLowerCase() !== "usa") return games;
  if (typeof window === "undefined") return games;
  if (localStorage.getItem(USA_CIRCUIT_FLAG_KEY)) return games;
  return games.includes("circuit_repair")
    ? games
    : [...games, "circuit_repair"];
}

const USA_TARGET_FLAG_KEY = "wordwise_usa_target_smasher_saved_v1";

/** Same as withUsaCircuitRepair, for Target Smasher. */
export function withUsaTargetSmasher(
  countryId: string,
  games: CountryGameType[]
): CountryGameType[] {
  if (countryId.toLowerCase() !== "usa") return games;
  if (typeof window === "undefined") return games;
  if (localStorage.getItem(USA_TARGET_FLAG_KEY)) return games;
  return games.includes("target_smasher")
    ? games
    : [...games, "target_smasher"];
}

export interface LocalCountryStudioCache {
  vocabQuestions: DbCountryVocabularyQuestion[];
  listeningQuestions: DbCountryListeningQuestion[];
  sentenceRounds: DbCountrySentenceRound[];
  speakingTurns: DbCountrySpeakingTurn[];
  circuitBoards: DbCountryCircuitBoard[];
  techRunnerQuestions: DbCountryTechRunnerQuestion[];
  targetSmasherItems: DbCountryTargetSmasherItem[];
  moduleConfig: CountryModuleConfig;
  culturalBriefing?: CountryCulturalBriefing;
}

export function getDefaultStudioRowsForCountry(
  countryId: string
): LocalCountryStudioCache {
  const cid = countryId.toLowerCase();
  const defaultModuleConfig: CountryModuleConfig = {
    vocabularyEnabled: true,
    listeningEnabled: true,
    speakingEnabled: true,
    enabledGames:
      cid === "usa"
        ? ["sentence_assembler", "circuit_repair", "tech_runner", "target_smasher"]
        : ["sentence_assembler"],
  };
  const defaultBriefing = getDefaultCulturalBriefingForCountry(cid);

  if (cid !== "usa") {
    return {
      vocabQuestions: [],
      listeningQuestions: [],
      sentenceRounds: [],
      speakingTurns: [],
      circuitBoards: [],
      techRunnerQuestions: [],
      targetSmasherItems: [],
      moduleConfig: defaultModuleConfig,
      culturalBriefing: defaultBriefing,
    };
  }
  return {
    vocabQuestions: staticVocabularyItems.map((v, i) => ({
      id: v.id,
      country_id: "usa",
      word: v.word,
      meaning: v.meaning,
      question_text: v.question,
      options: v.options,
      correct_index: v.correctIndex,
      sort_order: i + 1,
    })),
    listeningQuestions: staticListeningItems.map((l, i) => ({
      id: l.id,
      country_id: "usa",
      title: l.scenario,
      transcript: l.sentence,
      question_text: l.question,
      options: l.options,
      correct_index: l.correctIndex,
      sort_order: i + 1,
    })),
    sentenceRounds: staticSentenceItems.map((s, i) => ({
      id: s.id,
      country_id: "usa",
      target_sentence: s.targetSentence,
      word_chunks: s.words,
      round_number: s.round,
      points: s.points,
      time_limit: s.timeLimit,
      sort_order: i + 1,
    })),
    speakingTurns: DEFAULT_USA_SPEAKING_TURNS,
    circuitBoards: DEFAULT_USA_CIRCUIT_BOARDS,
    techRunnerQuestions: DEFAULT_USA_TECH_RUNNER_QUESTIONS,
    targetSmasherItems: DEFAULT_USA_TARGET_SMASHER_ITEMS,
    moduleConfig: defaultModuleConfig,
    culturalBriefing: defaultBriefing,
  };
}

export function readCountryStudioCache(
  countryId: string
): LocalCountryStudioCache {
  const cid = countryId.toLowerCase();
  const fallback = getDefaultStudioRowsForCountry(cid);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`wordwise_country_studio_${cid}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<LocalCountryStudioCache>;

    let enabledGames = Array.isArray(parsed.moduleConfig?.enabledGames)
      ? parsed.moduleConfig.enabledGames
      : fallback.moduleConfig.enabledGames;

    enabledGames = withUsaCircuitRepair(cid, enabledGames);
    enabledGames = withUsaTargetSmasher(cid, enabledGames);

    if (
      cid === "usa" &&
      !localStorage.getItem("wordwise_usa_tech_runner_enabled_v1")
    ) {
      localStorage.setItem("wordwise_usa_tech_runner_enabled_v1", "1");
      if (!enabledGames.includes("tech_runner")) {
        enabledGames = [...enabledGames, "tech_runner"];
      }
    }

    const isLegacyCoffeeVocab =
      Array.isArray(parsed.vocabQuestions) &&
      parsed.vocabQuestions.some((v) => v.id === "vocab-latte");
    const isLegacyCoffeeListen =
      Array.isArray(parsed.listeningQuestions) &&
      parsed.listeningQuestions.some((l) => /latte|coffee/i.test(l.transcript || ""));
    const isLegacyCoffeeSentences =
      Array.isArray(parsed.sentenceRounds) &&
      parsed.sentenceRounds.some((s) => /latte|espresso/i.test(s.target_sentence || ""));
    const isLegacyCoffeeSpeaking =
      Array.isArray(parsed.speakingTurns) &&
      parsed.speakingTurns.some((t) => /Liberty Roasters|BARISTA/i.test(`${t.speaker_role} ${t.npc_prompt}`));
    const isLegacyCoffeeCircuits =
      Array.isArray(parsed.circuitBoards) &&
      parsed.circuitBoards.some((b) => /Ordering Coffee|Café/i.test(b.topic || ""));
    const isLegacyCoffeeRunner =
      Array.isArray(parsed.techRunnerQuestions) &&
      parsed.techRunnerQuestions.some((q) => /latte|barista|roastery/i.test(q.prompt || ""));
    const isLegacyCoffeeSmasher =
      Array.isArray(parsed.targetSmasherItems) &&
      parsed.targetSmasherItems.some((i) => /barista|croissant/i.test(i.correct_word || ""));
    const isLegacyCoffeeBriefing =
      parsed.culturalBriefing &&
      /barista|latte|café/i.test(parsed.culturalBriefing.communicationStyle || "");

    return {
      vocabQuestions:
        Array.isArray(parsed.vocabQuestions) && !isLegacyCoffeeVocab
          ? parsed.vocabQuestions
          : fallback.vocabQuestions,
      listeningQuestions:
        Array.isArray(parsed.listeningQuestions) && !isLegacyCoffeeListen
          ? parsed.listeningQuestions
          : fallback.listeningQuestions,
      sentenceRounds:
        Array.isArray(parsed.sentenceRounds) && !isLegacyCoffeeSentences
          ? parsed.sentenceRounds
          : fallback.sentenceRounds,
      speakingTurns:
        Array.isArray(parsed.speakingTurns) && !isLegacyCoffeeSpeaking
          ? parsed.speakingTurns
          : fallback.speakingTurns,
      circuitBoards:
        Array.isArray(parsed.circuitBoards) && !isLegacyCoffeeCircuits
          ? parsed.circuitBoards
          : fallback.circuitBoards,
      techRunnerQuestions:
        Array.isArray(parsed.techRunnerQuestions) &&
        parsed.techRunnerQuestions.length > 0 &&
        !isLegacyCoffeeRunner
          ? parsed.techRunnerQuestions
          : fallback.techRunnerQuestions,
      targetSmasherItems:
        Array.isArray(parsed.targetSmasherItems) &&
        parsed.targetSmasherItems.length > 0 &&
        !isLegacyCoffeeSmasher
          ? parsed.targetSmasherItems
          : fallback.targetSmasherItems,
      moduleConfig: parsed.moduleConfig
        ? {
            vocabularyEnabled:
              parsed.moduleConfig.vocabularyEnabled ??
              fallback.moduleConfig.vocabularyEnabled,
            listeningEnabled:
              parsed.moduleConfig.listeningEnabled ??
              fallback.moduleConfig.listeningEnabled,
            speakingEnabled:
              parsed.moduleConfig.speakingEnabled ??
              fallback.moduleConfig.speakingEnabled,
            enabledGames,
          }
        : fallback.moduleConfig,
      culturalBriefing:
        parsed.culturalBriefing &&
        typeof parsed.culturalBriefing.communicationStyle === "string" &&
        !isLegacyCoffeeBriefing
          ? parsed.culturalBriefing
          : fallback.culturalBriefing,
    };
  } catch {
    return fallback;
  }
}

export function writeCountryStudioCache(
  countryId: string,
  cache: LocalCountryStudioCache
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `wordwise_country_studio_${countryId.toLowerCase()}`,
      JSON.stringify(cache)
    );
  } catch {
    // ignore storage errors
  }
}

/**
 * Syncs the granular Vocabulary, Listening, Sentence Assembler, Speaking AI turns,
 * Mini-Games, Cultural Briefing, and Module/Game toggles directly into
 * `public.missions.stages_data` and `public.country_module_configs` in Supabase.
 * Returns `{ error }` if the database write fails or is blocked by RLS.
 */
export async function syncCountryMissionStagesData(
  countryId: string,
  cache: LocalCountryStudioCache
): Promise<{ error: string | null }> {
  writeCountryStudioCache(countryId, cache);
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured." };
  }

  try {
    const supabase = createClient();
    const cid = countryId.toLowerCase();

    // 1. Best-effort sync to granular country_module_configs table (if migrated)
    await supabase.from("country_module_configs").upsert(
      {
        country_id: cid,
        vocabulary_enabled: cache.moduleConfig.vocabularyEnabled,
        listening_enabled: cache.moduleConfig.listeningEnabled,
        speaking_enabled: cache.moduleConfig.speakingEnabled,
        enabled_games: cache.moduleConfig.enabledGames,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "country_id" }
    );

    // 2. Always persist the complete Country Studio bundle into public.missions.stages_data
    const { data: existing, error: fetchErr } = await supabase
      .from("missions")
      .select("*")
      .eq("country_id", cid)
      .maybeSingle<DbMission>();

    if (fetchErr) {
      return { error: fetchErr.message };
    }

    const staticBundle = getStaticMissionBundle(cid);
    const baseStagesData = existing?.stages_data || {
      stages: staticBundle?.mission.stages || [
        { id: "vocabulary", type: "vocabulary" as const, title: "Vocabulary" },
        { id: "listening", type: "listening" as const, title: "Listening" },
        { id: "sentence", type: "sentence" as const, title: "Sentence" },
      ],
      reward: staticBundle?.mission.reward || {
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
      vocabularyItems: [],
      listeningItems: [],
      sentenceItems: [],
    };

    const nextStagesData: DbMissionStagesData = {
      ...baseStagesData,
      vocabularyItems: mapVocabQuestionsToItems(cache.vocabQuestions),
      listeningItems: mapListeningQuestionsToItems(cache.listeningQuestions),
      sentenceItems: mapSentenceRoundsToItems(cache.sentenceRounds),
      vocabQuestions: cache.vocabQuestions,
      listeningQuestions: cache.listeningQuestions,
      sentenceRounds: cache.sentenceRounds,
      speakingTurns: cache.speakingTurns,
      circuitBoards: cache.circuitBoards,
      techRunnerQuestions: cache.techRunnerQuestions,
      targetSmasherItems: cache.targetSmasherItems,
      moduleConfig: cache.moduleConfig,
      culturalBriefing:
        cache.culturalBriefing ||
        getDefaultCulturalBriefingForCountry(countryId),
    };

    if (existing) {
      const { data: updatedRows, error: updateErr } = await supabase
        .from("missions")
        .update({ stages_data: nextStagesData })
        .eq("id", existing.id)
        .select();

      if (updateErr) {
        return { error: updateErr.message };
      }
      if (!updatedRows || updatedRows.length === 0) {
        return {
          error:
            "Supabase RLS blocked saving to public.missions (0 rows updated). Please run the Admin RLS policy SQL in Supabase SQL Editor.",
        };
      }
    } else {
      const missionId =
        staticBundle?.mission.id || `mission-${cid}`;
      const missionTitle =
        staticBundle?.mission.title ||
        (cid === "usa" ? "Renewable Energy" : `${cid.toUpperCase()} Mission`);

      const { data: insertedRows, error: insertErr } = await supabase
        .from("missions")
        .upsert(
          {
            id: missionId,
            country_id: cid,
            title: missionTitle,
            briefing: staticBundle?.mission.briefing || null,
            learning_recap: staticBundle?.mission.learningRecap || null,
            stages_data: nextStagesData,
            bonus_xp: 30,
          },
          { onConflict: "id" }
        )
        .select();

      if (insertErr) {
        return { error: insertErr.message };
      }
      if (!insertedRows || insertedRows.length === 0) {
        return {
          error:
            "Supabase RLS blocked inserting into public.missions. Please run the Admin RLS policy SQL in Supabase SQL Editor.",
        };
      }
    }

    return { error: null };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to save country mission data to Supabase.",
    };
  }
}

/**
 * Fetches a country's mission bundle from Supabase (`country_*` tables and
 * `public.missions.stages_data`), using Supabase as the single source of truth
 * so normal browsers, Incognito tabs, and all devices see identical content.
 */
export async function fetchMissionByCountry(
  countryId: string
): Promise<MissionBundle | null> {
  const normalizedId = countryId.toLowerCase();
  const base = await fetchMissionBase(normalizedId);
  const staticDefaults = getDefaultStudioRowsForCountry(normalizedId);
  if (!base) return null;

  if (!isSupabaseConfigured()) {
    const localCache = readCountryStudioCache(normalizedId);
    const cachedVocab = mapVocabQuestionsToItems(localCache.vocabQuestions);
    const cachedListen = mapListeningQuestionsToItems(
      localCache.listeningQuestions
    );
    const cachedSentences = mapSentenceRoundsToItems(localCache.sentenceRounds);
    return {
      ...base,
      vocabularyItems:
        cachedVocab.length > 0 ? cachedVocab : base.vocabularyItems,
      listeningItems:
        cachedListen.length > 0 ? cachedListen : base.listeningItems,
      sentenceItems:
        cachedSentences.length > 0 ? cachedSentences : base.sentenceItems,
      speakingTurns: localCache.speakingTurns,
      circuitBoards: localCache.circuitBoards,
      techRunnerQuestions: localCache.techRunnerQuestions,
      targetSmasherItems: localCache.targetSmasherItems,
      moduleConfig: localCache.moduleConfig,
      culturalBriefing:
        localCache.culturalBriefing ||
        base.culturalBriefing ||
        getDefaultCulturalBriefingForCountry(normalizedId),
    };
  }

  try {
    const supabase = createClient();
    const [
      vocabQRes,
      listenQRes,
      sentRRes,
      speakingRes,
      circuitRes,
      techRunnerRes,
      targetSmasherRes,
      modCfgRes,
      vocabLegacyRes,
      listenLegacyRes,
      gamesRes,
    ] = await Promise.all([
      supabase
        .from("country_vocabulary_questions")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("country_listening_questions")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("country_sentence_rounds")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("country_speaking_turns")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("country_circuit_boards")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("country_tech_runner_questions")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("country_target_smasher_items")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("country_module_configs")
        .select("*")
        .eq("country_id", normalizedId)
        .maybeSingle<DbCountryModuleConfig>(),
      supabase
        .from("country_vocabularies")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("country_listenings")
        .select("*")
        .eq("country_id", normalizedId)
        .order("sort_order", { ascending: true }),
      supabase.from("country_games").select("*").eq("country_id", normalizedId),
    ]);

    const vocabQRows = (
      vocabQRes.error ? [] : vocabQRes.data || []
    ) as DbCountryVocabularyQuestion[];
    const listenQRows = (
      listenQRes.error ? [] : listenQRes.data || []
    ) as DbCountryListeningQuestion[];
    const sentRRows = (
      sentRRes.error ? [] : sentRRes.data || []
    ) as DbCountrySentenceRound[];
    const speakingRows = (
      speakingRes.error ? [] : speakingRes.data || []
    ) as DbCountrySpeakingTurn[];
    const circuitRows = (
      circuitRes.error ? [] : circuitRes.data || []
    ) as DbCountryCircuitBoard[];
    const techRunnerRows = (
      techRunnerRes.error ? [] : techRunnerRes.data || []
    ) as DbCountryTechRunnerQuestion[];
    const targetSmasherRows = (
      targetSmasherRes.error ? [] : targetSmasherRes.data || []
    ) as DbCountryTargetSmasherItem[];
    const modCfgRow = modCfgRes.error ? null : modCfgRes.data;

    const vocabLegacyRows = (
      vocabLegacyRes.error ? [] : vocabLegacyRes.data || []
    ) as DbCountryVocabulary[];
    const listenLegacyRows = (
      listenLegacyRes.error ? [] : listenLegacyRes.data || []
    ) as DbCountryListening[];
    const gameRows = (
      gamesRes.error ? [] : gamesRes.data || []
    ) as DbCountryGame[];

    const liveVocab =
      vocabQRows.length > 0
        ? mapVocabQuestionsToItems(vocabQRows)
        : vocabLegacyRows.length > 0
          ? buildVocabularyItemsFromRows(vocabLegacyRows)
          : base.vocabularyItems;

    const liveListening =
      listenQRows.length > 0
        ? mapListeningQuestionsToItems(listenQRows)
        : listenLegacyRows.length > 0
          ? buildListeningItemsFromRows(listenLegacyRows)
          : base.listeningItems;

    const liveSentences =
      sentRRows.length > 0
        ? mapSentenceRoundsToItems(sentRRows)
        : base.sentenceItems;

    const liveSpeakingTurns =
      speakingRows.length > 0 ? speakingRows : base.speakingTurns;
    const liveCircuitBoards =
      circuitRows.length > 0 ? circuitRows : base.circuitBoards;
    const liveTechRunnerQuestions =
      techRunnerRows.length > 0 ? techRunnerRows : base.techRunnerQuestions;
    const liveTargetSmasherItems =
      targetSmasherRows.length > 0 ? targetSmasherRows : base.targetSmasherItems;

    const resolvedModuleConfig: CountryModuleConfig = modCfgRow
      ? {
          vocabularyEnabled: Boolean(modCfgRow.vocabulary_enabled),
          listeningEnabled: Boolean(modCfgRow.listening_enabled),
          speakingEnabled: Boolean(modCfgRow.speaking_enabled),
          enabledGames: Array.isArray(modCfgRow.enabled_games)
            ? modCfgRow.enabled_games
            : base.moduleConfig.enabledGames,
        }
      : base.moduleConfig || staticDefaults.moduleConfig;

    return {
      ...base,
      vocabularyItems: liveVocab.length > 0 ? liveVocab : base.vocabularyItems,
      listeningItems:
        liveListening.length > 0 ? liveListening : base.listeningItems,
      sentenceItems:
        liveSentences.length > 0 ? liveSentences : base.sentenceItems,
      speakingTurns: liveSpeakingTurns,
      circuitBoards: liveCircuitBoards,
      techRunnerQuestions: liveTechRunnerQuestions,
      targetSmasherItems: liveTargetSmasherItems,
      moduleConfig: resolvedModuleConfig,
      culturalBriefing:
        base.culturalBriefing ||
        getDefaultCulturalBriefingForCountry(normalizedId),
      gameAssignments: gameRows,
    };
  } catch {
    return base;
  }
}
