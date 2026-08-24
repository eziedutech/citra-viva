/**
 * Recording a spoken answer as audio the model can actually read.
 *
 * This is deliberately not built on `MediaRecorder`, and the reason is a bug
 * with a very confusing symptom. A student spoke a long answer and the box
 * filled with the words "yes and no": not truncated, not garbled, a short
 * plausible sentence with nothing to do with what they said, and no error
 * anywhere.
 *
 * `MediaRecorder` in Chrome and Firefox produces a WebM container, because
 * that is what it offers. Gemini reads WAV, MP3, AIFF, AAC, OGG, and FLAC.
 * WebM is on neither list, and given bytes it cannot decode the model does not
 * refuse: it answers anyway, from nothing. The student's own words are replaced
 * by an invention in the field they are about to submit as their defense.
 *
 * The first attempt at a fix recorded WebM and converted it afterwards, and
 * fell back to the original when conversion failed. That fallback is what kept
 * the bug alive: a failed conversion looked exactly like a successful one.
 *
 * So there is no container to convert out of. Raw samples are taken from the
 * microphone and written straight into a WAV, which is on the supported list
 * and which this project has verified end to end. Nothing here can silently
 * produce audio the model will misread.
 *
 * Sixteen kilohertz mono, matching what the model downsamples to anyway.
 */

const TARGET_SAMPLE_RATE = 16_000;
const BYTES_PER_SAMPLE = 2;
const BUFFER_SIZE = 4096;

/** Below this a recording is a click or a slip of the finger, not an answer. */
export const MIN_RECORDING_SECONDS = 0.4;

type AudioContextConstructor = typeof AudioContext;

function audioContextClass(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

export function canRecord(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    audioContextClass() !== null &&
    typeof OfflineAudioContext !== 'undefined'
  );
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
  view.setUint32(16, 16, true); // header length for PCM
  view.setUint16(20, 1, true); // PCM, uncompressed
  view.setUint16(22, 1, true); // one channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true); // bytes per second
  view.setUint16(32, BYTES_PER_SAMPLE, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    // Clamped before scaling. A sample outside the range wraps rather than
    // clips once it is an integer, and that is heard as a burst of noise.
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += BYTES_PER_SAMPLE;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Move samples to the rate we send at, using the browser's own resampler. */
async function resample(samples: Float32Array, from: number): Promise<Float32Array> {
  if (from === TARGET_SAMPLE_RATE) return samples;

  const frames = Math.max(1, Math.round((samples.length / from) * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);

  const buffer = offline.createBuffer(1, samples.length, from);
  buffer.copyToChannel(samples, 0);

  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();

  return (await offline.startRendering()).getChannelData(0);
}

export interface Recording {
  wav: Blob;
  seconds: number;
}

export interface Recorder {
  /** Stop, release the microphone, and return the recording as WAV. */
  stop: () => Promise<Recording>;
  /** Release everything without producing a recording. */
  cancel: () => void;
}

/**
 * Open the microphone and start collecting samples.
 *
 * Throws if permission is refused, which is the caller's cue to say so. Nothing
 * here degrades quietly: a recorder that cannot record raises.
 */
export async function startRecording(): Promise<Recorder> {
  const Context = audioContextClass();
  if (!Context) throw new Error('This browser cannot record audio.');

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const context = new Context();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);

  // A processor node only runs while it is connected to the destination, and
  // connecting the microphone to the speakers is feedback. A gain of zero is
  // what keeps the graph alive without putting the student's voice into their
  // own ears half a second late.
  const silence = context.createGain();
  silence.gain.value = 0;

  const chunks: Float32Array[] = [];
  let frames = 0;

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    // Copied, because the event's buffer is reused for the next block.
    chunks.push(new Float32Array(input));
    frames += input.length;
  };

  source.connect(processor);
  processor.connect(silence);
  silence.connect(context.destination);

  // Some browsers open a context suspended until a gesture. Recording begins
  // with a click, so this resolves immediately, but not resuming would give a
  // recording of perfect silence.
  if (context.state === 'suspended') await context.resume();

  const release = () => {
    processor.onaudioprocess = null;
    processor.disconnect();
    silence.disconnect();
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };

  return {
    async stop(): Promise<Recording> {
      const sampleRate = context.sampleRate;
      release();

      const merged = new Float32Array(frames);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const seconds = frames / sampleRate;
      const samples = await resample(merged, sampleRate);
      return { wav: encodeWav(samples, TARGET_SAMPLE_RATE), seconds };
    },
    cancel: release,
  };
}
