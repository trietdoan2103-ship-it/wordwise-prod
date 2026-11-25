/**
 * Thin wrapper around the browser SpeechSynthesis API.
 * Used by the Listening stage to speak English sentences aloud.
 * Does NOT implement speech recognition.
 */

/** Check whether TTS is available in the current browser. */
export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak an English sentence using the browser TTS engine. */
export function speak(text: string, onEnd?: () => void): void {
  if (!isTTSAvailable()) return;

  // Cancel any in-progress speech before starting a new one
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9; // Slightly slower for learner comprehension
  utterance.pitch = 1;
  utterance.volume = 1;

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

/** Stop any currently playing speech. */
export function stopSpeech(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
}
