import { fill, type Dictionary, type Locale } from '@/lib/i18n';
import type { SessionState, SessionSummary } from '@/lib/types';

/**
 * The session, as a document the student keeps.
 *
 * Markdown, built in the browser from what is already on screen rather than
 * asked of the server. A report a student cannot take with them is a report
 * they will read once; one that opens in the editor they write their thesis in
 * is one they can work against. A PDF is offered separately, through the
 * browser's own print dialogue, because the two are for different readers:
 * this one is pasted back into the next session, that one is handed to a
 * supervisor.
 *
 * Everything here is copied, never rewritten. The examiner's words, the
 * student's answers, and the quoted passages appear exactly as they do in the
 * session, because a report that paraphrased the transcript would be a second
 * account of the defense rather than a record of it.
 */
export function buildReportMarkdown(
  session: SessionState,
  summary: SessionSummary,
  dict: Dictionary,
  locale: Locale,
): string {
  const lines: string[] = [];
  const when = session.updated_at ?? session.created_at;

  lines.push(`# ${dict.app.name}: ${dict.slideover.tabs.report}`);
  lines.push('');
  lines.push(`${session.session_id}`);
  if (when) {
    const date = new Date(when);
    if (!Number.isNaN(date.getTime())) {
      lines.push(
        new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(date),
      );
    }
  }
  lines.push('');

  // The indicator goes near the top, with its workings, because a report that
  // states a number and explains it three pages later is a report that gets
  // quoted without the explanation.
  const assessment = summary.assessment;
  if (assessment) {
    lines.push(`## ${dict.slideover.score.heading}`);
    lines.push('');
    lines.push(`**${assessment.score.toFixed(2)} / ${assessment.maximum.toFixed(2)}**`);
    lines.push('');
    lines.push(fill(dict.slideover.score.scored, { count: assessment.questions_scored }));
    lines.push('');

    if (assessment.advice.length > 0) {
      const advices = dict.slideover.score.advices as Record<string, string>;
      lines.push(`### ${dict.slideover.score.advice}`);
      lines.push('');
      for (const item of assessment.advice) {
        lines.push(`- ${fill(advices[item.code] ?? item.code, { count: item.count })}`);
      }
      lines.push('');
    }

    if (assessment.breakdown.length > 0) {
      lines.push(`### ${dict.slideover.score.breakdown}`);
      lines.push('');
      for (const item of assessment.breakdown) {
        lines.push(`- **${item.points.toFixed(2)}** ${item.question}`);
        for (const line of item.deductions) lines.push(`  - ${line}`);
      }
      lines.push('');
    }
  }

  const section = (title: string, items: string[], empty = '') => {
    lines.push(`## ${title}`);
    lines.push('');
    if (items.length === 0) {
      if (empty) lines.push(empty);
    } else {
      items.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push('');
  };

  section(dict.slideover.defended, summary.strong_points, dict.slideover.nothingDefended);
  section(dict.slideover.stillOpen, summary.remaining_gaps);
  section(dict.slideover.patterns, summary.recurring_gap_patterns);
  lines.push(`_${dict.slideover.patternsHelp}_`);
  lines.push('');

  if (summary.rubric_revealed_for.length > 0) {
    section(dict.rubric.reportTitle, summary.rubric_revealed_for);
  }

  if (summary.closing_remark) {
    lines.push(`## ${dict.slideover.closingRemark}`);
    lines.push('');
    lines.push(summary.closing_remark);
    lines.push('');
  }

  lines.push(`## ${dict.slideover.tabs.weakness}`);
  lines.push('');
  session.findings.forEach((finding) => {
    const severity = dict.slideover.severity[finding.severity] ?? finding.severity;
    const category = dict.slideover.category[finding.category] ?? finding.category;
    lines.push(`### ${finding.id} · ${severity} · ${category}`);
    lines.push('');
    lines.push(`> ${finding.quote}`);
    lines.push('');
    if (finding.quote_verified) {
      lines.push(`_${dict.slideover.quoteVerified}_`);
      lines.push('');
    }
    lines.push(finding.why_weak);
    lines.push('');
  });

  lines.push(`## ${dict.room.transcriptLabel}`);
  lines.push('');
  session.transcript.forEach((turn) => {
    const who = turn.role === 'examiner' ? dict.room.examiner : dict.room.you;
    const tag = turn.question_id ? ` (${turn.question_id})` : '';
    lines.push(`**${who}${tag}**`);
    lines.push('');
    lines.push(turn.text);
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push(fill(dict.report.footer, { name: dict.app.name }));
  lines.push('');

  return lines.join('\n');
}

/** Hand the built document to the browser as a file. */
export function downloadReport(session: SessionState, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `citra-viva-${session.session_id}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // The blob stays in memory for the life of the document otherwise, and this
  // one carries a whole transcript.
  URL.revokeObjectURL(url);
}
