'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/Icon';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { Wordmark } from '@/components/Wordmark';
import type { Dictionary, Locale } from '@/lib/i18n';

/** The parent product. Not translated: an address is an address. */
const CITRA_URL = 'https://citra.eziedutech.dev';

/**
 * What this product does, drawn once.
 *
 * A manuscript with three sentences marked, and an examiner reaching for those
 * three and no others. That is the entire product in one picture: the pressure
 * is aimed at specific sentences a person actually wrote, which is also the
 * rule the system enforces in code.
 *
 * Deliberately still. Everything else on this page is asking someone to read,
 * and an illustration that moves would compete with the text for the only
 * attention available. Two colours: ink for what the student wrote, purple for
 * what the machine contributed, the same division the whole interface keeps.
 */
function Illustration() {
  const rows = [
    { y: 74, width: 176 },
    { y: 94, width: 152 },
    { y: 114, width: 184 },
    { y: 134, width: 128 },
    { y: 154, width: 172 },
    { y: 174, width: 160 },
    { y: 194, width: 180 },
    { y: 214, width: 140 },
    { y: 234, width: 168 },
    { y: 254, width: 96 },
  ];
  const marked = [2, 5, 8];
  const nodeX = 424;

  return (
    <svg
      viewBox="0 0 512 320"
      className="h-auto w-full max-w-[520px]"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* The page behind, so the drawing reads as a manuscript rather than a
          single sheet of paper. */}
      <rect
        x="52"
        y="18"
        width="212"
        height="272"
        fill="var(--color-primary-050)"
        stroke="var(--color-line)"
      />

      <rect
        x="36"
        y="32"
        width="212"
        height="272"
        fill="var(--color-surface)"
        stroke="var(--color-line)"
      />

      {/* A heading, then body text. The proportions of a page, not of a form. */}
      <rect x="58" y="52" width="104" height="5" fill="var(--color-ink-400)" />

      {rows.map((row, index) => (
        <rect
          key={row.y}
          x="58"
          y={row.y}
          width={row.width}
          height="4"
          fill={marked.includes(index) ? 'var(--color-ai)' : 'var(--color-line)'}
        />
      ))}

      {marked.map((index, order) => {
        const from = rows[index];
        const y = from.y + 2;
        const nodeY = 96 + order * 76;

        return (
          <g key={from.y}>
            <path
              d={`M ${58 + from.width + 10} ${y} C ${300} ${y}, ${348} ${nodeY}, ${nodeX - 20} ${nodeY}`}
              stroke="var(--color-ai)"
              strokeWidth="1.25"
              strokeDasharray="3 4"
              opacity="0.7"
            />
            <circle
              cx={nodeX}
              cy={nodeY}
              r="15"
              fill="var(--color-tint-ai)"
              stroke="var(--color-ai)"
              strokeWidth="1.25"
            />
            <circle cx={nodeX} cy={nodeY} r="4.5" fill="var(--color-ai)" />
          </g>
        );
      })}

      {/* The line joining the three probes: one examination, planned in order,
          rather than three unrelated remarks. */}
      <path
        d={`M ${nodeX} 111 L ${nodeX} 157 M ${nodeX} 187 L ${nodeX} 233`}
        stroke="var(--color-ai)"
        strokeWidth="1.25"
        opacity="0.35"
      />
    </svg>
  );
}

interface Props {
  dict: Dictionary;
  locale: Locale;
}

/**
 * The page a visitor meets before signing in.
 *
 * Two columns on a wide screen: what the product is on the left, the way in on
 * the right. On a narrow screen the sign-in panel comes first, because someone
 * who already knows what this is should not have to scroll past the pitch to
 * reach the button.
 */
export function PublicLanding({ dict, locale }: Props) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signIn() {
    setBusy(true);
    setError('');
    try {
      await auth.signIn();
    } catch {
      setError(dict.auth.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center px-6">
          <Wordmark height={26} />
          <span className="ml-auto flex items-center gap-4">
            <Link
              href="/panduan"
              className="text-caption text-[color:var(--color-ink-600)] transition-colors duration-150 hover:text-[color:var(--color-ink-900)]"
            >
              {dict.guide.nav}
            </Link>
            <LocaleSwitch locale={locale} dict={dict} />
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 lg:grid-cols-[1fr_minmax(360px,400px)]">
          {/* Ordered second on a narrow screen and first on a wide one, so the
              way in is at the top of a phone and beside the pitch on a laptop. */}
          <section className="order-2 px-6 py-12 lg:order-1 lg:py-16 lg:pr-12">
            <p className="text-micro mb-4 flex items-center gap-[6px] tracking-[0.06em] text-[color:var(--color-ai)] uppercase">
              <Icon name="cpu" size={14} />
              {dict.landing.eyebrow}
            </p>

            <h1 className="text-display mb-4 max-w-[20ch]">{dict.intake.heading}</h1>

            <p className="text-body-lg max-w-[56ch] text-[color:var(--color-ink-600)]">
              {dict.app.tagline}
            </p>

            <div className="my-10">
              <Illustration />
            </div>

            <ol className="grid gap-px border border-[color:var(--color-line)] bg-[color:var(--color-line)] sm:grid-cols-3">
              {dict.landing.steps.map((step, index) => (
                <li key={step.title} className="bg-[color:var(--color-surface)] p-4">
                  <p className="text-micro mb-2 text-[color:var(--color-ink-400)] tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h2 className="text-body-sm font-medium">{step.title}</h2>
                </li>
              ))}
            </ol>

            <p className="text-caption mt-6 max-w-[72ch] border-l-2 border-[color:var(--color-ai)] bg-[color:var(--color-tint-ai)] px-4 py-3 text-[color:var(--color-ink-600)]">
              <span className="font-medium text-[color:var(--color-ai)]">
                {dict.landing.promiseTitle}.{' '}
              </span>
              {dict.landing.promise}
            </p>

            <Link
              href="/panduan"
              className="text-caption mt-4 inline-flex items-center gap-[6px] text-[color:var(--color-primary-700)] underline underline-offset-2"
            >
              {dict.guide.heading}
            </Link>

            <section className="mt-6 max-w-[72ch] border-t border-[color:var(--color-line)] pt-6">
              <h2 className="text-body-sm mb-2 font-medium">{dict.landing.familyTitle}</h2>
              <p className="text-caption text-[color:var(--color-ink-600)]">
                {dict.landing.family}
              </p>
              <a
                href={CITRA_URL}
                target="_blank"
                rel="noreferrer"
                className="text-caption mt-3 inline-flex items-center gap-[6px] text-[color:var(--color-primary-700)] underline underline-offset-2"
              >
                {dict.landing.familyLink}
                <Icon name="external" size={14} />
              </a>
            </section>
          </section>

          <aside className="order-1 border-[color:var(--color-line)] bg-[color:var(--color-surface)] lg:order-2 lg:border-l">
            <div className="px-6 py-12 lg:sticky lg:top-0 lg:py-16">
              <h2 className="text-h2 mb-3">{dict.landing.signInTitle}</h2>
              <p className="text-body-sm mb-6 text-[color:var(--color-ink-600)]">
                {dict.landing.signInBody}
              </p>

              {auth.enabled ? (
                <button
                  type="button"
                  onClick={() => void signIn()}
                  disabled={busy || !auth.ready}
                  className="text-body-sm flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
                >
                  {busy ? dict.auth.signingIn : dict.auth.signIn}
                </button>
              ) : (
                <p className="text-body-sm border border-[color:var(--color-line)] bg-[color:var(--color-primary-050)] p-3 text-[color:var(--color-ink-600)]">
                  {dict.landing.signInUnavailable}
                </p>
              )}

              {error ? (
                <p
                  role="alert"
                  className="text-body-sm mt-4 flex items-start gap-2 border border-[color:var(--color-danger)] bg-[color:var(--color-tint-danger)] p-3 text-[color:var(--color-danger)]"
                >
                  <Icon name="alert" size={18} className="mt-[2px] shrink-0" />
                  <span>{error}</span>
                </p>
              ) : null}

              <p className="text-caption mt-6 flex items-start gap-2 border-t border-[color:var(--color-line)] pt-6 text-[color:var(--color-ink-600)]">
                <Icon name="lock" size={16} className="mt-[2px] shrink-0" />
                <span>{dict.landing.signInPrivacy}</span>
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
        <div className="text-caption mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-1 px-6 py-4 text-[color:var(--color-ink-400)]">
          <span>{dict.landing.footer}</span>
          <Link href="/panduan" className="ml-auto underline underline-offset-2">
            {dict.guide.nav}
          </Link>
        </div>
      </footer>
    </div>
  );
}
