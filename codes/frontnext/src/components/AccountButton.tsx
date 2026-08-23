'use client';

import { useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/Icon';
import type { Dictionary } from '@/lib/i18n';

/**
 * Who is signed in, and how to stop being signed in.
 *
 * The avatar is the one round thing in an interface of square corners, which is
 * the exception the design system allows and the reason it reads as a person
 * rather than a control.
 */
export function AccountButton({ dict }: { dict: Dictionary }) {
  const { user, ready, enabled, signIn, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!enabled || !ready) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => {
          setBusy(true);
          void signIn().finally(() => setBusy(false));
        }}
        disabled={busy}
        className="text-caption h-8 rounded-[var(--radius-action)] border border-[color:var(--color-line)] px-3 text-[color:var(--color-ink-900)] transition-colors duration-150 hover:bg-[color:var(--color-hover)] disabled:text-[color:var(--color-ink-400)]"
      >
        {busy ? dict.auth.signingIn : dict.auth.signIn}
      </button>
    );
  }

  const label = user.displayName || user.email || '';

  return (
    <span className="flex items-center gap-2">
      {user.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.photoURL}
          alt=""
          width={24}
          height={24}
          referrerPolicy="no-referrer"
          className="h-6 w-6 rounded-[var(--radius-chip)]"
        />
      ) : (
        <Icon name="shield" size={20} className="text-[color:var(--color-ink-600)]" />
      )}
      <span className="text-caption hidden text-[color:var(--color-ink-600)] sm:inline">
        {label}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-caption h-8 rounded-[var(--radius-action)] px-2 text-[color:var(--color-ink-600)] transition-colors duration-150 hover:bg-[color:var(--color-hover)]"
      >
        {dict.auth.signOut}
      </button>
    </span>
  );
}
