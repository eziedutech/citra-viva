'use client';

import { useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import type { Dictionary } from '@/lib/i18n';

/**
 * Deleting an account, behind a word the student has to type.
 *
 * The confirmation is not decoration. Every other destructive action here costs
 * one session; this one costs everything, and a misplaced click on a phone
 * should not be able to spend it. Typing the word is the smallest barrier that
 * cannot be crossed by accident.
 *
 * The word itself comes from the dictionary rather than being hardcoded to
 * DELETE, because asking somebody reading Indonesian to type an English word
 * turns a safety check into a puzzle.
 */
export function DeleteAccount({ dict }: { dict: Dictionary }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [done, setDone] = useState<number | null>(null);

  const word = dict.auth.deleteConfirmWord;
  const armed = typed.trim().toUpperCase() === word.toUpperCase();

  async function run() {
    setBusy(true);
    setFailure('');
    try {
      setDone(await auth.deleteAccount());
    } catch {
      // Deliberately not the thrown message. The backend deletes nothing on a
      // failure, and what the student needs to know is that their work is
      // still there, not which call returned what.
      setFailure(dict.auth.deleteFailed);
    } finally {
      setBusy(false);
    }
  }

  if (done !== null) {
    return (
      <p className="text-caption mt-2 text-[color:var(--color-ink-600)]" role="status">
        {dict.auth.deleteDone} {done > 0 ? `${done} ${dict.auth.deleteDoneCount}` : ''}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-caption mt-2 h-8 w-full rounded-[var(--radius-action)] text-[color:var(--color-ink-600)] transition-colors duration-150 hover:bg-[color:var(--color-hover)] hover:text-[color:var(--color-danger)]"
      >
        {dict.auth.deleteAccount}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-[var(--radius-action)] border border-[color:var(--color-danger)] p-3">
      <p className="text-caption font-medium text-[color:var(--color-ink-900)]">
        {dict.auth.deleteTitle}
      </p>
      <p className="text-caption mt-1 text-[color:var(--color-ink-600)]">{dict.auth.deleteBody}</p>

      <label className="text-caption mt-3 block text-[color:var(--color-ink-600)]">
        {dict.auth.deleteConfirmLabel}
        <input
          type="text"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          disabled={busy}
          autoComplete="off"
          className="text-caption mt-1 h-8 w-full rounded-[var(--radius-action)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-2 text-[color:var(--color-ink-900)]"
        />
      </label>

      {failure ? (
        <p className="text-caption mt-2 text-[color:var(--color-danger)]" role="alert">
          {failure}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped('');
            setFailure('');
          }}
          disabled={busy}
          className="text-caption h-8 flex-1 rounded-[var(--radius-action)] border border-[color:var(--color-line)] text-[color:var(--color-ink-600)] transition-colors duration-150 hover:bg-[color:var(--color-hover)]"
        >
          {dict.auth.deleteCancel}
        </button>
        <button
          type="button"
          onClick={() => void run()}
          disabled={!armed || busy}
          className="text-caption h-8 flex-1 rounded-[var(--radius-action)] bg-[color:var(--color-danger)] text-white transition-opacity duration-150 disabled:opacity-40"
        >
          {busy ? dict.auth.deleting : dict.auth.deleteAccount}
        </button>
      </div>
    </div>
  );
}
