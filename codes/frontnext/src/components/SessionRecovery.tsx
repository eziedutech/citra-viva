'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { SignedOutNotice } from '@/components/SignedOutNotice';
import { Wordmark } from '@/components/Wordmark';
import type { Dictionary } from '@/lib/i18n';

/**
 * How long a retry counts as "just tried".
 *
 * The guard has to survive the re-render it triggers. `router.refresh()` builds
 * the server tree again, and if the page comes back unreadable this component
 * mounts fresh: a flag held in a ref would be back to false and it would
 * refresh again, forever. Ten minutes later the same person's cookie can expire
 * again and a fresh attempt is exactly right, so the guard is a timestamp
 * rather than a permanent mark.
 */
const RETRY_COOLDOWN_MS = 20_000;

function retriedRecently(key: string): boolean {
  try {
    const at = Number(window.sessionStorage.getItem(key) ?? 0);
    return Number.isFinite(at) && Date.now() - at < RETRY_COOLDOWN_MS;
  } catch {
    // Private browsing modes can refuse session storage. Without the guard the
    // safe direction is not to retry, since a loop is worse than a page that
    // asks the reader to reload.
    return true;
  }
}

function markRetried(key: string) {
  try {
    window.sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Nothing to do. `retriedRecently` fails closed.
  }
}

/**
 * What to do when the server could not read a session because it had no
 * credential to read it with.
 *
 * This is an ordinary state, not a failure. The token cookie deliberately
 * expires before the token it carries, so anyone returning to a defense an hour
 * later arrives with the server seeing nothing while the browser still knows
 * exactly who they are. Treating that as an error, which is what happened
 * before, told a student mid-defense that the service could not be reached.
 *
 * So: if somebody is signed in, wait for the cookie to be written and render
 * again. Only when nobody is signed in is this actually a locked door.
 */
export function SessionRecovery({ dict }: { dict: Dictionary }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!auth.enabled) {
      setSettled(true);
      return;
    }
    if (!auth.ready || !auth.sessionReady) return;

    if (!auth.user) {
      setSettled(true);
      return;
    }

    const key = `citra_session_retry:${pathname}`;
    if (retriedRecently(key)) {
      // Credential in hand and the page still will not open: this session
      // belongs to a different account, and saying so beats spinning.
      setSettled(true);
      return;
    }

    markRetried(key);
    router.refresh();
  }, [auth.enabled, auth.ready, auth.sessionReady, auth.user, pathname, router]);

  if (!settled) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[color:var(--color-canvas)] px-6">
        <div className="text-center">
          <Wordmark height={24} className="mx-auto mb-4" />
          <p className="text-caption text-[color:var(--color-ink-400)]">{dict.auth.restoring}</p>
        </div>
      </main>
    );
  }

  return <SignedOutNotice dict={dict} reason="locked" />;
}
