'use client';

import { useEffect, useState } from 'react';

import { Icon } from '@/components/Icon';
import { fill, type Dictionary } from '@/lib/i18n';

/**
 * The six things this system ever does while a person waits.
 *
 * Naming them separately is the whole point. A single spinner for every one of
 * them says only that something is happening; these say which step is running,
 * and the step that matters most to trust, checking each quote back against the
 * manuscript, is the one a generic spinner would hide.
 */
export type AgentStage =
  | 'extracting'
  | 'reading'
  | 'verifying'
  | 'planning'
  | 'judging'
  | 'reporting'
  | 'citation';

/** The order the intake page works through before the defense opens. */
export const INTAKE_FLOW: AgentStage[] = ['reading', 'verifying', 'planning'];

const LINE = 'var(--color-line)';
const AI = 'var(--color-ai)';

/**
 * Pulling text out of an uploaded file: the document on the left, the plain
 * text it yields appearing on the right, line by line.
 */
function ExtractingArt() {
  const widths = [72, 60, 68, 44];

  return (
    <>
      <path
        d="M14 12 h44 l16 16 v84 h-60 Z"
        fill="var(--color-surface)"
        stroke={LINE}
      />
      <path d="M58 12 v16 h16" fill="none" stroke={LINE} />
      {[0, 1, 2, 3].map((index) => (
        <rect key={index} x="26" y={44 + index * 14} width={index === 3 ? 22 : 36} height="3" fill={LINE} />
      ))}

      <path className="a-draw" d="M84 62 H 128" stroke={AI} fill="none" />
      <polyline className="a-draw" points="120 55 128 62 120 69" stroke={AI} fill="none" />

      <rect x="140" y="20" width="94" height="86" fill="var(--color-tint-ai)" stroke={AI} />
      {widths.map((width, index) => (
        <rect
          key={index}
          className="a-appear"
          x="150"
          y={34 + index * 18}
          width={width}
          height="3"
          fill={AI}
          style={{ animationDelay: `${index * 260}ms` }}
        />
      ))}
    </>
  );
}

/**
 * Reading the draft: a page scanned top to bottom, with claims marked as they
 * are found.
 */
function ReadingArt() {
  const lines = [96, 84, 92, 70, 88, 78, 90, 62];
  const marks = [1, 3, 6];

  return (
    <>
      <rect x="62" y="8" width="116" height="108" fill="var(--color-surface)" stroke={LINE} />
      {lines.map((width, index) => (
        <rect
          key={index}
          x="72"
          y={20 + index * 12}
          width={width}
          height="3"
          fill={LINE}
        />
      ))}
      <rect className="a-scan" x="62" y="12" width="116" height="22" fill={AI} opacity="0.16" />
      {marks.map((index, order) => (
        <rect
          key={index}
          className="a-mark"
          x="72"
          y={20 + index * 12}
          width={lines[index]}
          height="3"
          fill={AI}
          style={{ animationDelay: `${order * 500}ms` }}
        />
      ))}
    </>
  );
}

/**
 * Verifying a quote: the sentence on the left is matched back to the line in
 * the manuscript it was taken from, and only then does it carry a tick.
 */
function VerifyingArt() {
  return (
    <>
      <rect x="6" y="36" width="82" height="44" fill="var(--color-tint-ai)" stroke={AI} />
      <rect x="16" y="50" width="62" height="3" fill={AI} />
      <rect x="16" y="60" width="48" height="3" fill={AI} />

      <rect x="150" y="8" width="84" height="108" fill="var(--color-surface)" stroke={LINE} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <rect key={index} x="160" y={20 + index * 12} width={64} height="3" fill={LINE} />
      ))}
      <rect className="a-appear" x="160" y="56" width="64" height="3" fill={AI} />

      <path className="a-draw" d="M88 58 C 112 58, 124 58, 150 58" stroke={AI} fill="none" />

      <g className="a-appear" style={{ animationDelay: '200ms' }}>
        <polyline points="112 44 118 50 130 36" stroke={AI} fill="none" strokeWidth="2" />
      </g>
    </>
  );
}

/**
 * Planning the examination: the questions change places as they are put in the
 * order a committee would ask them.
 */
function PlanningArt() {
  const rows = [
    { y: 10, width: 42, tone: 'var(--color-tint-warn)', edge: 'var(--color-warning)' },
    { y: 37, width: 30, tone: 'var(--color-hover)', edge: LINE },
    { y: 64, width: 52, tone: 'var(--color-tint-warn)', edge: 'var(--color-warning)' },
    { y: 91, width: 22, tone: 'var(--color-primary-050)', edge: LINE },
  ];

  return (
    <>
      {rows.map((row, index) => (
        <g
          key={row.y}
          className={index === 0 ? 'a-fall' : index === 1 ? 'a-rise' : undefined}
        >
          <rect x="52" y={row.y} width="136" height="20" fill="var(--color-surface)" stroke={LINE} />
          <rect x="60" y={row.y + 8} width={row.width} height="3" fill={LINE} />
          <rect
            x={172 - row.width / 3}
            y={row.y + 6}
            width={row.width / 3}
            height="8"
            fill={row.tone}
            stroke={row.edge}
          />
        </g>
      ))}
    </>
  );
}

/**
 * Weighing an answer: the answer on the left is read against what the question
 * actually asked for, one criterion at a time.
 */
function JudgingArt() {
  return (
    <>
      <rect x="6" y="24" width="98" height="76" fill="var(--color-primary-050)" stroke={LINE} />
      {[0, 1, 2, 3, 4].map((index) => (
        <rect key={index} x="16" y={36 + index * 13} width={index === 4 ? 48 : 78} height="3" fill="var(--color-primary-500)" opacity="0.55" />
      ))}

      <line x1="120" y1="16" x2="120" y2="108" stroke={LINE} strokeDasharray="3 4" />

      {[0, 1, 2].map((index) => (
        <g key={index}>
          <rect x="140" y={30 + index * 26} width="14" height="14" fill="none" stroke={LINE} />
          <rect x="162" y={35 + index * 26} width={index === 2 ? 40 : 66} height="3" fill={LINE} />
          <polyline
            className="a-appear"
            points={`143 ${37 + index * 26} 146 ${41 + index * 26} 152 ${33 + index * 26}`}
            stroke={AI}
            fill="none"
            strokeWidth="2"
            style={{ animationDelay: `${index * 320}ms` }}
          />
        </g>
      ))}
    </>
  );
}

/**
 * Writing the report: what held and what is still open are gathered from the
 * transcript into one account, rather than written fresh from an impression.
 */
function ReportingArt() {
  const held = [18, 44, 70];
  const open = [18, 44, 70];

  return (
    <>
      <rect x="88" y="12" width="64" height="100" fill="var(--color-surface)" stroke={LINE} />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <rect key={index} x="98" y={24 + index * 14} width={index % 2 ? 34 : 44} height="3" fill={LINE} />
      ))}

      {held.map((y, index) => (
        <rect
          key={`h-${y}`}
          className="a-gather"
          x="8"
          y={y}
          width="58"
          height="18"
          fill="var(--color-tint-ok)"
          stroke="var(--color-success)"
          style={{ animationDelay: `${index * 240}ms`, ['--agent-from' as string]: '-22px' }}
        />
      ))}

      {open.map((y, index) => (
        <rect
          key={`o-${y}`}
          className="a-gather"
          x="174"
          y={y}
          width="58"
          height="18"
          fill="var(--color-tint-warn)"
          stroke="var(--color-warning)"
          style={{ animationDelay: `${index * 240 + 120}ms`, ['--agent-from' as string]: '22px' }}
        />
      ))}
    </>
  );
}

/**
 * Checking a citation: the source is read across for the passage that would
 * carry the claim printed above it.
 */
function CitationArt() {
  return (
    <>
      <rect x="20" y="12" width="200" height="4" fill={AI} />
      <rect x="20" y="38" width="200" height="76" fill="var(--color-surface)" stroke={LINE} />
      {[0, 1, 2, 3, 4].map((index) => (
        <rect key={index} x="32" y={50 + index * 14} width={index === 4 ? 108 : 176} height="3" fill={LINE} />
      ))}

      <rect className="a-sweep" x="32" y={74} width="62" height="11" fill={AI} opacity="0.18" />
      <path className="a-draw" d="M120 78 L 120 16" stroke={AI} strokeDasharray="4 4" fill="none" />
    </>
  );
}

const ART: Record<AgentStage, () => React.ReactElement> = {
  extracting: ExtractingArt,
  reading: ReadingArt,
  verifying: VerifyingArt,
  planning: PlanningArt,
  judging: JudgingArt,
  reporting: ReportingArt,
  citation: CitationArt,
};

interface Props {
  active: boolean;
  stage: AgentStage;
  dict: Dictionary;
  /** The whole sequence, when the page runs through more than one stage. */
  steps?: AgentStage[];
}

/**
 * What the agent is doing, drawn rather than described.
 *
 * It can be dismissed, and that is deliberate. During a defense the transcript
 * behind this is the student's own work and their own answers, and a panel that
 * cannot be moved out of the way would be holding their reading hostage to a
 * progress indicator. Dismissing it leaves the bar and the elapsed counter in
 * place, so nothing about the wait becomes invisible.
 */
export function AgentOverlay({ active, stage, dict, steps }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      setDismissed(false);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active || dismissed) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDismissed(true);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, dismissed]);

  if (!active || dismissed) return null;

  const copy = dict.agent.stages[stage];
  const Drawing = ART[stage];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(31,39,51,0.28)] p-6"
    >
      <div className="w-full max-w-[520px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[0_16px_48px_rgba(31,39,51,0.22)]">
        <div className="flex items-center gap-3 border-b border-[color:var(--color-line)] bg-[color:var(--color-tint-ai)] px-5 py-2 text-[color:var(--color-ai)]">
          <Icon name="cpu" size={18} />
          <span className="text-micro font-medium tracking-[0.06em] uppercase">
            {dict.agent.working}
          </span>
          <span className="text-caption ml-auto tabular-nums">
            {fill(dict.ai.elapsed, { seconds })}
          </span>
        </div>

        <div className="px-5 pt-5">
          <svg
            viewBox="0 0 240 124"
            className="agent-anim mx-auto block h-[124px] w-full max-w-[280px]"
            aria-hidden="true"
            focusable="false"
            strokeWidth="1.5"
          >
            <Drawing />
          </svg>
        </div>

        <div className="px-5 pb-5">
          <h2 className="text-h3 mt-4 mb-1">{copy.title}</h2>
          <p className="text-body-sm text-[color:var(--color-ink-600)]">{copy.body}</p>

          {steps && steps.length > 1 ? (
            <ol className="mt-5 space-y-2 border-t border-[color:var(--color-line)] pt-4">
              {steps.map((step) => {
                const done = steps.indexOf(step) < steps.indexOf(stage);
                const current = step === stage;
                return (
                  <li key={step} className="text-caption flex items-center gap-2">
                    <span className="shrink-0">
                      {done ? (
                        <Icon
                          name="check"
                          size={16}
                          className="text-[color:var(--color-success)]"
                        />
                      ) : current ? (
                        <span className="ai-pulse block h-[10px] w-[10px] rounded-[var(--radius-chip)] bg-[color:var(--color-ai)]" />
                      ) : (
                        <span className="block h-[10px] w-[10px] rounded-[var(--radius-chip)] border border-[color:var(--color-line)]" />
                      )}
                    </span>
                    <span
                      className={
                        current
                          ? 'font-medium text-[color:var(--color-ai)]'
                          : 'text-[color:var(--color-ink-600)]'
                      }
                    >
                      {dict.agent.stages[step].title}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-[color:var(--color-line)] pt-4">
            <p className="text-caption text-[color:var(--color-ink-600)]">
              {dict.ai.doNotClose}
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-caption h-8 shrink-0 rounded-[var(--radius-action)] border border-[color:var(--color-line)] px-3 transition-colors duration-150 hover:bg-[color:var(--color-hover)]"
            >
              {dict.agent.dismiss}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
