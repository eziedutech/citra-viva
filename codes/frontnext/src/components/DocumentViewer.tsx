'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/Icon';
import { fill, type Dictionary } from '@/lib/i18n';
import type { SessionDocument } from '@/lib/types';

interface Props {
  sessionId: string;
  dict: Dictionary;
}

interface Match {
  start: number;
  end: number;
}

/** Where every occurrence of the search term sits in the manuscript. */
function findMatches(text: string, term: string): Match[] {
  const needle = term.trim().toLowerCase();
  if (needle.length < 2) return [];

  const haystack = text.toLowerCase();
  const found: Match[] = [];
  let from = 0;

  // A plain scan rather than a regular expression, because a student searching
  // their own thesis will type brackets, asterisks, and question marks, and
  // every one of those would either throw or quietly mean something else.
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    found.push({ start: at, end: at + needle.length });
    from = at + needle.length;
    if (found.length > 2000) break;
  }

  return found;
}

/**
 * The thesis, open beside the examination.
 *
 * A candidate sits a viva with their thesis in front of them. Being pressed on
 * a sentence with no way to look it up is a memory test rather than a defense,
 * and this product's entire argument is that the pressure is aimed at real
 * sentences, so refusing the student sight of them would be strange.
 *
 * Search is the point rather than a convenience. Nobody reads eighty pages
 * while an examiner waits; they look for the paragraph that answers the
 * question. Matches are counted, highlighted, and steppable, so the answer can
 * be reached in seconds.
 *
 * The document is fetched when it is first opened and kept for the rest of the
 * session. It does not change while a defense is running, and a student
 * checking three questions in a row should not wait three times.
 */
export function DocumentViewer({ sessionId, dict }: Props) {
  const { authedFetch } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [document_, setDocument] = useState<SessionDocument | null>(null);
  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);

  const body = useRef<HTMLDivElement>(null);
  const activeMark = useRef<HTMLSpanElement>(null);

  const matches = useMemo(
    () => (document_ ? findMatches(document_.text, term) : []),
    [document_, term],
  );

  useEffect(() => {
    setActive(0);
  }, [term]);

  useEffect(() => {
    if (!open || matches.length === 0) return;
    activeMark.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [open, active, matches.length]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.document.addEventListener('keydown', onKeyDown);
    return () => window.document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const response = await authedFetch(`/api/sessions/${sessionId}/document`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? dict.document.failed);
      setDocument(data as SessionDocument);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.document.failed);
    } finally {
      setBusy(false);
    }
  }, [authedFetch, dict.document.failed, sessionId]);

  function show() {
    setOpen(true);
    if (!document_ && !busy) void load();
  }

  function step(by: number) {
    if (matches.length === 0) return;
    setActive((current) => (current + by + matches.length) % matches.length);
  }

  /**
   * The manuscript with every match marked.
   *
   * Built from slices rather than by replacing text, so nothing a student wrote
   * can be interpreted as markup on the way to the screen.
   */
  const rendered = useMemo(() => {
    if (!document_) return null;
    if (matches.length === 0) return document_.text;

    const parts: React.ReactNode[] = [];
    let cursor = 0;

    matches.forEach((match, index) => {
      if (match.start > cursor) parts.push(document_.text.slice(cursor, match.start));

      const current = index === active;
      parts.push(
        <span
          key={`${match.start}-${index}`}
          ref={current ? activeMark : undefined}
          className={
            current
              ? 'bg-[color:var(--color-ai)] text-white'
              : 'bg-[color:var(--color-tint-warn)]'
          }
        >
          {document_.text.slice(match.start, match.end)}
        </span>,
      );
      cursor = match.end;
    });

    if (cursor < document_.text.length) parts.push(document_.text.slice(cursor));
    return parts;
  }, [document_, matches, active]);

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="text-caption flex h-9 items-center gap-2 rounded-[var(--radius-action)] border border-[color:var(--color-line)] px-3 transition-colors duration-150 hover:bg-[color:var(--color-hover)]"
      >
        <Icon name="book" size={16} />
        {dict.document.open}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={dict.document.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(31,39,51,0.28)] p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex h-full max-h-[86vh] w-full max-w-[900px] flex-col border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[0_16px_48px_rgba(31,39,51,0.22)]">
            <div className="flex items-center gap-3 border-b border-[color:var(--color-line)] px-5 py-3">
              <Icon name="book" size={18} className="text-[color:var(--color-primary-700)]" />
              <h2 className="text-body-sm font-medium">{dict.document.title}</h2>
              {document_ ? (
                <span className="text-micro text-[color:var(--color-ink-400)] tabular-nums">
                  {document_.characters.toLocaleString()} {dict.intake.characters}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-caption ml-auto rounded-[var(--radius-action)] px-2 py-1 transition-colors duration-150 hover:bg-[color:var(--color-hover)]"
              >
                {dict.rubric.close}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--color-line)] px-5 py-3">
              <label htmlFor="document-search" className="sr-only">
                {dict.document.search}
              </label>
              <input
                id="document-search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  step(event.shiftKey ? -1 : 1);
                }}
                placeholder={dict.document.search}
                disabled={!document_}
                className="text-body-sm h-9 min-w-0 flex-1 border border-[color:var(--color-line)] px-3 outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
              />

              <span className="text-caption tabular-nums text-[color:var(--color-ink-600)]">
                {term.trim().length >= 2
                  ? matches.length === 0
                    ? dict.document.noMatches
                    : fill(dict.document.matchOf, {
                        current: active + 1,
                        total: matches.length,
                      })
                  : ''}
              </span>

              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={matches.length === 0}
                  aria-label={dict.document.previous}
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-action)] border border-[color:var(--color-line)] transition-colors duration-150 hover:bg-[color:var(--color-hover)] disabled:text-[color:var(--color-ink-400)]"
                >
                  <Icon name="chevronUp" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={matches.length === 0}
                  aria-label={dict.document.next}
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-action)] border border-[color:var(--color-line)] transition-colors duration-150 hover:bg-[color:var(--color-hover)] disabled:text-[color:var(--color-ink-400)]"
                >
                  <Icon name="chevronDown" size={16} />
                </button>
              </span>
            </div>

            <div ref={body} className="panel-scroll min-h-0 flex-1 px-6 py-5" tabIndex={0}>
              {busy ? (
                <p className="text-body-sm text-[color:var(--color-ink-600)]">
                  {dict.document.loading}
                </p>
              ) : error ? (
                <p
                  role="alert"
                  className="text-body-sm flex items-start gap-2 border border-[color:var(--color-danger)] bg-[color:var(--color-tint-danger)] p-3 text-[color:var(--color-danger)]"
                >
                  <Icon name="alert" size={18} className="mt-[2px] shrink-0" />
                  <span>{error}</span>
                </p>
              ) : (
                <article className="text-editor mx-auto max-w-[70ch] font-[family-name:var(--font-serif)] whitespace-pre-wrap">
                  {rendered}
                </article>
              )}
            </div>

            <p className="text-caption border-t border-[color:var(--color-line)] px-5 py-3 text-[color:var(--color-ink-600)]">
              {dict.document.note}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
