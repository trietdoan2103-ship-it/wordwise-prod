/**
 * XP award constants for each activity type.
 * Adjust these values here without touching component code.
 */
export const XP = {
  VOCABULARY_CORRECT: 10,
  LISTENING_CORRECT: 10,
  SENTENCE_CORRECT: 20,
  MISSION_COMPLETE: 30,
} as const;

export type XPKey = keyof typeof XP;
