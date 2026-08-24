'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/Icon';
import type { Dictionary } from '@/lib/i18n';
import { audioUrlFrom, speak } from '@/lib/speech';

interface Props {
  /** Examiner text, exactly as it stands in the transcript. */
  text: string;
  dict: Dictionary;
  /**
   * Audio that arrived with the turn, base64. When it is here there is nothing
   * to fetch and nothing to wait for: the voice starts as the words appear.
   */
  audio?: { base64: string; mime: string } | null;
  /** Speak as soon as this turn appears, for a student running hands free. */
  autoPlay?: boolean;
}

/**
 * The examiner's question, read aloud.
 *
 * The audio is synthesised from the text already in the transcript, never
 * generated a second time, so what a student hears and what the record shows
 * cannot come apart. It is fetched once per turn and kept: a student replaying
 * a question they did not catch should not wait through a second round trip,
 * and should not pay for one either.
 */
export function SpeakButton({ text, dict, audio = null, autoPlay = false }: Props) {
  const auth = useAuth();
  const { authedFetch } = auth;
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const player = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string>('');
  const played = useRef(false);

  useEffect(() => {
    return () => {
      player.current?.pause();
      // An object URL pins its blob for the life of the document, and a
      // defense plays many of these.
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);

  /**
   * @param automatic Started by the page rather than by the reader.
   *
   * A browser refuses to play audio until the reader has interacted with the
   * document, and arriving on a fresh page counts as no interaction. That
   * refusal is expected on the first question of a session and is not a fault
   * worth reporting: the button is right there, and pressing it both plays the
   * question and grants the permission every later question needs.
   */
  async function play(automatic = false) {
    setError('');

    if (player.current) {
      void player.current.play().catch(() => setPlaying(false));
      setPlaying(true);
      return;
    }

    setBusy(true);
    try {
      // Made during the wait the student already had, so there is no second
      // one here. Fetching is the fallback for a turn that arrived without it.
      const source = audio?.base64
        ? audioUrlFrom(audio.base64, audio.mime)
        : await speak(text, authedFetch);
      url.current = source;

      const element = new Audio(source);
      element.onended = () => setPlaying(false);
      element.onpause = () => setPlaying(false);
      element.onplay = () => setPlaying(true);
      player.current = element;

      await element.play();
    } catch (caught) {
      const blocked = caught instanceof DOMException && caught.name === 'NotAllowedError';
      if (automatic && blocked) {
        setPlaying(false);
      } else {
        setError(caught instanceof Error ? caught.message : dict.voice.playFailed);
      }
    } finally {
      setBusy(false);
    }
  }

  function stop() {
    player.current?.pause();
    if (player.current) player.current.currentTime = 0;
    setPlaying(false);
  }

  // Waits for the credential, not just for the user.
  //
  // Reading aloud is on by default, so the first question asks to be spoken the
  // moment the room appears. Firebase resolves who this is in the browser and
  // only then posts the token to the server, and asking in between produced a
  // 401 for a student who was plainly signed in.
  const ready = !auth.enabled || (auth.ready && Boolean(auth.user) && auth.sessionReady);

  useEffect(() => {
    // Once only. A re-render must not restart a question a student is already
    // listening to, or one they deliberately stopped.
    if (!autoPlay || !ready || played.current) return;
    played.current = true;
    void play(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, ready]);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => (playing ? stop() : void play())}
        disabled={busy}
        aria-label={playing ? dict.voice.stopPlaying : dict.voice.play}
        className="flex h-6 items-center gap-1 rounded-[var(--radius-action)] px-1 text-[color:var(--color-ai)] transition-colors duration-150 hover:bg-[color:var(--color-tint-ai)] disabled:text-[color:var(--color-ink-400)]"
      >
        <Icon name={playing ? 'square' : 'speaker'} size={15} />
        <span className="text-micro">
          {busy ? dict.voice.loading : playing ? dict.voice.stopPlaying : dict.voice.play}
        </span>
      </button>

      {error ? (
        <span role="alert" className="text-micro text-[color:var(--color-danger)]">
          {error}
        </span>
      ) : null}
    </span>
  );
}
