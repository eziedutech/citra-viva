'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Hint } from '@/components/Hint';
import { Icon } from '@/components/Icon';
import { canRecord, pickRecordingType, transcribe } from '@/lib/speech';
import { fill, type Dictionary } from '@/lib/i18n';

/** A spoken answer is a turn in a defense. Past this it is a monologue. */
const MAX_RECORDING_SECONDS = 300;

interface Props {
  dict: Dictionary;
  /** Hand the transcript back for the student to read, edit, and send. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

/**
 * Speaking an answer instead of typing it.
 *
 * The transcript is put into the answer box rather than sent. That is the rule
 * this whole product runs on, applied once more: the examiner judges what the
 * student meant to say, and a defense transcript is a permanent record, so a
 * word the recognition got wrong has to be correctable before it becomes part
 * of one. It also keeps the spoken path on the same endpoint as the typed one,
 * which is what keeps every session rule applying equally to both.
 */
export function VoiceInput({ dict, onTranscript, disabled = false }: Props) {
  const { authedFetch } = useAuth();
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  // Checked after mount, not during render: these APIs do not exist on the
  // server, and microphone access needs a secure origin, which the rendering
  // process cannot know about.
  useEffect(() => {
    setSupported(canRecord());
  }, []);

  useEffect(() => {
    if (!recording) {
      setSeconds(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [recording]);

  // A recorder left running holds the microphone open, and the browser keeps
  // showing the recording indicator for a page that is no longer on screen.
  useEffect(() => {
    return () => {
      const active = recorder.current;
      if (active && active.state !== 'inactive') active.stop();
      active?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!recording || seconds < MAX_RECORDING_SECONDS) return;
    stop();
    // The dependency list is deliberately narrow: this fires on the tick that
    // crosses the limit, and stopping clears `recording` so it cannot repeat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, seconds]);

  function release() {
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
  }

  async function begin() {
    setError('');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Every failure here is the same thing from the student's side: no
      // microphone is available to them. Naming the browser's permission
      // dialog is more use than reporting which exception was raised.
      setError(dict.voice.denied);
      return;
    }

    const mimeType = pickRecordingType();
    const active = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks.current = [];

    active.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };

    active.onstop = () => {
      const recorded = new Blob(chunks.current, { type: active.mimeType || 'audio/webm' });
      chunks.current = [];
      release();
      void send(recorded);
    };

    recorder.current = active;
    active.start();
    setRecording(true);
  }

  function stop() {
    const active = recorder.current;
    if (active && active.state !== 'inactive') active.stop();
    setRecording(false);
  }

  async function send(recorded: Blob) {
    if (recorded.size === 0) {
      setError(dict.voice.empty);
      return;
    }

    setWorking(true);
    try {
      const text = await transcribe(recorded, authedFetch);
      onTranscript(text);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.voice.failed);
    } finally {
      setWorking(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-micro text-[color:var(--color-ink-400)]">{dict.voice.unsupported}</p>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => (recording ? stop() : void begin())}
        disabled={disabled || working}
        aria-pressed={recording}
        className={[
          'text-caption flex h-9 items-center gap-2 rounded-[var(--radius-action)] border px-3 transition-colors duration-150',
          recording
            ? 'border-[color:var(--color-danger)] bg-[color:var(--color-tint-danger)] text-[color:var(--color-danger)]'
            : 'border-[color:var(--color-line)] hover:bg-[color:var(--color-hover)]',
          'disabled:text-[color:var(--color-ink-400)]',
        ].join(' ')}
      >
        <Icon name={recording ? 'square' : 'mic'} size={16} />
        {working ? dict.voice.transcribing : recording ? dict.voice.stop : dict.voice.speak}
      </button>

      {recording ? (
        <span className="text-micro flex items-center gap-2 text-[color:var(--color-danger)]">
          <span className="ai-pulse block h-[7px] w-[7px] rounded-[var(--radius-chip)] bg-[color:var(--color-danger)]" />
          <span className="tabular-nums">{fill(dict.ai.elapsed, { seconds })}</span>
        </span>
      ) : null}

      <Hint text={dict.voice.hint} side="top" />

      {error ? (
        <span role="alert" className="text-micro text-[color:var(--color-danger)]">
          {error}
        </span>
      ) : null}
    </span>
  );
}
