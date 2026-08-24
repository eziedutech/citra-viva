'use client';

import { useAuth } from '@/components/AuthProvider';
import { ClaimChecker } from '@/components/ClaimChecker';
import { SignedOutNotice } from '@/components/SignedOutNotice';
import { Workspace } from '@/components/Workspace';
import { Wordmark } from '@/components/Wordmark';
import type { Dictionary, Locale } from '@/lib/i18n';

interface Props {
  dict: Dictionary;
  locale: Locale;
  initialSignedIn: boolean;
}

/**
 * The citation checker, inside the signed-in app.
 *
 * It used to stand on its own as a public page, and that was a trap: a visitor
 * could paste a claim, paste a source, fill in the bibliographic details, press
 * the button, and only then be told to sign in. An interface should ask for
 * what it needs before the work, not after it.
 *
 * So it now lives in the workspace, beside a student's own sessions, and a
 * signed-out visitor is told plainly at the door rather than at the end.
 */
export function ClaimShell({ dict, locale, initialSignedIn }: Props) {
  const auth = useAuth();

  if (!auth.enabled) {
    return <ClaimChecker dict={dict} locale={locale} />;
  }

  const signedIn = auth.ready ? Boolean(auth.user) : initialSignedIn;

  if (!signedIn) {
    // While Firebase is still deciding, the server's guess stands. Only once it
    // has reported no user is this a locked door.
    if (!auth.ready) {
      return (
        <main className="grid min-h-dvh place-items-center bg-[color:var(--color-canvas)]">
          <Wordmark height={40} />
        </main>
      );
    }
    return <SignedOutNotice dict={dict} reason="locked" />;
  }

  return (
    <Workspace dict={dict} locale={locale}>
      <ClaimChecker dict={dict} locale={locale} embedded />
    </Workspace>
  );
}
