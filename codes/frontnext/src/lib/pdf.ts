/**
 * The session report as a real PDF, made in the browser.
 *
 * There was already a print stylesheet, and printing to PDF works. It also
 * asks a student to find the right item in a browser menu, choose a
 * destination, and trust that the margins come out right, for something they
 * may be handing to a supervisor. One button that produces the file is a
 * different thing.
 *
 * Vector text rather than a screenshot of the page. The report is selectable,
 * searchable, and copyable out of, which matters because the whole point of it
 * is the examiner's own wording: a picture of that wording cannot be quoted.
 *
 * The library is loaded only when somebody asks for a PDF. It is around a
 * megabyte with its fonts, and a student who never opens the report should
 * never pay for it.
 *
 * Nothing here is generated. Every line is copied from the session, the same
 * source the Markdown export and the screen both read from, so the three can
 * never disagree.
 */

import type { Dictionary, Locale } from '@/lib/i18n';
import { fill } from '@/lib/i18n';
import type { SessionState, SessionSummary } from '@/lib/types';

const INK = '#202124';
const GREY = '#5f6368';
const BLUE = '#1a73e8';
const PURPLE = '#7b4fbf';
const SUCCESS = '#137333';
const WARNING = '#b06000';

/** Read the logo once and keep it, since a student may export more than once. */
let logo: string | null = null;

async function logoData(): Promise<string | null> {
  if (logo !== null) return logo;
  try {
    const response = await fetch('/citra-viva-logo.png');
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    logo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return logo;
  } catch {
    // A report without the logo is still the report. Failing the export over
    // a decoration would be the wrong trade.
    logo = '';
    return null;
  }
}

function formattedDate(session: SessionState, locale: Locale): string {
  const when = session.updated_at ?? session.created_at;
  if (!when) return '';
  const date = new Date(when);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(
    date,
  );
}

/**
 * Build the document, then hand it to the browser as a download.
 *
 * Exported separately from the click handler so the layout can be reasoned
 * about on its own, and so a failure to load the library is reported as a
 * failure to export rather than as a page that did nothing.
 */
export async function downloadReportPdf(
  session: SessionState,
  summary: SessionSummary,
  dict: Dictionary,
  locale: Locale,
): Promise<void> {
  const [{ default: pdfMake }, fonts, image] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/fonts/Roboto'),
    logoData(),
  ]);

  const container = (fonts as { default?: unknown }).default ?? fonts;
  (pdfMake as unknown as { addVirtualFileSystem: (vfs: unknown) => void }).addVirtualFileSystem(
    container,
  );

  const assessment = summary.assessment;
  const advices = dict.slideover.score.advices as Record<string, string>;
  const strengths = dict.slideover.strength as Record<string, string>;

  const content: Record<string, unknown>[] = [];

  // --- masthead -----------------------------------------------------------
  content.push({
    columns: [
      image
        ? { image, width: 92, margin: [0, 0, 0, 0] }
        : { text: dict.app.name, style: 'wordmark' },
      {
        stack: [
          { text: dict.slideover.tabs.report, style: 'title' },
          { text: formattedDate(session, locale), style: 'meta' },
          { text: session.session_id, style: 'meta' },
        ],
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 6],
  });

  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#dadce0' }],
    margin: [0, 0, 0, 16],
  });

  // --- the indicator ------------------------------------------------------
  if (assessment) {
    content.push({ text: dict.slideover.score.heading, style: 'section' });
    content.push({
      columns: [
        {
          width: 'auto',
          text: `${assessment.score.toFixed(2)}`,
          fontSize: 30,
          color: BLUE,
          margin: [0, 0, 6, 0],
        },
        {
          width: '*',
          text: `/ ${assessment.maximum.toFixed(2)}\n${fill(dict.slideover.score.scored, {
            count: assessment.questions_scored,
          })}`,
          style: 'meta',
          margin: [0, 12, 0, 0],
        },
      ],
      margin: [0, 0, 0, 4],
    });
    content.push({ text: dict.slideover.score.hint, style: 'note', margin: [0, 0, 0, 12] });

    if (assessment.advice.length > 0) {
      content.push({ text: dict.slideover.score.advice, style: 'subsection' });
      content.push({
        ul: assessment.advice.map((item) =>
          fill(advices[item.code] ?? item.code, { count: item.count }),
        ),
        style: 'body',
        margin: [0, 0, 0, 12],
      });
    }

    if (assessment.breakdown.length > 0) {
      content.push({ text: dict.slideover.score.breakdown, style: 'subsection' });
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 46, 44],
          body: [
            [
              { text: dict.slideover.tabs.evaluation, style: 'th' },
              { text: dict.slideover.score.heading, style: 'th', alignment: 'right' },
              { text: 'weight', style: 'th', alignment: 'right' },
            ],
            ...assessment.breakdown.map((item) => [
              {
                stack: [
                  { text: item.question, style: 'body' },
                  ...item.deductions.map((line) => ({ text: line, style: 'deduction' })),
                ],
              },
              { text: item.points.toFixed(2), style: 'body', alignment: 'right' },
              { text: item.weight.toFixed(1), style: 'meta', alignment: 'right' },
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 16],
      });
    }
  }

  // --- what held ----------------------------------------------------------
  content.push({ text: dict.slideover.defended, style: 'section', color: SUCCESS });
  content.push(
    summary.strong_points.length > 0
      ? { ul: summary.strong_points, style: 'body', margin: [0, 0, 0, 12] }
      : { text: dict.slideover.nothingDefended, style: 'note', margin: [0, 0, 0, 12] },
  );

  // --- what is still open -------------------------------------------------
  content.push({ text: dict.slideover.stillOpen, style: 'section', color: WARNING });
  content.push(
    summary.remaining_gaps.length > 0
      ? { ul: summary.remaining_gaps, style: 'body', margin: [0, 0, 0, 12] }
      : { text: '-', style: 'note', margin: [0, 0, 0, 12] },
  );

  // --- patterns -----------------------------------------------------------
  if (summary.recurring_gap_patterns.length > 0) {
    content.push({ text: dict.slideover.patterns, style: 'section' });
    content.push({ text: dict.slideover.patternsHelp, style: 'note' });
    content.push({
      ul: summary.recurring_gap_patterns,
      style: 'body',
      margin: [0, 4, 0, 12],
    });
  }

  if (summary.closing_remark) {
    content.push({ text: dict.slideover.closingRemark, style: 'section' });
    content.push({ text: summary.closing_remark, style: 'quote', margin: [0, 0, 0, 12] });
  }

  // --- the transcript, because the report is built from it ----------------
  content.push({ text: dict.room.transcriptLabel, style: 'section', pageBreak: 'before' });
  for (const turn of session.transcript) {
    const examiner = turn.role === 'examiner';
    content.push({
      text: examiner ? dict.room.examiner : dict.room.you,
      style: 'speaker',
      color: examiner ? PURPLE : BLUE,
    });
    content.push({ text: turn.text, style: 'body', margin: [0, 0, 0, 8] });
    if (examiner && turn.evaluated_strength) {
      content.push({
        text: strengths[turn.evaluated_strength] ?? turn.evaluated_strength,
        style: 'deduction',
        margin: [0, -6, 0, 8],
      });
    }
  }

  const document = {
    info: {
      title: `${dict.app.name} ${dict.slideover.tabs.report} ${session.session_id}`,
      creator: dict.app.name,
    },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 48],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: INK, lineHeight: 1.35 },
    styles: {
      wordmark: { fontSize: 16, bold: true, color: INK },
      title: { fontSize: 15, bold: true, color: INK },
      meta: { fontSize: 8.5, color: GREY },
      section: { fontSize: 11.5, bold: true, margin: [0, 8, 0, 4] },
      subsection: { fontSize: 10, bold: true, margin: [0, 4, 0, 3] },
      body: { fontSize: 10 },
      note: { fontSize: 8.5, color: GREY, italics: true },
      deduction: { fontSize: 8, color: WARNING },
      th: { fontSize: 8.5, bold: true, color: GREY },
      speaker: { fontSize: 8.5, bold: true, margin: [0, 4, 0, 2] },
      quote: { fontSize: 10, italics: true },
    },
    footer: (current: number, total: number) => ({
      columns: [
        { text: dict.app.name, style: 'meta', margin: [40, 0, 0, 0] },
        {
          text: `${current} / ${total}`,
          style: 'meta',
          alignment: 'right',
          margin: [0, 0, 40, 0],
        },
      ],
    }),
    content,
  };

  (pdfMake as unknown as { createPdf: (definition: unknown) => { download: (name: string) => void } })
    .createPdf(document)
    .download(`citra-viva-${session.session_id}.pdf`);
}
