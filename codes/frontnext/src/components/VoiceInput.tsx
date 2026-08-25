'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Hint } from '@/components/Hint';
import { Icon } from '@/components/Icon';
import {
  canRecord,
  MIN_RECORDING_SECONDS,
  SILENCE_PEAK,
  startRecording,
  type Recorder,
} from '@/lib/audio';
import { fill, type Dictionary } from '@/lib/i18n';
import { liveEndpoint, openLiveTranscription } from '@/lib/live';
import { transcribe } from '@/lib/speech';

/** A spoken answer is a turn in a defense. Past this it is a monologue. */
const MAX_RECORDING_SECONDS = 300;

interface Props {
  dict: Dictionary;
  /** Hand the transcript back for the student to read, edit, and send. */
  onTranscript: (text: string) => void;
  /**
   * Told when transcription starts and stops, so the room can raise the same
   * working bar it raises for everything else. A wait with no indicator is
   * indistinguishable from a broken button, and this one lasts several
   * seconds after the student has already stopped speaking.
   */
  onWorkingChange?: (working: boolean) => void;
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
export function VoiceInput({
  dict,
  onTranscript,
  onWorkingChange,
  disabled = false,
}: Props) {
  const auth = useAuth();
  const { authedFetch } = auth;
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);

  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<Recorder | null>(null);
  const live = useRef<Awaited<ReturnType<typeof openLiveTranscription>> | null>(null);

  // Set when the student discards, and read after every await in `finish`.
  // Cancelling cannot reach into a request already in flight, so the guard is
  // on what happens to the result rather than on the request itself: a
  // transcript that arrives after a discard is dropped instead of appearing in
  // the answer box a second after the student decided against it.
  const discarded = useRef(false);

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

  // A recorder left running holds the microphone open, and the browser goes on
  // showing the recording indicator for a page that is no longer on screen.
  useEffect(() => {
    return () => {
      recorder.current?.cancel();
      recorder.current = null;
      live.current?.abandon();
      live.current = null;
    };
  }, []);

  /**
   * Throw the recording away, transcribing nothing.
   *
   * This exists because of the case where the microphone is open and nobody is
   * speaking. Stopping in that state runs the whole pipeline to arrive at an
   * error about silence, which reads as the examiner being confused rather than
   * as the student having changed their mind. Discarding says the second thing.
   *
   * No error is shown afterwards. Deciding not to speak is not a failure.
   */
  function discard() {
    discarded.current = true;

    recorder.current?.cancel();
    recorder.current = null;
    live.current?.abandon();
    live.current = null;

    setRecording(false);
    setWorking(false);
    onWorkingChange?.(false);
    setLevel(0);
    setError('');
  }

  async function finish() {
    const active = recorder.current;
    recorder.current = null;
    setRecording(false);
    if (!active) return;

    setWorking(true);
    onWorkingChange?.(true);
    try {
      const { wav, seconds: length, peak } = await active.stop();
      setLevel(0);

      // A recording this short is a click, not an answer. Sending it spends a
      // model call to be told there was no speech in it.
      if (length < MIN_RECORDING_SECONDS) {
        live.current?.abandon();
        live.current = null;
        setError(dict.voice.empty);
        return;
      }

      // The microphone was open and produced nothing. Named plainly, because
      // the alternative is what happened before: the recording is sent, the
      // model hears silence, and the student is handed a word it invented.
      if (peak < SILENCE_PEAK) {
        live.current?.abandon();
        live.current = null;
        setError(dict.voice.silent);
        return;
      }

      // The streamed transcript when there is one, the whole recording when
      // there is not. A socket that produced nothing is not an error worth
      // showing: the fallback gives the same answer, a few seconds later.
      const streamed = live.current;
      live.current = null;

      if (streamed) {
        try {
          const text = await streamed.finish();
          if (discarded.current) return;
          if (text) {
            onTranscript(text);
            return;
          }
        } catch {
          // Fall through and upload it instead.
        }
      }

      const uploaded = await transcribe(wav, authedFetch);
      if (discarded.current) return;
      onTranscript(uploaded);
    } catch (caught) {
      // A discard tears the recorder and the socket down underneath this, so
      // whatever it threw is the consequence of a decision, not a fault.
      if (!discarded.current) {
        setError(caught instanceof Error ? caught.message : dict.voice.failed);
      }
    } finally {
      setWorking(false);
      onWorkingChange?.(false);
    }
  }

  // Counts through the transcription, not the recording. The student has
  // stopped speaking by then and is waiting on something they cannot see.
  useEffect(() => {
    if (!working) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [working]);

  useEffect(() => {
    if (!recording || seconds < MAX_RECORDING_SECONDS) return;
    void finish();
    // Fires on the tick that crosses the limit. Stopping clears `recording`,
    // so it cannot repeat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, seconds]);

  /**
   * Open the streaming socket, or decide to do without it.
   *
   * Never fatal. Every reason this can fail, from a refused credential to a
   * network that will not carry a WebSocket, ends the same way: the recording
   * is uploaded whole when the student stops, which is what happened before
   * streaming existed and still works. Losing four seconds is a far better
   * outcome than losing the answer.
   */
  async function openLive(): Promise<boolean> {
    if (!auth.user) return false;
    try {
      const [url, token] = await Promise.all([
        liveEndpoint(auth.authedFetch),
        auth.user.getIdToken(),
      ]);
      live.current = await openLiveTranscription(url, token);
      return true;
    } catch {
      live.current = null;
      return false;
    }
  }

  async function begin() {
    setError('');
    discarded.current = false;
    try {
      const streaming = await openLive();

      recorder.current = await startRecording({
        onLevel: setLevel,
        // Sent as it is captured, so the transcript is ready almost as soon as
        // the student stops rather than four seconds later.
        onChunk: streaming ? (pcm) => live.current?.send(pcm) : undefined,
      });
      setRecording(true);
    } catch {
      // Every failure here is the same thing from the student's side: no
      // microphone is available to them. Naming the browser's permission
      // dialog is more use than reporting which exception was raised.
      setError(dict.voice.denied);
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
        onClick={() => void (recording ? finish() : begin())}
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

      {/* Offered the whole time the microphone is open, and while a transcript
          is still being waited for. Deliberately quiet: it sits beside the
          action rather than competing with it, because stopping is the usual
          intent and discarding is the escape. */}
      {recording || working ? (
        <button
          type="button"
          onClick={discard}
          title={dict.voice.cancelHint}
          className="text-caption flex h-9 items-center gap-2 rounded-[var(--radius-action)] border border-[color:var(--color-line)] px-3 text-[color:var(--color-ink-600)] transition-colors duration-150 hover:border-[color:var(--color-danger)] hover:text-[color:var(--color-danger)]"
        >
          <Icon name="trash" size={15} />
          {dict.voice.cancel}
        </button>
      ) : null}

      {recording ? (
        <span className="text-micro flex items-center gap-2 text-[color:var(--color-danger)]">
          <span className="ai-pulse block h-[7px] w-[7px] rounded-[var(--radius-chip)] bg-[color:var(--color-danger)]" />
          <span className="tabular-nums">{fill(dict.ai.elapsed, { seconds })}</span>

          {/* What the microphone is actually giving us, while it gives it.
              A meter that never moves while somebody is speaking says more in
              two seconds than any error message can afterwards, and this
              feature has now failed twice in ways nothing on screen showed. */}
          <span
            aria-hidden="true"
            className="flex h-3 items-end gap-[2px]"
            title={dict.voice.level}
          >
            {[0.06, 0.14, 0.26, 0.42, 0.62].map((threshold) => (
              <span
                key={threshold}
                className={[
                  'block w-[3px] transition-[height,background-color] duration-100',
                  level >= threshold
                    ? 'bg-[color:var(--color-danger)]'
                    : 'bg-[color:var(--color-line)]',
                ].join(' ')}
                style={{ height: `${4 + threshold * 12}px` }}
              />
            ))}
          </span>
        </span>
      ) : null}

      {working ? (
        <span className="text-micro flex items-center gap-2 text-[color:var(--color-ai)]">
          <span className="flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="ai-pulse block h-[5px] w-[5px] rounded-[var(--radius-chip)] bg-[color:var(--color-ai)]"
                style={{ animationDelay: `${index * 160}ms` }}
              />
            ))}
          </span>
          <span className="tabular-nums">{fill(dict.ai.elapsed, { seconds: elapsed })}</span>
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
