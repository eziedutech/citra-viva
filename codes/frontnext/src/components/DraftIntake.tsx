'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AgentOverlay, INTAKE_FLOW } from '@/components/AgentOverlay';
import { AiWorking } from '@/components/AiWorking';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/components/AuthProvider';
import { Hint } from '@/components/Hint';
import { Icon } from '@/components/Icon';
import { fill, type Dictionary, type Locale } from '@/lib/i18n';
import { holdOpeningAudio } from '@/lib/opening-audio';
import { SAMPLE_DRAFT_EN, SAMPLE_DRAFT_ID } from '@/lib/sample-draft';
import type { SessionDigest, SessionHistory, StartSessionResponse } from '@/lib/types';

const MIN_DRAFT_CHARS = 200;

/**
 * The same two limits the API enforces, checked here as well.
 *
 * Not a substitute for the server's check, which is the one that matters, but
 * the difference between being told immediately and being told after uploading
 * ten megabytes and waiting for a round trip.
 */
const MAX_DRAFT_CHARS = 400_000;
const MAX_FILE_MB = 10;

/** How long each preparation stage tends to take before the next begins. */
const STAGE_INTERVAL_MS = 12_000;

interface Props {
  dict: Dictionary;
  locale: Locale;
  /**
   * Inside the signed-in workspace, where the surrounding shell already carries
   * the brand, the account, and the navigation. The pitch goes with them: a
   * person who has signed in has already been persuaded.
   */
  embedded?: boolean;
}

export function DraftIntake({ dict, locale, embedded = false }: Props) {
  const router = useRouter();
  const auth = useAuth();
  const [draft, setDraft] = useState('');
  const [gaps, setGaps] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [source, setSource] = useState<{ name: string; pages: number; notes: string[] } | null>(
    null,
  );
  const [carry, setCarry] = useState<SessionDigest | null>(null);
  const [carried, setCarried] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  /**
   * What the last finished session concluded should be tested first.
   *
   * This is the memory that makes the thing a partner rather than a tool. It
   * was produced at the end of every session and accepted at the start of the
   * next one, and between the two sat a copy and paste that nobody performs, so
   * the best feature in the product almost never ran. Offered rather than
   * filled in silently: a student may want a clean examination, and quietly
   * changing what gets tested is not a decision to make for them.
   */
  useEffect(() => {
    if (auth.enabled && (!auth.ready || !auth.user || !auth.sessionReady)) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await auth.authedFetch('/api/sessions/history');
        if (!response.ok) return;
        const rows = ((await response.json()) as SessionHistory).sessions ?? [];
        const latest = rows.find((row) => (row.recurring_gap_patterns ?? []).length > 0);
        if (!cancelled && latest) setCarry(latest);
      } catch {
        // A missing carry-forward costs the student one paste. It is not worth
        // an error message on a page they came here to type into.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth]);

  const length = draft.trim().length;
  const tooShort = length > 0 && length < MIN_DRAFT_CHARS;
  const tooLong = length > MAX_DRAFT_CHARS;
  // Sign-in gates starting a defense, not reading the page. Someone who has
  // landed here should be able to see what the product is before deciding
  // whether to hand it their manuscript.
  const needsSignIn = auth.enabled && auth.ready && !auth.user;
  const canStart = length >= MIN_DRAFT_CHARS && !tooLong && !busy && !needsSignIn;

  async function upload(file: File) {
    const megabytes = file.size / (1024 * 1024);
    if (megabytes > MAX_FILE_MB) {
      setError(
        fill(dict.limits.fileTooLarge, {
          size: megabytes.toFixed(1),
          max: MAX_FILE_MB,
        }),
      );
      return;
    }

    setReading(true);
    setError('');
    setSource(null);
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      const response = await auth.authedFetch('/api/drafts/extract', {
        method: 'POST',
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? dict.intake.uploadFailed);

      // The text goes into the editable field rather than straight into a
      // session. What the analyzer reads has to be what the student saw.
      setDraft(data.text);
      setSource({ name: file.name, pages: data.page_count ?? 0, notes: data.notes ?? [] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.intake.uploadFailed);
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function start() {
    setBusy(true);
    setError('');
    setStage(0);
    timer.current = setInterval(() => {
      setStage((current) => Math.min(current + 1, dict.intake.stages.length - 1));
    }, STAGE_INTERVAL_MS);

    try {
      const response = await auth.authedFetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_text: draft,
          // The opening is spoken during the wait the student is already
          // having, so the first question is heard the moment it is read.
          speak: true,
          recurring_gaps: gaps
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? dict.intake.failed);

      const started = data as StartSessionResponse;
      if (started.audio_base64) {
        holdOpeningAudio(started.session_id, started.audio_base64, started.audio_mime ?? '');
      }
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
    <div className={embedded ? 'flex min-h-full flex-col' : 'flex min-h-dvh flex-col'}>
      {embedded ? null : <AppHeader dict={dict} locale={locale} current="defense" />}
      <AiWorking
        active={busy || reading}
        label={reading ? dict.intake.uploading : dict.intake.stages[stage]}
        dict={dict}
        reassure
      />
      <AgentOverlay
        active={busy || reading}
        stage={reading ? 'extracting' : (INTAKE_FLOW[stage] ?? 'reading')}
        steps={reading ? undefined : INTAKE_FLOW}
        dict={dict}
      />

      <div className="flex-1">
        <div className="mx-auto w-full max-w-[1120px] px-6 pt-8">
          <h1 className="text-h1 mb-1 flex items-start gap-2">
            <span>{dict.intake.heading}</span>
            <Hint text={dict.intake.hints.heading} className="mt-[6px]" />
          </h1>
          <Link
            href="/panduan"
            className="text-caption text-[color:var(--color-primary-700)] underline underline-offset-2"
          >
            {dict.guide.heading}
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[1120px] px-6 py-8">
          <section className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <span className="inline-flex items-center gap-[6px]">
                <label htmlFor="draft" className="text-body-sm font-medium">
                  {dict.intake.draftLabel}
                </label>
                <Hint text={dict.intake.hints.draft} />
              </span>

              <span className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={busy || reading}
                  className="text-caption flex items-center gap-[6px] rounded-[var(--radius-action)] border border-[color:var(--color-line)] px-3 py-1 transition-colors duration-150 hover:bg-[color:var(--color-hover)] disabled:text-[color:var(--color-ink-400)]"
                >
                  <Icon name="file" size={16} />
                  {reading ? dict.intake.uploading : dict.intake.upload}
                </button>
                <Hint text={dict.intake.hints.upload} align="end" />

                <span className="h-4 w-px bg-[color:var(--color-line)]" />

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
                <Hint text={dict.intake.hints.samples} align="end" />
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

            {source ? (
              <div className="text-caption mt-2 border-l-2 border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-050)] py-2 pl-3">
                <p className="font-medium">
                  {fill(dict.intake.uploadedFrom, { name: source.name })}
                  {source.pages
                    ? ` · ${fill(dict.intake.uploadedPages, { count: source.pages })}`
                    : ''}
                </p>
                <p className="mt-1 text-[color:var(--color-ink-600)]">
                  {dict.intake.reviewExtracted}
                </p>
                {source.notes.map((note) => (
                  <p key={note} className="mt-1 text-[color:var(--color-ink-600)]">
                    {note}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-6 border-t border-[color:var(--color-line)] pt-5">
              <span className="mb-1 flex items-center gap-[6px]">
                <label htmlFor="gaps" className="text-body-sm font-medium">
                  {dict.intake.gapsLabel}
                  <span className="ml-2 font-normal text-[color:var(--color-ink-600)]">
                    {dict.intake.optional}
                  </span>
                </label>
                <Hint text={dict.intake.hints.gaps} />
              </span>
              <p className="text-caption mb-2 max-w-[64ch] text-[color:var(--color-ink-600)]">
                {dict.intake.gapsHelp}
              </p>

              {carry ? (
                <section className="mb-3 border-l-2 border-[color:var(--color-ai)] bg-[color:var(--color-tint-ai)] px-4 py-3">
                  <h3 className="text-caption mb-1 flex items-center gap-[6px] font-medium text-[color:var(--color-ai)]">
                    <Icon name="history" size={15} />
                    {dict.carry.title}
                  </h3>
                  <p className="text-caption mb-2 max-w-[64ch] text-[color:var(--color-ink-600)]">
                    {dict.carry.lede}
                  </p>
                  <ul className="text-caption mb-3 space-y-1">
                    {carry.recurring_gap_patterns.map((pattern) => (
                      <li key={pattern} className="border-l-2 border-[color:var(--color-line)] pl-3">
                        {pattern}
                      </li>
                    ))}
                  </ul>
                  <span className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={busy || carried}
                      onClick={() => {
                        setGaps((current) =>
                          [current.trim(), carry.recurring_gap_patterns.join('\n')]
                            .filter(Boolean)
                            .join('\n'),
                        );
                        setCarried(true);
                      }}
                      className="text-caption h-8 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-3 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
                    >
                      {carried ? dict.carry.added : dict.carry.action}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCarry(null)}
                      className="text-caption text-[color:var(--color-ink-600)] underline underline-offset-2"
                    >
                      {dict.carry.dismiss}
                    </button>
                  </span>
                </section>
              ) : null}
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
            <p className="text-body-sm mt-6 border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 text-[color:var(--color-ink-600)]">
              {dict.auth.requiredHelp}
            </p>
          ) : null}
        </div>
      </div>

      {/* Pinned, for the same reason the answer box in the defense room is
          pinned: the control that moves you forward should not have to be
          scrolled back to after a long manuscript has been pasted in. */}
      <div className="sticky bottom-0 z-30 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-[1120px] items-center gap-4 px-6 py-3">
          <p className="text-caption text-[color:var(--color-ink-600)]">
            <span className="tabular-nums">{length.toLocaleString(locale)}</span>{' '}
            {dict.intake.characters}
            {tooShort ? (
              <span className="text-[color:var(--color-warning)]">
                {' · '}
                {fill(dict.intake.tooShort, { min: MIN_DRAFT_CHARS })}
              </span>
            ) : null}
            {tooLong ? (
              <span className="text-[color:var(--color-danger)]">
                {' · '}
                {fill(dict.limits.tooLong, {
                  count: length.toLocaleString(locale),
                  max: MAX_DRAFT_CHARS.toLocaleString(locale),
                })}
              </span>
            ) : null}
          </p>

          <span className="ml-auto flex items-center gap-3">
            <Hint text={dict.intake.hints.start} side="top" align="end" />
            <button
              type="button"
              onClick={() => void start()}
              disabled={!canStart}
              className="text-body-sm flex h-10 items-center gap-2 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
            >
              {busy ? dict.intake.starting : dict.intake.start}
              <Icon name="send" size={16} />
            </button>
          </span>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
