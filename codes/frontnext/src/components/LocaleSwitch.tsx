'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { LOCALE_COOKIE, type Dictionary, type Locale } from '@/lib/i18n';

interface Props {
  locale: Locale;
  dict: Dictionary;
}

/**
 * Switch the shell language.
 *
 * One button rather than a dropdown, because there are two options and a
 * dropdown for two options is a click wasted. The label names the language you
 * would move to, so it reads as an action rather than a status.
 */
export function LocaleSwitch({ locale, dict }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === 'en' ? 'id' : 'en';

  function switchTo() {
    // One year, path-wide. Nothing sensitive lives here, so SameSite=Lax is
    // enough and there is no reason to make it HttpOnly: the client sets it.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      disabled={pending}
      lang={next}
      className="text-caption h-8 rounded-[var(--radius-action)] px-2 text-[color:var(--color-ink-600)] transition-colors duration-150 hover:bg-[color:var(--color-hover)] disabled:text-[color:var(--color-ink-400)]"
    >
      {dict.otherLocaleName}
    </button>
  );
}
