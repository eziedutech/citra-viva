'use client';

import { useEffect, useState } from 'react';

import { AgentOverlay } from '@/components/AgentOverlay';
import { AiWorking } from '@/components/AiWorking';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/components/AuthProvider';
import { Hint } from '@/components/Hint';
import { Icon } from '@/components/Icon';
import type { Dictionary, Locale } from '@/lib/i18n';
import type { ClaimSupportResult, SupportVerdict } from '@/lib/types';

const SAMPLE = {
  claim: 'Social media use lowers the academic performance of university students.',
  title: 'Social media use and academic performance among undergraduates',
  authors: 'Vermeer and Hartono',
  year: '2019',
  doi: '10.1234/example.2019',
  text:
    'This cross-sectional survey examined social media use among 1,204 undergraduate ' +
    'students at four universities in the Netherlands during 2019. Self-reported daily ' +
    'usage was negatively associated with grade point average (r = -0.18, p < .01). ' +
    'The design does not permit causal inference, and the sample was limited to ' +
    'students aged 18 to 24.',
};

/**
 * A verdict is a statement about someone's citation, so the colour has to match
 * how much is actually being asserted. Amber for a real problem rather than
 * red, which is reserved for what is proven or blocking, and grey for
 * `cannot_tell`, which asserts nothing at all.
 */
function verdictTone(verdict: SupportVerdict): string {
  if (verdict === 'supports') {
    return 'border-[color:var(--color-success)] bg-[color:var(--color-tint-ok)] text-[color:var(--color-success)]';
  }
  if (verdict === 'cannot_tell') {
    return 'border-[color:var(--color-line)] bg-[color:var(--color-primary-050)] text-[color:var(--color-ink-600)]';
  }
  return 'border-[color:var(--color-warning)] bg-[color:var(--color-tint-warn)] text-[color:var(--color-warning)]';
}

interface Props {
  dict: Dictionary;
  locale: Locale;
}

export function ClaimChecker({ dict, locale }: Props) {
  const { authedFetch } = useAuth();
  const [claim, setClaim] = useState('');
  const [source, setSource] = useState({ title: '', authors: '', year: '', doi: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ClaimSupportResult | null>(null);

  // Signing out clears the screen here too. What is on it is a passage from
  // someone's manuscript and a judgment about their citation, and leaving it
  // for whoever sits down next is the same mistake as leaving a defense open.
  const { ready: authReady, enabled: authEnabled, user } = useAuth();
  useEffect(() => {
    if (!authEnabled || !authReady || user) return;
    setClaim('');
    setSource({ title: '', authors: '', year: '', doi: '', text: '' });
    setResult(null);
    setError('');
  }, [authEnabled, authReady, user]);

  const ready = claim.trim().length >= 15 && source.text.trim().length > 0 && !busy;

  async function check() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await authedFetch('/api/claims/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim, source }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? dict.claims.failed);
      setResult(data as ClaimSupportResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.claims.failed);
    } finally {
      setBusy(false);
    }
  }

  function field(label: string, key: 'title' | 'authors' | 'year' | 'doi') {
    return (
      <label className="block">
        <span className="text-caption mb-1 block text-[color:var(--color-ink-600)]">{label}</span>
        <input
          value={source[key]}
          onChange={(event) => setSource({ ...source, [key]: event.target.value })}
          disabled={busy}
          className="text-body-sm h-10 w-full border border-[color:var(--color-line)] px-3 outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
        />
      </label>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader dict={dict} locale={locale} current="claims" />
      <AiWorking active={busy} label={dict.claims.checking} dict={dict} />
      <AgentOverlay active={busy} stage="citation" dict={dict} />

      <div className="flex-1">
        <section className="border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
          <div className="mx-auto w-full max-w-[880px] px-6 pt-12 pb-10">
            <h1 className="text-display mb-4 max-w-[28ch]">{dict.claims.heading}</h1>
            <p className="text-body-lg max-w-[64ch] text-[color:var(--color-ink-600)]">
              {dict.claims.lede}
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[880px] px-6 py-10">
          <section className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <span className="inline-flex items-center gap-[6px]">
                <label htmlFor="claim" className="text-body-sm font-medium">
                  {dict.claims.claimLabel}
                </label>
                <Hint text={dict.claims.hints.claim} />
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setClaim(SAMPLE.claim);
                  setSource({
                    title: SAMPLE.title,
                    authors: SAMPLE.authors,
                    year: SAMPLE.year,
                    doi: SAMPLE.doi,
                    text: SAMPLE.text,
                  });
                }}
                className="text-caption text-[color:var(--color-primary-700)] underline underline-offset-2 disabled:text-[color:var(--color-ink-400)]"
              >
                {dict.claims.useSample}
              </button>
            </div>
            <textarea
              id="claim"
              value={claim}
              onChange={(event) => setClaim(event.target.value)}
              disabled={busy}
              rows={2}
              placeholder={dict.claims.claimPlaceholder}
              className="text-editor w-full resize-y border border-[color:var(--color-line)] p-3 font-[family-name:var(--font-serif)] outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
            />

            <div className="mt-6 border-t border-[color:var(--color-line)] pt-5">
              <h2 className="text-body-sm mb-3 flex items-center gap-[6px] font-medium">
                {dict.claims.sourceLabel}
                <Hint text={dict.claims.hints.source} />
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {field(dict.claims.titleLabel, 'title')}
                {field(dict.claims.authorsLabel, 'authors')}
                {field(dict.claims.yearLabel, 'year')}
                {field(dict.claims.doiLabel, 'doi')}
              </div>

              <label className="mt-4 block">
                <span className="text-caption mb-1 flex items-center gap-[6px] text-[color:var(--color-ink-600)]">
                  {dict.claims.abstractLabel}
                  <Hint text={dict.claims.hints.abstract} />
                </span>
                <textarea
                  value={source.text}
                  onChange={(event) => setSource({ ...source, text: event.target.value })}
                  disabled={busy}
                  rows={7}
                  className="text-body-sm w-full resize-y border border-[color:var(--color-line)] p-3 outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
                />
              </label>
              <p className="text-caption mt-1 max-w-[64ch] text-[color:var(--color-ink-600)]">
                {dict.claims.abstractHelp}
              </p>
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

          {result ? (
            <section className="mt-8 border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
              <p className="text-micro mb-3 flex items-center gap-[6px] text-[color:var(--color-ai)]">
                <Icon name="cpu" size={16} />
                {dict.claims.verdictLabel}
                <Hint text={dict.claims.hints.verdict} />
              </p>

              <p
                className={`text-body-sm mb-4 border-l-2 px-3 py-2 font-medium ${verdictTone(result.check.verdict)}`}
              >
                {dict.claims.verdicts[result.check.verdict] ?? result.check.verdict}
              </p>

              {result.check.reasoning ? (
                <section className="mb-4">
                  <h3 className="text-caption mb-1 font-medium text-[color:var(--color-ink-600)]">
                    {dict.claims.reasoning}
                  </h3>
                  <p className="text-body-sm">{result.check.reasoning}</p>
                </section>
              ) : null}

              {result.check.source_quote ? (
                <section className="mb-4">
                  <h3 className="text-caption mb-1 flex items-center gap-[6px] font-medium text-[color:var(--color-ink-600)]">
                    {dict.claims.passage}
                    <Hint text={dict.claims.hints.passage} />
                  </h3>
                  <blockquote className="border-l-2 border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-050)] py-2 pl-3">
                    <p className="text-body-sm font-[family-name:var(--font-serif)]">
                      {result.check.source_quote}
                    </p>
                    {result.check.quote_verified ? (
                      <p className="text-micro mt-2 flex items-center gap-[6px] text-[color:var(--color-success)]">
                        <Icon name="check" size={14} />
                        {dict.claims.quoteVerified}
                      </p>
                    ) : null}
                  </blockquote>
                </section>
              ) : null}

              {result.check.scope_mismatch ? (
                <section className="mb-4">
                  <h3 className="text-caption mb-1 font-medium text-[color:var(--color-warning)]">
                    {dict.claims.scopeMismatch}
                  </h3>
                  <p className="text-body-sm">{result.check.scope_mismatch}</p>
                </section>
              ) : null}

              {result.check.question_for_author ? (
                <section className="mb-4">
                  <h3 className="text-caption mb-1 flex items-center gap-[6px] font-medium">
                    {dict.claims.question}
                    <Hint text={dict.claims.hints.question} />
                  </h3>
                  <p className="text-body-sm font-[family-name:var(--font-serif)]">
                    {result.check.question_for_author}
                  </p>
                </section>
              ) : null}

              {result.adjustments.length > 0 ? (
                <section className="border-t border-[color:var(--color-line)] pt-3">
                  <h3 className="text-micro mb-1 font-medium text-[color:var(--color-ink-600)]">
                    {dict.claims.adjustments}
                  </h3>
                  <ul className="text-caption space-y-1 text-[color:var(--color-ink-600)]">
                    {result.adjustments.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </section>
          ) : null}

          <p className="text-caption mt-8 max-w-[64ch] text-[color:var(--color-ink-400)]">
            {dict.claims.disclosure}
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div className="mx-auto flex w-full max-w-[880px] items-center justify-end gap-3 px-6 py-3">
          <Hint text={dict.claims.hints.verdict} side="top" align="end" />
          <button
            type="button"
            onClick={() => void check()}
            disabled={!ready}
            className="text-body-sm h-10 shrink-0 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
          >
            {busy ? dict.claims.checking : dict.claims.check}
          </button>
        </div>
      </div>
    </div>
  );
}
