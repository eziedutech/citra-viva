'use client';

import { useAuth } from '@/components/AuthProvider';
import { PublicLanding } from '@/components/PublicLanding';
import { Workspace } from '@/components/Workspace';
import type { Dictionary, Locale } from '@/lib/i18n';

interface Props {
  dict: Dictionary;
  locale: Locale;
  /**
   * What the server could tell from the session cookie. Used only until
   * Firebase reports in, and never as a permission check: the API verifies
   * every token itself.
   */
  initialSignedIn: boolean;
}

/**
 * Which of the two front doors to open.
 *
 * Firebase resolves who is signed in only after its code runs in the browser,
 * so a page that waited for it would serve an empty frame to every first-time
 * visitor: precisely the visitor whose first impression is being formed. The
 * server therefore guesses from the session cookie, renders that immediately,
 * and the browser corrects it in the rare case the guess was wrong.
 */
export function HomeShell({ dict, locale, initialSignedIn }: Props) {
  const auth = useAuth();

  // Without Firebase configured there is nobody to sign in, and gating the app
  // behind a button that cannot work would make a local run impossible.
  if (!auth.enabled) return <Workspace dict={dict} locale={locale} />;

  const signedIn = auth.ready ? Boolean(auth.user) : initialSignedIn;

  return signedIn ? (
    <Workspace dict={dict} locale={locale} />
  ) : (
    <PublicLanding dict={dict} locale={locale} />
  );
}
