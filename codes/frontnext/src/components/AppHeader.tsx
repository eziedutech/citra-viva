'use client';

import Link from 'next/link';

import { AccountButton } from '@/components/AccountButton';
import { useAuth } from '@/components/AuthProvider';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { Wordmark } from '@/components/Wordmark';
import type { Dictionary, Locale } from '@/lib/i18n';

interface Props {
  dict: Dictionary;
  locale: Locale;
  /** Which page is showing, so its own link is marked rather than offered. */
  current: 'defense' | 'claims' | 'guide';
}

/**
 * The one bar across the top of the pages that stand on their own.
 *
 * It was previously assembled inside each page's own column, which put the
 * brand at a different horizontal position on every route and left the account
 * control floating in the middle of the reading measure. A full width bar fixes
 * both, and pinning it means a person deep into a long page can still see whose
 * account they are in.
 *
 * The signed-in workspace does not use this. It has a sidebar carrying the same
 * things, and two navigations for one screen is one too many.
 */
export function AppHeader({ dict, locale, current }: Props) {
  // The citation checker needs an account. Offering it to a signed-out visitor
  // means letting them fill in a claim and a source and only then telling them
  // to sign in, which is the kind of thing an interface should never do.
  const { enabled, ready, user } = useAuth();
  const signedIn = !enabled || (ready && Boolean(user));

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'text-caption flex h-16 items-center border-b-2 px-1 transition-colors duration-150',
        active
          ? 'border-[color:var(--color-primary-500)] text-[color:var(--color-ink-900)]'
          : 'border-transparent text-[color:var(--color-ink-600)] hover:text-[color:var(--color-ink-900)]',
      ].join(' ')}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)]">
      <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-8 px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <Wordmark height={40} />
        </Link>

        <nav aria-label={dict.nav.label} className="flex items-center gap-6">
          {tab('/', dict.nav.defense, current === 'defense')}
          {signedIn ? tab('/klaim', dict.nav.claims, current === 'claims') : null}
          {tab('/panduan', dict.guide.nav, current === 'guide')}
        </nav>

        <span className="ml-auto flex items-center gap-3">
          <AccountButton dict={dict} />
          <LocaleSwitch locale={locale} dict={dict} />
        </span>
      </div>
    </header>
  );
}
