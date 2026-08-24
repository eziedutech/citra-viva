'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/Icon';
import type { Dictionary } from '@/lib/i18n';
import type { QuestionRubric } from '@/lib/types';

interface Props {
  sessionId: string;
  dict: Dictionary;
  disabled?: boolean;
  /** Already opened for this question, so the button says so from the start. */
  alreadyOpened?: boolean;
  onOpened?: () => void;
}

/**
 * What the question is testing, on request.
 *
 * This is deliberately not a suggested answer. Telling a student what a good
 * answer would have to establish is what a supervisor does; handing them the
 * answer is doing the work for them, and an answer read once cannot be unread.
 * After that, every judgment in the session measures how well they paraphrased
 * rather than whether they understood, and the closing report becomes worthless
 * to the person it was written for.
 *
 * So the panel shows the examiner's own planning notes: what the question is
 * probing, and what a sufficient answer has to cover. Opening it is recorded
 * against the question and appears in the report. The help is allowed; pretending
 * it was not taken is not.
 */
export function RubricButton({
  sessionId,
  dict,
  disabled = false,
  alreadyOpened = false,
  onOpened,
}: Props) {
  const { authedFetch } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rubric, setRubric] = useState<QuestionRubric | null>(null);

  // The rubric belongs to one question. When the examination moves on, what is
  // held here is about a question nobody is being asked any more.
  useEffect(() => {
    setRubric(null);
    setError('');
    setOpen(false);
  }, [sessionId, alreadyOpened]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  async function reveal() {
    setOpen(true);
    if (rubric) return;

    setBusy(true);
    setError('');
    try {
      const response = await authedFetch(`/api/sessions/${sessionId}/rubric`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? dict.rubric.failed);
      setRubric(data as QuestionRubric);
      onOpened?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.rubric.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void reveal()}
        disabled={disabled || busy}
        className="text-caption flex h-9 items-center gap-2 rounded-[var(--radius-action)] border border-[color:var(--color-line)] px-3 transition-colors duration-150 hover:bg-[color:var(--color-hover)] disabled:text-[color:var(--color-ink-400)]"
      >
        <Icon name="help" size={16} />
        {busy ? dict.rubric.opening : alreadyOpened ? dict.rubric.opened : dict.rubric.open}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={dict.rubric.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(31,39,51,0.28)] p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-[560px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[0_16px_48px_rgba(31,39,51,0.22)]">
            <div className="flex items-center gap-3 border-b border-[color:var(--color-line)] bg-[color:var(--color-tint-ai)] px-5 py-2 text-[color:var(--color-ai)]">
              <Icon name="cpu" size={18} />
              <span className="text-micro font-medium tracking-[0.06em] uppercase">
                {dict.rubric.title}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={dict.rubric.close}
                className="text-caption ml-auto rounded-[var(--radius-action)] px-2 py-1 hover:bg-[color:var(--color-surface)]"
              >
                {dict.rubric.close}
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {busy ? (
                <p className="text-body-sm text-[color:var(--color-ink-600)]">
                  {dict.rubric.opening}
                </p>
              ) : error ? (
                <p
                  role="alert"
                  className="text-body-sm flex items-start gap-2 border border-[color:var(--color-danger)] bg-[color:var(--color-tint-danger)] p-3 text-[color:var(--color-danger)]"
                >
                  <Icon name="alert" size={18} className="mt-[2px] shrink-0" />
                  <span>{error}</span>
                </p>
              ) : rubric ? (
                <>
                  <p className="text-micro mb-1 text-[color:var(--color-ink-400)]">
                    {rubric.question_id}
                  </p>
                  <p className="text-body-sm mb-5 font-[family-name:var(--font-serif)]">
                    {rubric.question}
                  </p>

                  {rubric.intent ? (
                    <section className="mb-5">
                      <h3 className="text-caption mb-1 font-medium text-[color:var(--color-ink-600)]">
                        {dict.rubric.intent}
                      </h3>
                      <p className="text-body-sm">{rubric.intent}</p>
                    </section>
                  ) : null}

                  {rubric.evaluation_criteria ? (
                    <section className="mb-5">
                      <h3 className="text-caption mb-1 font-medium text-[color:var(--color-ink-600)]">
                        {dict.rubric.criteria}
                      </h3>
                      <p className="text-body-sm border-l-2 border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-050)] py-2 pl-3">
                        {rubric.evaluation_criteria}
                      </p>
                    </section>
                  ) : null}

                  <p className="text-caption border-t border-[color:var(--color-line)] pt-4 text-[color:var(--color-ink-600)]">
                    {dict.rubric.recorded}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
