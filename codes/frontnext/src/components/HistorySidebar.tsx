'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Hint } from '@/components/Hint';
import { Icon } from '@/components/Icon';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { Wordmark } from '@/components/Wordmark';
import { fill, type Dictionary, type Locale } from '@/lib/i18n';
import type { SessionDigest, SessionHistory } from '@/lib/types';

/**
 * When a session was last worked on, in as few words as it can be said.
 *
 * Today and yesterday are named rather than dated, because that is how a person
 * refers to work they have just been doing. Anything older gets a real date:
 * "5 days ago" is arithmetic the reader has to undo to know which sitting it
 * was.
 */
function formatWhen(value: string | null, locale: Locale, dict: Dictionary): string {
  if (!value) return '';

  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return '';

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((startOfToday.getTime() - when.getTime()) / 86_400_000);

  if (days < 0) return dict.workspace.today;
  if (days < 1) return dict.workspace.yesterday;

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: when.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(when);
}

function HistoryRow({
  row,
  dict,
  locale,
}: {
  row: SessionDigest;
  dict: Dictionary;
  locale: Locale;
}) {
  const done = row.status === 'completed';
  const when = formatWhen(row.updated_at ?? row.created_at, locale, dict);

  return (
    <li>
      <Link
        href={`/sesi/${row.session_id}`}
        className="block border-l-2 border-transparent px-4 py-3 transition-colors duration-150 hover:border-[color:var(--color-primary-500)] hover:bg-[color:var(--color-hover)]"
      >
        <p className="text-body-sm mb-1 line-clamp-2 text-[color:var(--color-ink-900)]">
          {row.headline || dict.workspace.untitled}
        </p>

        <p className="text-micro flex flex-wrap items-center gap-x-2 gap-y-1 text-[color:var(--color-ink-400)]">
          <span
            className={[
              'inline-flex items-center gap-1',
              done
                ? 'text-[color:var(--color-success)]'
                : 'text-[color:var(--color-primary-700)]',
            ].join(' ')}
          >
            <Icon name={done ? 'check' : 'dot'} size={13} />
            {done ? dict.workspace.completed : dict.workspace.inProgress}
          </span>

          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {fill(dict.workspace.answeredOf, {
              answered: row.answered_count,
              total: row.question_count,
            })}
          </span>

          {when ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{when}</span>
            </>
          ) : null}
        </p>

        {row.gap_count > 0 ? (
          <p className="text-micro mt-1 text-[color:var(--color-warning)]">
            {fill(dict.workspace.openGaps, { count: row.gap_count })}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

interface Props {
  dict: Dictionary;
  locale: Locale;
}

/**
 * A student's own work, down the left edge.
 *
 * The history is the reason sign-in exists at all: a defense is not something
 * anyone finishes in one sitting, and a session that cannot be found again is a
 * session that was never worth saving. Rows link straight into the room, where
 * an unfinished defense resumes at the question it stopped on.
 */
export function HistorySidebar({ dict, locale }: Props) {
  const auth = useAuth();
  const [rows, setRows] = useState<SessionDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/sessions/history');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? dict.workspace.failed);
      setRows((data as SessionHistory).sessions ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.workspace.failed);
    } finally {
      setLoading(false);
    }
  }, [dict.workspace.failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const name = auth.user?.displayName || auth.user?.email || '';

  return (
    <nav
      aria-label={dict.workspace.history}
      className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] border-r border-[color:var(--color-line)] bg-[color:var(--color-surface)]"
    >
      <div className="flex h-14 items-center border-b border-[color:var(--color-line)] px-4">
        <Link href="/" className="flex items-center">
          <Wordmark height={22} />
        </Link>
      </div>

      <div className="border-b border-[color:var(--color-line)] p-4">
        <Link
          href="/"
          className="text-body-sm flex h-10 items-center justify-center gap-2 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-4 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)]"
        >
          <Icon name="plus" size={16} />
          {dict.workspace.newSession}
        </Link>
      </div>

      <div className="panel-scroll" tabIndex={0}>
        <h2 className="text-micro flex items-center gap-[6px] px-4 pt-4 pb-2 font-medium tracking-[0.06em] text-[color:var(--color-ink-400)] uppercase">
          {dict.workspace.history}
          <Hint text={dict.workspace.historyHint} />
        </h2>

        {loading ? (
          <p className="text-caption px-4 py-2 text-[color:var(--color-ink-400)]">
            {dict.workspace.loading}
          </p>
        ) : error ? (
          <div className="px-4 py-2">
            <p role="alert" className="text-caption mb-2 text-[color:var(--color-danger)]">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-caption text-[color:var(--color-primary-700)] underline underline-offset-2"
            >
              {dict.workspace.retry}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-caption px-4 py-2 text-[color:var(--color-ink-400)]">
            {dict.workspace.empty}
          </p>
        ) : (
          <ul className="pb-4">
            {rows.map((row) => (
              <HistoryRow key={row.session_id} row={row} dict={dict} locale={locale} />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-[color:var(--color-line)] p-4">
        <Link
          href="/klaim"
          className="text-caption mb-2 flex items-center gap-2 text-[color:var(--color-primary-700)]"
        >
          <Icon name="book" size={16} />
          {dict.nav.claims}
        </Link>

        <Link
          href="/panduan"
          className="text-caption mb-3 flex items-center gap-2 text-[color:var(--color-ink-600)]"
        >
          <Icon name="help" size={16} />
          {dict.guide.nav}
        </Link>

        <div className="flex items-center gap-2 border-t border-[color:var(--color-line)] pt-3">
          {auth.user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={auth.user.photoURL}
              alt=""
              width={28}
              height={28}
              referrerPolicy="no-referrer"
              className="h-7 w-7 shrink-0 rounded-[var(--radius-chip)]"
            />
          ) : (
            <Icon name="shield" size={20} className="text-[color:var(--color-ink-600)]" />
          )}

          <span className="min-w-0 flex-1">
            <span className="text-caption block truncate text-[color:var(--color-ink-900)]">
              {name}
            </span>
          </span>

          <LocaleSwitch locale={locale} dict={dict} />
        </div>

        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="text-caption mt-2 h-8 w-full rounded-[var(--radius-action)] border border-[color:var(--color-line)] text-[color:var(--color-ink-600)] transition-colors duration-150 hover:bg-[color:var(--color-hover)]"
        >
          {dict.auth.signOut}
        </button>
      </div>
    </nav>
  );
}
