'use client';

import { Icon } from '@/components/Icon';
import type { Dictionary } from '@/lib/i18n';
import type { PlannedQuestion, QuestionProgress } from '@/lib/types';

interface Props {
  questions: PlannedQuestion[];
  progress: QuestionProgress[];
  currentIndex: number;
  dict: Dictionary;
}

/**
 * The examination plan as a stepper.
 *
 * Done, active, and locked, exactly as the design system specifies. A question
 * that is still ahead cannot be clicked: the point of a defense is that the
 * student does not get to see what is coming.
 */
export function QuestionSidebar({ questions, progress, currentIndex, dict }: Props) {
  return (
    <nav
      aria-label={dict.sidebar.plan}
      className="panel-scroll border-r border-[color:var(--color-line)] bg-[color:var(--color-primary-050)]"
      tabIndex={0}
    >
      <div className="px-5 py-4">
        <h2 className="text-caption mb-3 font-medium text-[color:var(--color-ink-600)]">
          {dict.sidebar.plan}
        </h2>

        <ol className="space-y-1">
          {questions.map((question, index) => {
            const state = progress[index];
            const done = state?.closed ?? false;
            const active = index === currentIndex;
            const gap = Boolean(state?.gap_recorded);

            return (
              <li key={question.id}>
                <div
                  aria-current={active ? 'step' : undefined}
                  className={[
                    'flex min-h-10 items-start gap-3 px-3 py-2 transition-colors duration-150',
                    active
                      ? 'border-l-2 border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-100)]'
                      : 'border-l-2 border-transparent',
                    !done && !active ? 'text-[color:var(--color-ink-400)]' : '',
                  ].join(' ')}
                >
                  <span className="mt-[3px] shrink-0">
                    {done ? (
                      <Icon
                        name="check"
                        size={18}
                        label={gap ? dict.sidebar.doneWithGap : dict.sidebar.done}
                        className={
                          gap
                            ? 'text-[color:var(--color-warning)]'
                            : 'text-[color:var(--color-success)]'
                        }
                      />
                    ) : active ? (
                      <Icon
                        name="dot"
                        size={18}
                        label={dict.sidebar.active}
                        className="text-[color:var(--color-primary-500)]"
                      />
                    ) : (
                      <Icon name="lock" size={18} label={dict.sidebar.locked} />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="text-body-sm block font-medium">
                      {question.id}
                      <span className="ml-2 font-normal text-[color:var(--color-ink-600)]">
                        {dict.sidebar.types[question.question_type] ?? question.question_type}
                      </span>
                    </span>

                    {question.targets_recurring_gap ? (
                      <span className="text-micro mt-1 inline-block rounded-[var(--radius-chip)] bg-[color:var(--color-tint-warn)] px-2 py-[2px] font-medium text-[color:var(--color-warning)]">
                        {dict.sidebar.recurringGap}
                      </span>
                    ) : null}

                    {active ? (
                      <span className="text-caption mt-1 block text-[color:var(--color-ink-600)]">
                        {question.question}
                      </span>
                    ) : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
