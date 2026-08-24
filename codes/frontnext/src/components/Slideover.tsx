'use client';

import { useEffect, useRef, useState } from 'react';

import { Hint } from '@/components/Hint';
import { Icon } from '@/components/Icon';
import type { Dictionary, Locale } from '@/lib/i18n';
import { buildReportMarkdown, downloadReport } from '@/lib/report';
import type {
  AnswerEvaluation,
  SessionState,
  SessionSummary,
  WeaknessFinding,
} from '@/lib/types';

/**
 * Severity is how hard an examiner is likely to press, not a grade for the
 * research. Red is reserved for what is proven or blocking, so the highest
 * severity here is amber: these are a model's findings, and a model can be
 * wrong about which sentence matters most.
 */
function severityTone(severity: string): string {
  if (severity === 'high') return 'bg-[color:var(--color-tint-warn)] text-[color:var(--color-warning)]';
  if (severity === 'medium') return 'bg-[color:var(--color-hover)] text-[color:var(--color-ink-600)]';
  return 'bg-[color:var(--color-primary-050)] text-[color:var(--color-ink-600)]';
}

/** Purple marks AI territory throughout. Nothing else in the app uses it. */
function AiLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <p className="text-micro mb-3 flex items-center gap-[6px] text-[color:var(--color-ai)]">
      <Icon name="cpu" size={16} />
      {children}
      {hint ? <Hint text={hint} /> : null}
    </p>
  );
}

function FindingCard({
  finding,
  dict,
  active,
  focused,
}: {
  finding: WeaknessFinding;
  dict: Dictionary;
  /** The finding the question now on the table came from. */
  active?: boolean;
  /** Just jumped to from the transcript, so it is scrolled into view. */
  focused?: boolean;
}) {
  const card = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focused) card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focused]);

  return (
    <article
      ref={card}
      className={[
        'border bg-[color:var(--color-surface)] p-4 transition-colors duration-150',
        active
          ? 'border-[color:var(--color-ai)] shadow-[0_0_0_1px_var(--color-ai)]'
          : 'border-[color:var(--color-line)]',
      ].join(' ')}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-body-sm font-medium">{finding.id}</span>
        {active ? (
          <span className="text-micro flex items-center gap-1 rounded-[var(--radius-chip)] bg-[color:var(--color-tint-ai)] px-2 py-[2px] font-medium text-[color:var(--color-ai)]">
            <Icon name="dot" size={12} />
            {dict.link.underExamination}
          </span>
        ) : null}
        <span
          className={`text-micro rounded-[var(--radius-chip)] px-2 py-[2px] font-medium ${severityTone(finding.severity)}`}
        >
          {dict.slideover.severity[finding.severity] ?? finding.severity}
        </span>
        <Hint text={dict.slideover.hints.severity} />
        <span className="text-micro text-[color:var(--color-ink-600)]">
          {dict.slideover.category[finding.category] ?? finding.category}
        </span>
      </header>

      <blockquote className="mb-3 border-l-2 border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-050)] py-2 pl-3">
        <p className="text-body-sm font-[family-name:var(--font-serif)]">{finding.quote}</p>
        {finding.quote_verified ? (
          <p className="text-micro mt-2 flex items-center gap-[6px] text-[color:var(--color-success)]">
            <Icon name="check" size={14} />
            {dict.slideover.quoteVerified}
            <Hint text={dict.slideover.hints.quote} />
          </p>
        ) : null}
      </blockquote>

      <p className="text-body-sm text-[color:var(--color-ink-600)]">{finding.why_weak}</p>
    </article>
  );
}

function EvaluationPanel({
  evaluation,
  dict,
}: {
  evaluation: AnswerEvaluation | null;
  dict: Dictionary;
}) {
  if (!evaluation) {
    return (
      <p className="text-body-sm text-[color:var(--color-ink-600)]">
        {dict.slideover.noEvaluation}
      </p>
    );
  }

  return (
    <div className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <AiLabel hint={dict.slideover.hints.evaluation}>{dict.slideover.evaluationIntro}</AiLabel>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-body-sm font-medium">
          {dict.slideover.strength[evaluation.strength] ?? evaluation.strength}
        </span>
        <span className="text-micro rounded-[var(--radius-chip)] bg-[color:var(--color-tint-ai)] px-2 py-[2px] font-medium text-[color:var(--color-ai)]">
          {dict.slideover.decision[evaluation.decision] ?? evaluation.decision}
        </span>
      </div>

      {evaluation.criteria_met.length > 0 ? (
        <section className="mb-4">
          <h4 className="text-caption mb-1 font-medium text-[color:var(--color-success)]">
            {dict.slideover.criteriaMet}
          </h4>
          <ul className="text-body-sm space-y-1">
            {evaluation.criteria_met.map((item) => (
              <li key={item} className="flex gap-2">
                <Icon
                  name="check"
                  size={16}
                  className="mt-[4px] shrink-0 text-[color:var(--color-success)]"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {evaluation.criteria_missed.length > 0 ? (
        <section className="mb-4">
          <h4 className="text-caption mb-1 font-medium text-[color:var(--color-warning)]">
            {dict.slideover.criteriaMissed}
          </h4>
          <ul className="text-body-sm space-y-1">
            {evaluation.criteria_missed.map((item) => (
              <li key={item} className="flex gap-2">
                <Icon
                  name="alert"
                  size={16}
                  className="mt-[4px] shrink-0 text-[color:var(--color-warning)]"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {evaluation.gap_note ? (
        <p className="text-body-sm border-l-2 border-[color:var(--color-warning)] bg-[color:var(--color-tint-warn)] py-2 pl-3">
          {evaluation.gap_note}
        </p>
      ) : null}
    </div>
  );
}

function ReportPanel({
  summary,
  session,
  onClose,
  closing,
  canClose,
  dict,
  locale,
}: {
  summary: SessionSummary | null;
  session: SessionState;
  onClose: () => void;
  closing: boolean;
  canClose: boolean;
  dict: Dictionary;
  locale: Locale;
}) {
  if (!summary) {
    return (
      <div>
        <p className="text-body-sm mb-4 text-[color:var(--color-ink-600)]">
          {canClose
            ? dict.slideover.reportPending
            : dict.slideover.reportLocked}
        </p>
        <button
          type="button"
          onClick={onClose}
          disabled={!canClose || closing}
          className="h-10 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-4 text-body-sm font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
        >
          {closing ? dict.room.buildingReport : dict.slideover.writeReport}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AiLabel hint={dict.slideover.hints.report}>{dict.slideover.reportIntro}</AiLabel>

      <section>
        <h4 className="text-caption mb-2 font-medium text-[color:var(--color-success)]">
          {dict.slideover.defended}
        </h4>
        {summary.strong_points.length > 0 ? (
          <ul className="text-body-sm space-y-2">
            {summary.strong_points.map((item) => (
              <li key={item} className="border-l-2 border-[color:var(--color-success)] pl-3">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-[color:var(--color-ink-600)]">
            {dict.slideover.nothingDefended}
          </p>
        )}
      </section>

      <section>
        <h4 className="text-caption mb-2 font-medium text-[color:var(--color-warning)]">
          {dict.slideover.stillOpen}
        </h4>
        <ul className="text-body-sm space-y-2">
          {summary.remaining_gaps.map((item) => (
            <li key={item} className="border-l-2 border-[color:var(--color-warning)] pl-3">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="text-caption mb-2 flex items-center gap-[6px] font-medium">
          <Icon name="history" size={16} />
          {dict.slideover.patterns}
          <Hint text={dict.slideover.hints.patterns} align="end" />
        </h4>
        <ul className="text-body-sm space-y-2">
          {summary.recurring_gap_patterns.map((item) => (
            <li
              key={item}
              className="border border-[color:var(--color-line)] bg-[color:var(--color-primary-050)] p-3"
            >
              {item}
            </li>
          ))}
        </ul>
        <p className="text-caption mt-2 text-[color:var(--color-ink-600)]">
          {dict.slideover.patternsHelp}
        </p>
      </section>

      {summary.rubric_revealed_for.length > 0 ? (
        <section>
          <h4 className="text-caption mb-2 flex items-center gap-[6px] font-medium text-[color:var(--color-ink-600)]">
            {dict.rubric.reportTitle}
            <Hint text={dict.rubric.reportHelp} align="end" />
          </h4>
          <p className="text-body-sm flex flex-wrap gap-2">
            {summary.rubric_revealed_for.map((id) => (
              <span
                key={id}
                className="text-micro rounded-[var(--radius-chip)] bg-[color:var(--color-tint-ai)] px-2 py-[2px] font-medium text-[color:var(--color-ai)]"
              >
                {id}
              </span>
            ))}
          </p>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-line)] pt-4">
        <button
          type="button"
          onClick={() =>
            downloadReport(session, buildReportMarkdown(session, summary, dict, locale))
          }
          className="text-body-sm flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-action)] border border-[color:var(--color-line)] px-4 transition-colors duration-150 hover:bg-[color:var(--color-hover)]"
        >
          <Icon name="file" size={16} />
          {dict.report.download}
        </button>
      </section>

      {summary.closing_remark ? (
        <section>
          <h4 className="text-caption mb-2 font-medium text-[color:var(--color-ink-600)]">
            {dict.slideover.closingRemark}
          </h4>
          <p className="text-body-sm font-[family-name:var(--font-serif)]">
            {summary.closing_remark}
          </p>
        </section>
      ) : null}
    </div>
  );
}

type Tab = 'weakness' | 'evaluation' | 'report';

interface Props {
  session: SessionState;
  findings: WeaknessFinding[];
  /** The finding behind the question currently open. */
  activeFindingId?: string;
  /** A finding the student asked to see, from the transcript. */
  focusFindingId?: string;
  evaluation: AnswerEvaluation | null;
  summary: SessionSummary | null;
  finished: boolean;
  closing: boolean;
  onClose: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  dict: Dictionary;
  locale: Locale;
}

export function Slideover({
  session,
  findings,
  activeFindingId = '',
  focusFindingId = '',
  evaluation,
  summary,
  finished,
  closing,
  onClose,
  activeTab,
  onTabChange,
  dict,
  locale,
}: Props) {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'weakness', label: dict.slideover.tabs.weakness },
    { id: 'evaluation', label: dict.slideover.tabs.evaluation },
    { id: 'report', label: dict.slideover.tabs.report },
  ];

  return (
    <aside
      aria-label={dict.slideover.label}
      className="grid min-h-0 grid-rows-[auto_1fr] border-l border-[color:var(--color-line)] bg-[color:var(--color-surface)]"
    >
      {/* The tab strip stays put; only the panel body scrolls, so reading a
          finding never moves the transcript in the middle. */}
      <div role="tablist" className="flex border-b border-[color:var(--color-line)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              'text-body-sm h-11 flex-1 border-b-2 px-2 transition-colors duration-150',
              activeTab === tab.id
                ? 'border-[color:var(--color-primary-500)] font-medium text-[color:var(--color-primary-700)]'
                : 'border-transparent text-[color:var(--color-ink-600)] hover:bg-[color:var(--color-hover)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel-scroll p-5" tabIndex={0}>
        {activeTab === 'weakness' ? (
          <div className="space-y-3">
            <AiLabel hint={dict.slideover.hints.weakness}>{dict.slideover.weaknessIntro}</AiLabel>
            {findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                dict={dict}
                active={finding.id === activeFindingId}
                focused={finding.id === focusFindingId}
              />
            ))}
          </div>
        ) : null}

        {activeTab === 'evaluation' ? (
          <EvaluationPanel evaluation={evaluation} dict={dict} />
        ) : null}

        {activeTab === 'report' ? (
          <ReportPanel
            summary={summary}
            session={session}
            onClose={onClose}
            closing={closing}
            canClose={finished}
            dict={dict}
            locale={locale}
          />
        ) : null}
      </div>
    </aside>
  );
}

export type { Tab };
