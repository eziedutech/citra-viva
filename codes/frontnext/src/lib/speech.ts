/**
 * The browser half of the voice layer.
 *
 * Both directions go through this app's own route handlers, the same as every
 * other call: the API address is never shipped to the browser, and a recording
 * never leaves for anywhere except the service that transcribes it.
 */

/**
 * What this browser can actually record.
 *
 * Chrome and Edge produce a WebM container, Firefox produces Ogg, and Safari
 * produces MP4 with AAC. Asking for a type the browser cannot encode does not
 * fail loudly: `MediaRecorder` quietly falls back to something else and the
 * media type on the blob then disagrees with what was requested, which is the
 * sort of mismatch that only shows up as a rejected upload.
 */
const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

export function pickRecordingType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function canRecord(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

/** File extension matching a recording's media type, for the upload filename. */
function extensionFor(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

/**
 * `fetch`, supplied by the caller.
 *
 * Both of these are handed the authenticating fetch from the auth provider, so
 * a recording made just after a token expired is retried rather than lost. A
 * spoken answer can be several minutes of someone's effort, and asking them to
 * say it again because of a clock is the wrong way to fail.
 */
export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function transcribe(recording: Blob, send: Fetcher = fetch): Promise<string> {
  const form = new FormData();
  // The blob's own type, not the recorder's. By the time a recording reaches
  // here it has usually been re-encoded, and a filename describing the format
  // it used to be is how a working file gets rejected at the far end.
  const type = recording.type || 'audio/wav';
  form.append('file', recording, `answer.${extensionFor(type)}`);

  const response = await send('/api/speech/transcribe', { method: 'POST', body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'The recording could not be transcribed.');
  return String(data.text ?? '');
}

/**
 * Fetch spoken audio for a piece of examiner text.
 *
 * The caller owns the returned object URL and must revoke it. Holding one open
 * pins its blob in memory for the life of the document, and a defense plays
 * many of these.
 */
export async function speak(text: string, send: Fetcher = fetch): Promise<string> {
  const response = await send('/api/speech/say', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'The question could not be read aloud.');

  const binary = atob(String(data.audio_base64 ?? ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(new Blob([bytes], { type: data.mime_type || 'audio/wav' }));
}
