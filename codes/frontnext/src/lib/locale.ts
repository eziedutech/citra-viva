import 'server-only';

import { cookies } from 'next/headers';

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from '@/lib/i18n';

/**
 * The reader's locale, from a cookie.
 *
 * A cookie rather than a URL segment, because the locale here changes the shell
 * and nothing else: the findings and the questions come back in the language of
 * the manuscript regardless. Putting it in the path would suggest two versions
 * of a session exist, and they do not.
 */
export async function currentLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
