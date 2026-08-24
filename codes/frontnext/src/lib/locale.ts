import 'server-only';

import { cookies, headers } from 'next/headers';

import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from '@/lib/i18n';

/**
 * Read the browser's own language preference.
 *
 * `Accept-Language` arrives ordered by preference with quality weights, as in
 * `id-ID,id;q=0.9,en-US;q=0.8`. The order is already the answer, so the first
 * entry this app can serve wins and the weights need no arithmetic. Region is
 * dropped: `id-ID` and `id` are the same shell language here.
 */
function fromHeader(header: string | null): Locale | null {
  if (!header) return null;

  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase() ?? '';
    const base = tag.split('-')[0];
    const match = LOCALES.find((locale) => locale === base);
    if (match) return match;
  }

  return null;
}

/**
 * The reader's locale: their explicit choice, then their browser, then English.
 *
 * A cookie rather than a URL segment, because the locale here changes the shell
 * and nothing else: the findings and the questions come back in the language of
 * the manuscript regardless. Putting it in the path would suggest two versions
 * of a session exist, and they do not.
 *
 * The cookie always wins. Someone who has picked a language is telling us
 * something their browser configuration does not know, and an Indonesian
 * student reading the interface in English on purpose should not have that
 * undone on every visit.
 */
export async function currentLocale(): Promise<Locale> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const requested = (await headers()).get('accept-language');
  return fromHeader(requested) ?? DEFAULT_LOCALE;
}
