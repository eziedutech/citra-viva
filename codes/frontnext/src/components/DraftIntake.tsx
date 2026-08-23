'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AccountButton } from '@/components/AccountButton';
import { AiWorking } from '@/components/AiWorking';
import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/Icon';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { fill, type Dictionary, type Locale } from '@/lib/i18n';
import { SAMPLE_DRAFT_EN, SAMPLE_DRAFT_ID } from '@/lib/sample-draft';
import type { StartSessionResponse } from '@/lib/types';

const MIN_DRAFT_CHARS = 200;

/** How long each preparation stage tends to take before the next begins. */
const STAGE_INTERVAL_MS = 12_000;

interface Props {
  dict: Dictionary;
  locale: Locale;
}

export function DraftIntake({ dict, locale }: Props) {
  const router = useRouter();
  const auth = useAuth();
  const [draft, setDraft] = useState('');
  const [gaps, setGaps] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const length = draft.trim().length;
  const tooShort = length > 0 && length < MIN_DRAFT_CHARS;
  // Sign-in gates starting a defense, not reading the page. Someone who has
  // landed here should be able to see what the product is before deciding
  // whether to hand it their manuscript.
  const needsSignIn = auth.enabled && auth.ready && !auth.user;
  const canStart = length >= MIN_DRAFT_CHARS && !busy && !needsSignIn;

  async function start() {
    setBusy(true);
    setError('');
    setStage(0);
    timer.current = setInterval(() => {
      setStage((current) => Math.min(current + 1, dict.intake.stages.length - 1));
    }, STAGE_INTERVAL_MS);

    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_text: draft,
          recurring_gaps: gaps
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? dict.intake.failed);

      const started = data as StartSessionResponse;
      // The room reads the session from the API on load, so nothing needs to
      // survive the navigation. A refresh mid-defense loses nothing either.
      router.push(`/sesi/${started.session_id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.intake.failed);
      setBusy(false);
      if (timer.current) clearInterval(timer.current);
    }
  }

  return (
    <>
      <AiWorking active={busy} label={dict.intake.stages[stage]} dict={dict} reassure />

      <div className="mx-auto w-full max-w-[760px] px-6 py-16">
        <header className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[color:var(--color-primary-700)]">
              <Icon name="shield" size={20} />
              <span className="text-body-sm font-medium">{dict.app.name}</span>
            </div>
            <span className="flex items-center gap-3">
              <AccountButton dict={dict} />
              <LocaleSwitch locale={locale} dict={dict} />
            </span>
          </div>
          <h1 className="text-display mb-3">{dict.intake.heading}</h1>
          <p className="text-body-lg max-w-[60ch] text-[color:var(--color-ink-600)]">
            {dict.intake.lede}
          </p>
        </header>

        <section className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <label htmlFor="draft" className="text-body-sm font-medium">
              {dict.intake.draftLabel}
            </label>
            <span className="flex gap-4">
              <button
                type="button"
                onClick={() => setDraft(SAMPLE_DRAFT_EN)}
                disabled={busy}
                className="text-caption text-[color:var(--color-primary-700)] underline underline-offset-2 disabled:text-[color:var(--color-ink-400)]"
              >
                {dict.intake.sampleEnglish}
              </button>
              <button
                type="button"
                onClick={() => setDraft(SAMPLE_DRAFT_ID)}
                disabled={busy}
                className="text-caption text-[color:var(--color-primary-700)] underline underline-offset-2 disabled:text-[color:var(--color-ink-400)]"
              >
                {dict.intake.sampleIndonesian}
              </button>
            </span>
          </div>

          <textarea
            id="draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
            rows={14}
            spellCheck={false}
            placeholder={dict.intake.draftPlaceholder}
            className="text-editor w-full resize-y border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 font-[family-name:var(--font-serif)] outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
          />

          <p className="text-caption mt-2 text-[color:var(--color-ink-600)]">
            {length.toLocaleString(locale)} {dict.intake.characters}
            {tooShort ? ` · ${fill(dict.intake.tooShort, { min: MIN_DRAFT_CHARS })}` : ''}
          </p>

          <div className="mt-6 border-t border-[color:var(--color-line)] pt-5">
            <label htmlFor="gaps" className="text-body-sm mb-1 block font-medium">
              {dict.intake.gapsLabel}
              <span className="ml-2 font-normal text-[color:var(--color-ink-600)]">
                {dict.intake.optional}
              </span>
            </label>
            <p className="text-caption mb-2 max-w-[60ch] text-[color:var(--color-ink-600)]">
              {dict.intake.gapsHelp}
            </p>
            <textarea
              id="gaps"
              value={gaps}
              onChange={(event) => setGaps(event.target.value)}
              disabled={busy}
              rows={3}
              className="text-body-sm w-full resize-y border border-[color:var(--color-line)] p-3 outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
            />
          </div>
        </section>

        {error ? (
          <p
            role="alert"
            className="text-body-sm mt-4 flex items-start gap-2 border border-[color:var(--color-danger)] bg-[color:var(--color-tint-danger)] p-3 text-[color:var(--color-danger)]"
          >
            <Icon name="alert" size={18} className="mt-[2px] shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}

        {needsSignIn ? (
          <section className="mt-6 border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
            <h2 className="text-h3 mb-2">{dict.auth.required}</h2>
            <p className="text-body-sm mb-4 max-w-[60ch] text-[color:var(--color-ink-600)]">
              {dict.auth.requiredHelp}
            </p>
            <button
              type="button"
              onClick={() => void auth.signIn()}
              className="text-body-sm h-10 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)]"
            >
              {dict.auth.signIn}
            </button>
          </section>
        ) : null}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => void start()}
            disabled={!canStart}
            className="text-body-sm h-10 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
          >
            {busy ? dict.intake.starting : dict.intake.start}
          </button>
        </div>
      </div>
    </>
  );
}
