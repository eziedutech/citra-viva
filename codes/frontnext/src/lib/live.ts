/**
 * Streaming a spoken answer to the transcriber while it is being spoken.
 *
 * The batch path uploads the recording after the student stops, which costs
 * about four seconds of silence at exactly the moment they are waiting to see
 * whether they were understood. This sends the audio as it is captured, so when
 * they stop, the words arrive in well under a second.
 *
 * It does not put words on screen while somebody is still talking. That was
 * tested against the Live API and its transcription is emitted per turn, not
 * continuously, whatever the settings. What it removes is the wait afterwards.
 *
 * This is the one place the browser talks to the API directly, because a
 * Next.js route handler cannot carry a WebSocket upgrade. A browser cannot set
 * headers on a WebSocket either, so the credential travels in the subprotocol,
 * which is a header on the wire rather than a query string that every proxy and
 * access log along the way would keep.
 */

const AUTH_PROTOCOL = 'citra.auth';

/** Long enough for a slow network, short enough not to hold a stuck button. */
const OPEN_TIMEOUT_MS = 8000;
const FINISH_TIMEOUT_MS = 20_000;

interface LiveSocket {
  /** Send one frame of 16 kHz mono PCM. */
  send: (chunk: ArrayBuffer) => void;
  /** Say the speech has ended and wait for the transcript. */
  finish: () => Promise<string>;
  /** Give up without waiting for anything. */
  abandon: () => void;
}

/** Where the socket lives, asked of our own server so the API URL stays there. */
export async function liveEndpoint(send: typeof fetch = fetch): Promise<string> {
  const response = await send('/api/speech/live-url');
  if (!response.ok) throw new Error('Streaming transcription is not available.');

  const { url } = (await response.json()) as { url?: string };
  if (!url) throw new Error('Streaming transcription is not configured.');
  return url;
}

export async function openLiveTranscription(url: string, token: string): Promise<LiveSocket> {
  // Two protocols: a marker the server recognises, and the credential itself.
  const socket = new WebSocket(url, token ? [AUTH_PROTOCOL, token] : [AUTH_PROTOCOL]);
  socket.binaryType = 'arraybuffer';

  const pieces: string[] = [];
  let done = false;
  let failure: Error | null = null;
  let settle: (() => void) | null = null;

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(String(event.data)) as { text?: string; done?: boolean };
      if (data.text) pieces.push(data.text);
      if (data.done) {
        done = true;
        settle?.();
      }
    } catch {
      // A frame we cannot read is not a reason to lose the ones we could.
    }
  };

  socket.onerror = () => {
    failure = failure ?? new Error('The transcription connection failed.');
    settle?.();
  };

  socket.onclose = (event) => {
    // 1008 is the server refusing the credential. Anything else that closes
    // before the transcript arrived is a network or service failure, and both
    // are the caller's cue to fall back to uploading the recording whole.
    if (!done) {
      failure =
        failure ??
        new Error(
          event.code === 1008
            ? 'The transcription connection was refused.'
            : 'The transcription connection closed early.',
        );
    }
    settle?.();
  };

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The transcriber did not answer.')), OPEN_TIMEOUT_MS);
    socket.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    const failed = () => {
      clearTimeout(timer);
      reject(new Error('The transcriber could not be reached.'));
    };
    socket.addEventListener('error', failed, { once: true });
    socket.addEventListener('close', failed, { once: true });
  });

  return {
    send(chunk) {
      if (socket.readyState === WebSocket.OPEN) socket.send(chunk);
    },

    async finish() {
      if (socket.readyState === WebSocket.OPEN) socket.send('end');

      await new Promise<void>((resolve) => {
        if (done || failure) return resolve();
        settle = resolve;
        setTimeout(resolve, FINISH_TIMEOUT_MS);
      });

      if (socket.readyState === WebSocket.OPEN) socket.close();
      if (failure && pieces.length === 0) throw failure;

      return pieces.join(' ').trim();
    },

    abandon() {
      done = true;
      if (socket.readyState <= WebSocket.OPEN) socket.close();
    },
  };
}
