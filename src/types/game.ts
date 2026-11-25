// ─── Country / Mission Hierarchy ─────────────────────────────────────────────

export type Country = {
  id: string;
  name: string;
  flag: string;
  unlocked: boolean;
  /** CSS percentage values for pin placement on the world map */
  position: { x: string; y: string };
  missions: Mission[];
  missionTitle?: string;
};

export type MissionBriefing = {
  /** e.g. "🇺🇸 California & Texas Clean Energy Grid Lab" */
  location: string;
  /** One or two sentence real-world scenario description */
  scenario: string;
  /** Short challenge objectives shown as a bulleted list */
  objectives: { icon: string; text: string }[];
};

export type MissionLearningRecap = {
  /** Summary line for each completed stage */
  stages: { icon: string; label: string; summary: string }[];
  /** The key English sentence the learner can now say */
  communicationTakeaway: string;
};

export type Mission = {
  id: string;
  title: string;
  countryId: string;
  stages: MissionStage[];
  reward: Reward;
  /** Optional pre-gameplay context screen */
  briefing?: MissionBriefing;
  /** Optional post-gameplay learning summary screen */
  learningRecap?: MissionLearningRecap;
};


export type MissionStage = {
  id: string;
  type: "vocabulary" | "listening" | "sentence";
  title: string;
};

// ─── Stage Content ────────────────────────────────────────────────────────────

export type VocabularyItem = {
  id: string;
  word: string;
  /** Vietnamese translation shown on the flashcard */
  meaning: string;
  question: string;
  /** Vietnamese answer options */
  options: string[];
  correctIndex: number;
  xp: number;
};

export type ListeningItem = {
  id: string;
  /** Display label for the scenario context, e.g. "Solar Grid Lab" */
  scenario: string;
  /** The English sentence spoken aloud via TTS */
  sentence: string;
  question: string;
  options: string[];
  correctIndex: number;
  xp: number;
};

export type SentenceItem = {
  id: string;
  /** 1-based round number (1–10) */
  round: number;
  /** The correct complete sentence the player must construct */
  targetSentence: string;
  /**
   * Word chips shown to the player — pre-shuffled in the data file so the
   * correct order is not immediately apparent.
   */
  words: string[];
  /** Points awarded for a correct answer this round (10 / 15 / 20 / 25 / 30) */
  points: number;
  /** Countdown seconds for this round (30 / 25 / 20 / 15 / 10) */
  timeLimit: number;
};

// ─── Rewards ─────────────────────────────────────────────────────────────────

export type Reward = {
  stamp: { name: string; icon: string };
  badge: { name: string; icon: string };
  gift: { name: string; icon: string; description: string };
  bonusXP: number;
};

// ─── User Progress (localStorage shape) ──────────────────────────────────────

export type UserProgress = {
  xp: number;
  usaCompleted: boolean;
  usaStampUnlocked: boolean;
  usaBadgeUnlocked: boolean;
  coffeeCupUnlocked: boolean;
  /** Stage IDs that have been fully completed, e.g. ["vocabulary", "listening"] */
  completedStages: string[];
};

// ─── Game Context Shape ───────────────────────────────────────────────────────

export type GameContextValue = {
  xp: number;
  completedStages: string[];
  usaCompleted: boolean;
  usaStampUnlocked: boolean;
  usaBadgeUnlocked: boolean;
  coffeeCupUnlocked: boolean;
  addXP: (amount: number) => void;
  completeStage: (stageId: string) => void;
  completeMission: (missionId: string) => void;
  resetProgress: () => void;
};
