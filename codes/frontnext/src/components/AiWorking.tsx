'use client';

import { useEffect, useState } from 'react';

import { Icon } from '@/components/Icon';
import { fill, type Dictionary } from '@/lib/i18n';

interface Props {
  active: boolean;
  /** What the agent is doing right now, in plain words. */
  label: string;
  dict: Dictionary;
  /** Show the reassurance that nothing is lost by waiting. */
  reassure?: boolean;
}

/**
 * The signal that an agent is working.
 *
 * This exists because of a real complaint: a turn takes thirty to fifty
 * seconds, the only indication was one line of small text inside a scrolling
 * transcript, and a person who scrolled away or switched tabs had no way to
 * know anything was happening. They went and did something else, which is
 * exactly what a good progress indicator prevents.
 *
 * Three things carry the signal, deliberately:
 *
 *   1. A bar that does not scroll away, so it cannot be lost behind content.
 *   2. An elapsed counter. A number that keeps moving is the difference
 *      between "working" and "hung", and it is honest about the wait rather
 *      than pretending it is short.
 *   3. The tab title. A person who switches away is the case that prompted
 *      this, and the title is the only surface still visible to them.
 *
 * The label names the work rather than saying "loading". A blind spinner for
 * fifty seconds reads as a broken page.
 */
export function AiWorking({ active, label, dict, reassure = false }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const original = document.title;
    document.title = `${label} · ${dict.app.name}`;
    return () => {
      document.title = original;
    };
  }, [active, label, dict.app.name]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 border-b border-[color:var(--color-ai)] bg-[color:var(--color-tint-ai)] px-5 py-2 text-[color:var(--color-ai)]"
    >
      <Icon name="cpu" size={18} />
      <span className="text-body-sm font-medium">{label}</span>

      {/* A pulse, not a spinner. Motion here means "still alive", and the
          elapsed count beside it carries the actual information. Reduced
          motion settings flatten the animation, and nothing is lost. */}
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="ai-pulse block h-[5px] w-[5px] rounded-[var(--radius-chip)] bg-[color:var(--color-ai)]"
            style={{ animationDelay: `${index * 160}ms` }}
          />
        ))}
      </span>

      <span className="text-caption tabular-nums">
        {fill(dict.ai.elapsed, { seconds })}
      </span>

      {reassure ? (
        <span className="text-caption ml-auto hidden text-[color:var(--color-ink-600)] md:block">
          {dict.ai.doNotClose}
        </span>
      ) : null}
    </div>
  );
}
