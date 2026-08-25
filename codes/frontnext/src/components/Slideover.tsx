'use client';

import { useEffect, useRef, useState } from 'react';

import { Hint } from '@/components/Hint';
import { Icon } from '@/components/Icon';
import { fill, type Dictionary, type Locale } from '@/lib/i18n';
import { buildReportMarkdown, downloadReport } from '@/lib/report';
import type {
  AnswerEvaluation,
  SessionAssessment,
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

/**
 * Every question that has been judged, not only the most recent one.
 *
 * The panel used to hold a single evaluation in component state, so each new
 * answer erased the one before it and a finished session looked as though only
 * its last question had ever been examined. The judgements were never lost:
 * they were written onto the transcript as they happened, which is where these
 * come from.
 *
 * The question being examined now is open. The rest are closed, because a
 * finished question is a reference rather than something to read again.
 */
/** How a judgement should look, which is not the same as who produced it. */
function chipFor(strength: string): string {
  if (strength === 'strong') {
    return 'bg-[color:var(--color-tint-ok)] text-[color:var(--color-success)]';
  }
  if (strength === 'partial') {
    return 'bg-[color:var(--color-tint-warn)] text-[color:var(--color-warning)]';
  }
  if (strength === 'weak' || strength === 'evasive') {
    return 'bg-[color:var(--color-tint-danger)] text-[color:var(--color-danger)]';
  }
  return 'bg-[color:var(--color-tint-ai)] text-[color:var(--color-ai)]';
}

function JudgmentHistory({
  session,
  selected,
  onSelect,
  dict,
}: {
  session: SessionState;
  selected: string;
  onSelect: (questionId: string) => void;
  dict: Dictionary;
}) {
  const strengths = dict.slideover.strength as Record<string, string>;
  const decisions = dict.slideover.decision as Record<string, string>;

  // The last judged examiner turn for each question, which is the judgement
  // that stood when the question closed.
  const judged = new Map<string, (typeof session.transcript)[number]>();
  for (const turn of session.transcript) {
    if (turn.role === 'examiner' && turn.evaluated_strength && turn.question_id) {
      judged.set(turn.question_id, turn);
    }
  }

  const rows = session.questions.filter((question) => judged.has(question.id));
  if (rows.length === 0) {
    return (
      <p className="text-body-sm text-[color:var(--color-ink-600)]">
        {dict.slideover.judgments.empty}
      </p>
    );
  }

  return (
    <section>
      <h4 className="text-caption mb-2 font-medium text-[color:var(--color-ink-600)]">
        {dict.slideover.judgments.heading}
      </h4>

      <ul className="space-y-2">
        {rows.map((question, index) => {
          const turn = judged.get(question.id);
          const state = session.progress.find((item) => item.question_id === question.id);
          const open = question.id === selected;
          return (
            <li
              key={question.id}
              id={`judgment-${question.id}`}
              className={[
                'border transition-colors duration-150',
                open
                  ? 'border-[color:var(--color-primary-500)] bg-[color:var(--color-surface)]'
                  : 'border-[color:var(--color-line)]',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => onSelect(open ? '' : question.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                <span className="text-micro w-5 shrink-0 tabular-nums text-[color:var(--color-ink-400)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-body-sm flex-1 line-clamp-2">{question.question}</span>
                <span
                  className={[
                    'text-micro shrink-0 rounded-[var(--radius-chip)] px-2 py-[2px]',
                    // Coloured by the judgement rather than by whose output it
                    // is. Every chip in the purple AI tint made a weak answer
                    // look exactly like one that held, which is the real reason
                    // a finished session read as uniformly positive.
                    chipFor(turn?.evaluated_strength ?? ''),
                  ].join(' ')}
                >
                  {strengths[turn?.evaluated_strength ?? ''] ?? turn?.evaluated_strength}
                </span>
                <Icon name={open ? 'chevronUp' : 'chevronDown'} size={15} />
              </button>

              {open && turn ? (
                <div className="border-t border-[color:var(--color-line)] px-3 py-3">
                  <p className="text-micro mb-2 text-[color:var(--color-ink-400)]">
                    {decisions[turn.decision] ?? turn.decision}
                  </p>

                  {/* What the examiner recorded against the question itself.
                      Shown before the criteria because every session has it,
                      including ones recorded before the criteria were kept on
                      each turn, which would otherwise leave this panel with
                      nothing in it but a decision. */}
                  {(state?.defended_points ?? []).length > 0 ? (
                    <ul className="text-body-sm mb-3 space-y-1">
                      {(state?.defended_points ?? []).map((item) => (
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
                  ) : null}

                  {state?.gap_recorded ? (
                    <p className="text-body-sm mb-3 border-l-2 border-[color:var(--color-warning)] bg-[color:var(--color-tint-warn)] py-2 pl-3">
                      {state.gap_recorded}
                    </p>
                  ) : null}

                  {(turn.criteria_met ?? []).length > 0 ? (
                    <>
                      <h5 className="text-caption mb-1 font-medium text-[color:var(--color-success)]">
                        {dict.slideover.criteriaMet}
                      </h5>
                      <ul className="text-body-sm mb-3 space-y-1">
                        {(turn.criteria_met ?? []).map((item) => (
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
                    </>
                  ) : null}

                  {/* Said out loud when the detail is missing.
                      Without this, a question recorded before the criteria
                      were kept shows only the points that were accepted, and a
                      panel of nothing but ticks reads as a clean answer. The
                      absence of a warning is not the same as there being
                      nothing to warn about. */}
                  {(turn.criteria_met ?? []).length === 0 &&
                  (turn.criteria_missed ?? []).length === 0 ? (
                    <p className="text-micro text-[color:var(--color-ink-400)]">
                      {dict.slideover.judgments.noDetail}
                    </p>
                  ) : null}

                  {(turn.criteria_missed ?? []).length > 0 ? (
                    <>
                      <h5 className="text-caption mb-1 font-medium text-[color:var(--color-warning)]">
                        {dict.slideover.criteriaMissed}
                      </h5>
                      <ul className="text-body-sm space-y-1">
                        {(turn.criteria_missed ?? []).map((item) => (
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
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EvaluationPanel({
  evaluation,
  hasHistory,
  dict,
}: {
  evaluation: AnswerEvaluation | null;
  /** Whether the history below this panel has anything in it. */
  hasHistory: boolean;
  dict: Dictionary;
}) {
  if (!evaluation) {
    // Nothing at all to say, so say it. When the history below is populated,
    // this panel keeps quiet instead: telling a student no answer has been
    // judged yet, directly above a list of judged answers, reads as a fault in
    // the page rather than as the note about the live turn that it is.
    return hasHistory ? null : (
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

/**
 * The 4.00 indicator, with its arithmetic left open.
 *
 * The number is shown large because it is what a student looks for, and the
 * workings are shown underneath because a number handed over without them is
 * not something anyone can argue with. Everything here arrived computed from
 * the transcript; nothing on this panel was generated.
 */
function AssessmentPanel({
  assessment,
  dict,
}: {
  assessment: SessionAssessment;
  dict: Dictionary;
}) {
  const advices = dict.slideover.score.advices as Record<string, string>;
  // The backend may name a strength this build does not know, so the lookup is
  // widened and falls back to the raw value rather than rendering nothing.
  const strengths = dict.slideover.strength as Record<string, string>;

  return (
    <section className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <h4 className="text-caption mb-1 flex items-center gap-[6px] font-medium text-[color:var(--color-ink-600)]">
        {dict.slideover.score.heading}
        <Hint text={dict.slideover.score.hint} align="center" />
      </h4>

      <p className="mb-1">
        <span className="text-display tabular-nums text-[color:var(--color-primary-700)]">
          {assessment.score.toFixed(2)}
        </span>
        <span className="text-body-sm ml-2 text-[color:var(--color-ink-400)]">
          / {assessment.maximum.toFixed(2)}
        </span>
      </p>

      <p className="text-micro mb-4 text-[color:var(--color-ink-400)]">
        {fill(dict.slideover.score.scored, { count: assessment.questions_scored })}
        {assessment.questions_unanswered > 0
          ? ` · ${fill(dict.slideover.score.unanswered, {
              count: assessment.questions_unanswered,
            })}`
          : ''}
      </p>

      {assessment.advice.length > 0 ? (
        <div className="mb-4 border-l-2 border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-050)] py-2 pl-3">
          <h5 className="text-caption mb-1 flex items-center gap-[6px] font-medium text-[color:var(--color-primary-700)]">
            {dict.slideover.score.advice}
            <Hint text={dict.slideover.score.adviceHint} align="center" />
          </h5>
          <ul className="text-body-sm space-y-1">
            {assessment.advice.map((item) => (
              <li key={item.code + item.question_id}>
                {fill(advices[item.code] ?? item.code, { count: item.count })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <details>
        <summary className="text-caption cursor-pointer text-[color:var(--color-ink-600)]">
          {dict.slideover.score.breakdown}
        </summary>
        <ul className="mt-2 space-y-3">
          {assessment.breakdown.map((item) => (
            <li key={item.question_id} className="border-t border-[color:var(--color-line)] pt-2">
              <p className="text-body-sm mb-1">{item.question}</p>
              <p className="text-micro text-[color:var(--color-ink-400)]">
                {fill(dict.slideover.score.base, {
                  strength: strengths[item.strength] ?? item.strength,
                  base: item.base.toFixed(2),
                })}
                {' · '}
                {fill(dict.slideover.score.weight, { weight: item.weight.toFixed(1) })}
              </p>
              {item.deductions.map((line) => (
                <p key={line} className="text-micro text-[color:var(--color-warning)]">
                  {line}
                </p>
              ))}
              <p className="text-caption tabular-nums">{item.points.toFixed(2)}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
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
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  async function exportPdf() {
    if (!summary) return;
    setExporting(true);
    setExportError('');
    try {
      const { downloadReportPdf } = await import('@/lib/pdf');
      await downloadReportPdf(session, summary, dict, locale);
    } catch {
      // The Markdown export is still there underneath, so this is a setback
      // rather than a dead end, and it is named as one.
      setExportError(dict.report.pdfFailed);
    } finally {
      setExporting(false);
    }
  }

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
    <div className="print-report space-y-6">
      <AiLabel hint={dict.slideover.hints.report}>{dict.slideover.reportIntro}</AiLabel>

      {summary.assessment ? (
        <AssessmentPanel assessment={summary.assessment} dict={dict} />
      ) : null}

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

      <section className="no-print border-t border-[color:var(--color-line)] pt-4">
        {/* One button, and it produces the file. The print dialogue worked and
            asked a student to find a menu item, pick a destination, and hope
            the margins came out right, for something they may be handing to a
            supervisor. */}
        <button
          type="button"
          disabled={exporting}
          onClick={() => void exportPdf()}
          className="text-body-sm flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-4 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
        >
          <Icon name="file" size={16} />
          {exporting ? dict.report.preparing : dict.report.downloadPdf}
        </button>

        {/* Markdown stays, quieter. The two are for different readers: this one
            is pasted back into the next session, the PDF is handed over. */}
        <button
          type="button"
          onClick={() =>
            downloadReport(session, buildReportMarkdown(session, summary, dict, locale))
          }
          className="text-caption mt-2 flex h-9 w-full items-center justify-center gap-2 text-[color:var(--color-ink-600)] underline underline-offset-2"
        >
          {dict.report.download}
        </button>

        {exportError ? (
          <p role="alert" className="text-caption mt-2 text-[color:var(--color-danger)]">
            {exportError}
          </p>
        ) : null}
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
  /** The question the student is looking at, shared across the three panels. */
  selectedQuestionId?: string;
  onSelectQuestion?: (questionId: string) => void;
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
  selectedQuestionId = '',
  onSelectQuestion = () => {},
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
          <div className="space-y-6">
            {/* The answer just judged, in full. The history underneath carries
                every question that closed before it. */}
            <EvaluationPanel
              evaluation={evaluation}
              hasHistory={session.transcript.some(
                (turn) => turn.role === 'examiner' && Boolean(turn.evaluated_strength),
              )}
              dict={dict}
            />
            <JudgmentHistory
              session={session}
              selected={selectedQuestionId}
              onSelect={onSelectQuestion}
              dict={dict}
            />
          </div>
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
