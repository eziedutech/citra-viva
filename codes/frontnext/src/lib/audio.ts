/**
 * Turn a browser recording into audio the model can actually read.
 *
 * This exists because of a bug with a very confusing symptom. A student spoke a
 * long answer and what appeared in the answer box was "yes and no". Not
 * truncated, not garbled: a short plausible sentence that had nothing to do with
 * what they said, and no error anywhere.
 *
 * The cause is the container. Chrome and Firefox record a WebM container,
 * because that is what `MediaRecorder` supports, and WebM is not one of the
 * audio formats the model accepts. Given bytes it cannot decode, it does not
 * refuse; it answers anyway, from nothing.
 *
 * So the recording is decoded in the browser and re-encoded as WAV, which is on
 * the supported list and which this project has verified end to end. Decoding
 * happens through the Web Audio API, which reads whatever the same browser just
 * recorded, so every browser can read its own output.
 *
 * Sixteen kilohertz mono, because speech recognition gains nothing above it and
 * a defense answer can run for minutes: a stereo forty-eight kilohertz WAV of
 * three minutes is over thirty megabytes, and this is six times smaller with no
 * loss that matters.
 */

const TARGET_SAMPLE_RATE = 16_000;
const BYTES_PER_SAMPLE = 2;

type AudioContextConstructor = typeof AudioContext;

function audioContextClass(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

/** Whether this browser can re-encode a recording before sending it. */
export function canConvertAudio(): boolean {
  return audioContextClass() !== null && typeof OfflineAudioContext !== 'undefined';
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * BYTES_PER_SAMPLE);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  const dataBytes = samples.length * BYTES_PER_SAMPLE;

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // PCM, uncompressed
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true); // bytes per second
  view.setUint16(32, BYTES_PER_SAMPLE, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    // Clamped before scaling. A sample outside the range wraps rather than
    // clips once it becomes an integer, which is heard as a burst of noise.
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += BYTES_PER_SAMPLE;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Decode a recording and re-encode it as 16 kHz mono WAV.
 *
 * Returns the original untouched if this browser cannot decode it. The student
 * reviews every transcript before sending it, so a worse recording is a worse
 * transcript to correct rather than a silent falsehood, and refusing outright
 * would take voice away from a browser that might still manage.
 */
export async function toWav(recording: Blob): Promise<Blob> {
  const Context = audioContextClass();
  if (!Context || typeof OfflineAudioContext === 'undefined') return recording;

  let context: AudioContext | null = null;
  try {
    const bytes = await recording.arrayBuffer();
    context = new Context();
    const decoded = await context.decodeAudioData(bytes);

    // One channel out of however many went in, at the rate we want. The
    // rendering graph does the downmix and the resample together, which is both
    // shorter and better than doing either by hand.
    const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
    if (frames <= 0) return recording;

    const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();

    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
  } catch {
    return recording;
  } finally {
    void context?.close();
  }
}
