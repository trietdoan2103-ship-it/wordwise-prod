export type UserRole = "student" | "admin";
export type SubscriptionTierType = "free" | "pro_trial" | "pro";
export type LessonType = "reading" | "flashcard";

export interface DbProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  school_name: string;
  role: UserRole;
  subscription_tier: SubscriptionTierType;
  xp: number;
  current_streak: number;
  last_active_date: string; // YYYY-MM-DD
  freeze_count: number;
  created_at: string;
}

export interface DbLessonReadingContent {
  paragraphs: string[];
  highlightedTerms: string[];
}

export interface DbLesson {
  id: string;
  topic_id: string;
  title: string;
  subtitle: string | null;
  category: string;
  difficulty: string;
  duration_minutes: number;
  lesson_type: LessonType;
  content: DbLessonReadingContent;
  key_takeaways: string[];
  sort_order: number;
  is_published: boolean;
}

export interface DbFlashcard {
  id: string;
  lesson_id: string;
  term: string;
  phonetic: string | null;
  part_of_speech: string | null;
  vietnamese_meaning: string;
  definition: string | null;
  example_sentence: string | null;
  synonyms: string[];
  sort_order: number;
}

export interface DbLessonQuestion {
  id: string;
  lesson_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
}

export interface DbCountry {
  id: string;
  name: string;
  code: string;
  flag: string;
  map_x: string;
  map_y: string;
  unlocked: boolean;
  mission_title: string | null;
  sort_order: number;
}

export interface DbMissionBriefing {
  location: string;
  scenario: string;
  objectives: { icon: string; text: string }[];
}

export interface DbMissionLearningRecap {
  stages: { icon: string; label: string; summary: string }[];
  communicationTakeaway: string;
}

export interface DbMissionStagesData {
  stages: {
    id: string;
    type: "vocabulary" | "listening" | "sentence";
    title: string;
  }[];
  reward: {
    stamp: { name: string; icon: string };
    badge: { name: string; icon: string };
    gift: { name: string; icon: string; description: string };
    bonusXP: number;
  };
  vocabularyItems: {
    id: string;
    word: string;
    meaning: string;
    question: string;
    options: string[];
    correctIndex: number;
    xp: number;
  }[];
  listeningItems: {
    id: string;
    scenario: string;
    sentence: string;
    question: string;
    options: string[];
    correctIndex: number;
    xp: number;
  }[];
  sentenceItems: {
    id: string;
    round: number;
    targetSentence: string;
    words: string[];
    points: number;
    timeLimit: number;
  }[];
  culturalBriefing?: {
    communicationStyle: string;
    keyLocalPhrases: { phrase: string; vietnameseMeaning: string }[];
    culturalTip: string;
  };
}

export interface DbMission {
  id: string;
  country_id: string;
  title: string;
  briefing: DbMissionBriefing | null;
  learning_recap: DbMissionLearningRecap | null;
  stages_data: DbMissionStagesData;
  bonus_xp: number;
}

export interface DbEvent {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  format_label: string | null;
  date_label: string | null;
  time_label: string | null;
  location: string | null;
  host: string | null;
  description: string | null;
  rewards: string | null;
  base_registered_count: number;
  sort_order: number;
}

export interface DbCountryVocabulary {
  id: string;
  country_id: string;
  term: string;
  phonetic: string | null;
  part_of_speech: string | null;
  vietnamese_meaning: string;
  definition: string | null;
  example_sentence: string | null;
  sort_order: number;
}

export interface DbListeningQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface DbCountryListening {
  id: string;
  country_id: string;
  title: string;
  transcript: string;
  questions: DbListeningQuestion[];
  sort_order: number;
}

export type CountryGameType =
  | "sentence_assembler"
  | "circuit_repair"
  | "tech_runner"
  | "target_smasher";

export interface DbCountryGame {
  id: string;
  country_id: string;
  game_type: CountryGameType;
  is_active: boolean;
  config: Record<string, unknown>;
}

export interface DbCountryVocabularyQuestion {
  id: string;
  country_id: string;
  word: string;
  meaning: string;
  question_text: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

export interface DbCountryListeningQuestion {
  id: string;
  country_id: string;
  title: string;
  transcript: string;
  question_text: string;
  options: string[];
  correct_index: number;
  sort_order: number;
}

export interface DbCountrySentenceRound {
  id: string;
  country_id: string;
  target_sentence: string;
  word_chunks: string[];
  round_number: number;
  points: number;
  time_limit: number;
  sort_order: number;
}

export interface DbCountrySpeakingTurn {
  id: string;
  country_id: string;
  speaker_role: string;
  npc_prompt: string;
  target_line: string;
  vietnamese_translation: string;
  coach_tip: string;
  sort_order: number;
}

export interface DbCountryModuleConfig {
  country_id: string;
  vocabulary_enabled: boolean;
  listening_enabled: boolean;
  speaking_enabled: boolean;
  enabled_games: CountryGameType[];
  updated_at?: string;
}

export interface CircuitPair {
  clue: string;
  answer: string;
}

export interface DbCountryCircuitBoard {
  id: string;
  country_id: string;
  board_number: number;
  topic: string;
  pairs: CircuitPair[];
  points: number;
  time_limit: number;
  sort_order: number;
}

export interface DbCountryTechRunnerQuestion {
  id: string;
  country_id: string;
  /** Difficulty tier: 1 (First 20s), 2 (Middle 20s), 3 (Final 20s) */
  tier: 1 | 2 | 3;
  prompt: string;
  /** 3 lane options: [Left, Center, Right] */
  options: [string, string, string];
  correct_index: 0 | 1 | 2;
  sort_order: number;
}

export interface DbCountryTargetSmasherItem {
  id: string;
  country_id: string;
  /** Difficulty tier: 1 (0–20s), 2 (20–40s), 3 (40–60s) */
  tier: 1 | 2 | 3;
  /** Large visual icon / emoji shown on the objective card */
  icon: string;
  /** Concept / prompt label (e.g. "Direct conversion of light into electricity") */
  prompt: string;
  correct_word: string;
  /** 3 wrong-answer distractor words */
  distractors: [string, string, string];
  sort_order: number;
}

export type VideoLevel = "Beginner" | "Intermediate" | "Advanced";
export type VideoDomain =
  | "AI & Tech"
  | "Engineering"
  | "Science"
  | "Daily Culture";

export interface VideoTranscriptNote {
  term: string;
  meaning: string;
  contextSentence: string;
}

export interface VideoQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface DbVideo {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  duration_label: string | null;
  category: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  level?: VideoLevel;
  domain?: VideoDomain;
  transcript_notes?: VideoTranscriptNote[];
  quiz_questions?: VideoQuizQuestion[];
}

export interface DbUserLessonProgress {
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface DbUserMissionProgress {
  user_id: string;
  country_id: string;
  completed_stages: string[];
  mission_completed: boolean;
  stamp_unlocked: boolean;
  badge_unlocked: boolean;
  gift_unlocked: boolean;
  updated_at: string;
}

export interface DbUserAchievement {
  user_id: string;
  badge_id: string;
  unlocked_at: string;
}

export interface DbEventRegistration {
  user_id: string;
  event_id: string;
  registered_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: DbProfile;
        Insert: Partial<DbProfile> & { id: string };
        Update: Partial<DbProfile>;
      };
      lessons: {
        Row: DbLesson;
        Insert: Partial<DbLesson> & { id: string; title: string };
        Update: Partial<DbLesson>;
      };
      flashcards: {
        Row: DbFlashcard;
        Insert: Partial<DbFlashcard> & { id: string; lesson_id: string; term: string; vietnamese_meaning: string };
        Update: Partial<DbFlashcard>;
      };
      lesson_questions: {
        Row: DbLessonQuestion;
        Insert: Partial<DbLessonQuestion> & { id: string; lesson_id: string; question: string; options: string[]; correct_index: number };
        Update: Partial<DbLessonQuestion>;
      };
      countries: {
        Row: DbCountry;
        Insert: Partial<DbCountry> & { id: string; name: string };
        Update: Partial<DbCountry>;
      };
      missions: {
        Row: DbMission;
        Insert: Partial<DbMission> & { id: string; country_id: string; title: string };
        Update: Partial<DbMission>;
      };
      events: {
        Row: DbEvent;
        Insert: Partial<DbEvent> & { id: string; title: string };
        Update: Partial<DbEvent>;
      };
      videos: {
        Row: DbVideo;
        Insert: Partial<DbVideo> & { id: string; title: string; youtube_url: string };
        Update: Partial<DbVideo>;
      };
      country_vocabularies: {
        Row: DbCountryVocabulary;
        Insert: Partial<DbCountryVocabulary> & { id: string; country_id: string; term: string; vietnamese_meaning: string };
        Update: Partial<DbCountryVocabulary>;
      };
      country_listenings: {
        Row: DbCountryListening;
        Insert: Partial<DbCountryListening> & { id: string; country_id: string; title: string; transcript: string };
        Update: Partial<DbCountryListening>;
      };
      country_games: {
        Row: DbCountryGame;
        Insert: Partial<DbCountryGame> & { id: string; country_id: string; game_type: CountryGameType };
        Update: Partial<DbCountryGame>;
      };
      country_vocabulary_questions: {
        Row: DbCountryVocabularyQuestion;
        Insert: Partial<DbCountryVocabularyQuestion> & { id: string; country_id: string; question_text: string };
        Update: Partial<DbCountryVocabularyQuestion>;
      };
      country_listening_questions: {
        Row: DbCountryListeningQuestion;
        Insert: Partial<DbCountryListeningQuestion> & { id: string; country_id: string; transcript: string; question_text: string };
        Update: Partial<DbCountryListeningQuestion>;
      };
      country_sentence_rounds: {
        Row: DbCountrySentenceRound;
        Insert: Partial<DbCountrySentenceRound> & { id: string; country_id: string; target_sentence: string };
        Update: Partial<DbCountrySentenceRound>;
      };
      country_speaking_turns: {
        Row: DbCountrySpeakingTurn;
        Insert: Partial<DbCountrySpeakingTurn> & { id: string; country_id: string; npc_prompt: string; target_line: string };
        Update: Partial<DbCountrySpeakingTurn>;
      };
      country_module_configs: {
        Row: DbCountryModuleConfig;
        Insert: Partial<DbCountryModuleConfig> & { country_id: string };
        Update: Partial<DbCountryModuleConfig>;
      };
      country_circuit_boards: {
        Row: DbCountryCircuitBoard;
        Insert: Partial<DbCountryCircuitBoard> & { id: string; country_id: string };
        Update: Partial<DbCountryCircuitBoard>;
      };
      country_tech_runner_questions: {
        Row: DbCountryTechRunnerQuestion;
        Insert: Partial<DbCountryTechRunnerQuestion> & { id: string; country_id: string; prompt: string };
        Update: Partial<DbCountryTechRunnerQuestion>;
      };
      country_target_smasher_items: {
        Row: DbCountryTargetSmasherItem;
        Insert: Partial<DbCountryTargetSmasherItem> & { id: string; country_id: string; prompt: string; correct_word: string };
        Update: Partial<DbCountryTargetSmasherItem>;
      };
      user_lesson_progress: {
        Row: DbUserLessonProgress;
        Insert: { user_id: string; lesson_id: string; completed_at?: string };
        Update: Partial<DbUserLessonProgress>;
      };
      user_mission_progress: {
        Row: DbUserMissionProgress;
        Insert: Partial<DbUserMissionProgress> & { user_id: string; country_id: string };
        Update: Partial<DbUserMissionProgress>;
      };
      user_achievements: {
        Row: DbUserAchievement;
        Insert: { user_id: string; badge_id: string; unlocked_at?: string };
        Update: Partial<DbUserAchievement>;
      };
      event_registrations: {
        Row: DbEventRegistration;
        Insert: { user_id: string; event_id: string; registered_at?: string };
        Update: Partial<DbEventRegistration>;
      };
    };
  };
}
