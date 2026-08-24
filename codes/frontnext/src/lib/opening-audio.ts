/**
 * The opening question's audio, carried from the intake page into the room.
 *
 * It is made while the examination is being planned, during a wait the student
 * is already having, so the first question can be heard the moment it appears
 * instead of after a second wait nobody asked for.
 *
 * Held in a module variable rather than in session storage. Starting a defense
 * is a client-side navigation, so this module survives it, and the audio is
 * around two megabytes as base64: large enough that storage quotas start to
 * matter, and stringifying it to get it there doubles the memory for no reason.
 *
 * Read once and cleared. A full page reload loses it, and the room then fetches
 * the audio itself, which is what it did before this existed.
 */

interface OpeningAudio {
  sessionId: string;
  base64: string;
  mime: string;
}

let pending: OpeningAudio | null = null;

export function holdOpeningAudio(sessionId: string, base64: string, mime: string) {
  pending = { sessionId, base64, mime };
}

/** Take the audio for this session, if it is the one being held. */
export function takeOpeningAudio(sessionId: string): { base64: string; mime: string } | null {
  if (!pending || pending.sessionId !== sessionId) return null;

  const { base64, mime } = pending;
  pending = null;
  return { base64, mime };
}
