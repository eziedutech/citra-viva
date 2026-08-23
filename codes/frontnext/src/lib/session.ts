import type { SessionState } from '@/lib/types';

/**
 * Fill in anything the API left out before the interface touches it.
 *
 * This exists because of a real failure. A session created by an older API
 * revision came back without `findings`, and the whole defense room went to an
 * error page over one missing array. During a live defense that is the worst
 * possible trade: the student loses the session, and everything the API did
 * return is thrown away with it.
 *
 * So the boundary is treated as untrusted even though it is our own service.
 * A panel with nothing in it is a bad panel. A blank screen is a broken
 * product.
 */
export function normalizeSession(raw: SessionState): SessionState {
  return {
    ...raw,
    questions: raw.questions ?? [],
    findings: raw.findings ?? [],
    progress: raw.progress ?? [],
    transcript: raw.transcript ?? [],
    summary: raw.summary ?? null,
    current_index: raw.current_index ?? 0,
    opening_remark: raw.opening_remark ?? '',
    language: raw.language ?? 'id',
  };
}
