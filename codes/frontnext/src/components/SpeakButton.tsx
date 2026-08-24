'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/Icon';
import type { Dictionary } from '@/lib/i18n';
import { speak } from '@/lib/speech';

interface Props {
  /** Examiner text, exactly as it stands in the transcript. */
  text: string;
  dict: Dictionary;
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
export function SpeakButton({ text, dict, autoPlay = false }: Props) {
  const { authedFetch } = useAuth();
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string>('');
  const played = useRef(false);

  useEffect(() => {
    return () => {
      audio.current?.pause();
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

    if (audio.current) {
      void audio.current.play().catch(() => setPlaying(false));
      setPlaying(true);
      return;
    }

    setBusy(true);
    try {
      const source = await speak(text, authedFetch);
      url.current = source;

      const element = new Audio(source);
      element.onended = () => setPlaying(false);
      element.onpause = () => setPlaying(false);
      element.onplay = () => setPlaying(true);
      audio.current = element;

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
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    setPlaying(false);
  }

  useEffect(() => {
    // Once only. A re-render must not restart a question a student is already
    // listening to, or one they deliberately stopped.
    if (!autoPlay || played.current) return;
    played.current = true;
    void play(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

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
