'use client';

import Link from 'next/link';

import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/Icon';
import { Wordmark } from '@/components/Wordmark';
import type { Dictionary } from '@/lib/i18n';

interface Props {
  dict: Dictionary;
  /** `signedOut` after leaving on this screen, `locked` on arriving without one. */
  reason: 'signedOut' | 'locked';
}

/**
 * What stands in place of a defense that may not be shown.
 *
 * It exists because of what happened without it. A defense room is rendered on
 * the server and then simply sits there, so signing out changed the button in
 * the corner and left the manuscript, the verified quotes, and the whole
 * weakness map on screen. On a shared machine the next person to sit down would
 * have been reading someone else's unpublished research.
 *
 * So the content is not hidden or dimmed, it is replaced: the component that
 * held it stops rendering entirely.
 */
export function SignedOutNotice({ dict, reason }: Props) {
  const auth = useAuth();
  const locked = reason === 'locked';

  return (
    <main className="grid min-h-dvh place-items-center bg-[color:var(--color-canvas)] px-6">
      <div className="w-full max-w-[46ch] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-8">
        <Wordmark height={24} className="mb-6" />

        <h1 className="text-h2 mb-3">
          {locked ? dict.auth.lockedTitle : dict.auth.signedOutTitle}
        </h1>
        <p className="text-body-sm mb-6 text-[color:var(--color-ink-600)]">
          {locked ? dict.auth.lockedBody : dict.auth.signedOutBody}
        </p>

        {auth.enabled ? (
          <button
            type="button"
            onClick={() => void auth.signIn()}
            className="text-body-sm h-10 w-full rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)]"
          >
            {dict.auth.signIn}
          </button>
        ) : null}

        <Link
          href="/"
          className="text-caption mt-5 flex items-center gap-[6px] text-[color:var(--color-primary-700)]"
        >
          <Icon name="shield" size={16} />
          {dict.errors.startNew}
        </Link>
      </div>
    </main>
  );
}
