'use client';

import { useState } from 'react';

import { Icon } from '@/components/Icon';
import type {
  AnswerEvaluation,
  SessionSummary,
  WeaknessFinding,
} from '@/lib/types';

const CATEGORY_LABEL: Record<string, string> = {
  unsupported_claim: 'Klaim tanpa dukungan',
  causal_language_non_experimental: 'Bahasa kausal, desain non-eksperimen',
  overgeneralization: 'Generalisasi berlebihan',
  unaddressed_limitation: 'Batasan tidak dijawab',
  other: 'Lainnya',
};

const SEVERITY_LABEL: Record<string, string> = {
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
};

const STRENGTH_LABEL: Record<string, string> = {
  strong: 'Bertahan',
  partial: 'Bertahan sebagian',
  weak: 'Lemah',
  evasive: 'Menghindar',
};

const DECISION_LABEL: Record<string, string> = {
  press_deeper: 'Ditekan lebih dalam',
  ask_clarification: 'Diberi kesempatan klarifikasi',
  move_on: 'Lanjut ke topik berikutnya',
  record_gap: 'Dicatat sebagai celah',
};

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
function AiLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-micro mb-3 flex items-center gap-[6px] text-[color:var(--color-ai)]">
      <Icon name="cpu" size={16} />
      {children}
    </p>
  );
}

function FindingCard({ finding }: { finding: WeaknessFinding }) {
  return (
    <article className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-body-sm font-medium">{finding.id}</span>
        <span
          className={`text-micro rounded-[var(--radius-chip)] px-2 py-[2px] font-medium ${severityTone(finding.severity)}`}
        >
          {SEVERITY_LABEL[finding.severity] ?? finding.severity}
        </span>
        <span className="text-micro text-[color:var(--color-ink-600)]">
          {CATEGORY_LABEL[finding.category] ?? finding.category}
        </span>
      </header>

      <blockquote className="mb-3 border-l-2 border-[color:var(--color-primary-500)] bg-[color:var(--color-primary-050)] py-2 pl-3">
        <p className="text-body-sm font-[family-name:var(--font-serif)]">{finding.quote}</p>
        {finding.quote_verified ? (
          <p className="text-micro mt-2 flex items-center gap-[6px] text-[color:var(--color-success)]">
            <Icon name="check" size={14} />
            Kutipan terverifikasi ada di naskah Anda
          </p>
        ) : null}
      </blockquote>

      <p className="text-body-sm text-[color:var(--color-ink-600)]">{finding.why_weak}</p>
    </article>
  );
}

function EvaluationPanel({ evaluation }: { evaluation: AnswerEvaluation | null }) {
  if (!evaluation) {
    return (
      <p className="text-body-sm text-[color:var(--color-ink-600)]">
        Penilaian jawaban akan muncul di sini setelah Anda menjawab pertanyaan pertama.
      </p>
    );
  }

  return (
    <div className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
      <AiLabel>Penilaian oleh agent penguji</AiLabel>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-body-sm font-medium">
          {STRENGTH_LABEL[evaluation.strength] ?? evaluation.strength}
        </span>
        <span className="text-micro rounded-[var(--radius-chip)] bg-[color:var(--color-tint-ai)] px-2 py-[2px] font-medium text-[color:var(--color-ai)]">
          {DECISION_LABEL[evaluation.decision] ?? evaluation.decision}
        </span>
      </div>

      {evaluation.criteria_met.length > 0 ? (
        <section className="mb-4">
          <h4 className="text-caption mb-1 font-medium text-[color:var(--color-success)]">
            Yang Anda penuhi
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
            Yang belum tersentuh
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
  onClose,
  closing,
  canClose,
}: {
  summary: SessionSummary | null;
  onClose: () => void;
  closing: boolean;
  canClose: boolean;
}) {
  if (!summary) {
    return (
      <div>
        <p className="text-body-sm mb-4 text-[color:var(--color-ink-600)]">
          {canClose
            ? 'Sidang selesai. Susun laporan untuk melihat apa yang bertahan, apa yang masih terbuka, dan pola yang dibawa ke sesi berikutnya.'
            : 'Laporan tersedia setelah seluruh pertanyaan selesai dijawab.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          disabled={!canClose || closing}
          className="h-10 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-4 text-body-sm font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
        >
          {closing ? 'Menyusun laporan' : 'Susun laporan sesi'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AiLabel>Laporan disusun oleh agent refleksi</AiLabel>

      <section>
        <h4 className="text-caption mb-2 font-medium text-[color:var(--color-success)]">
          Berhasil dipertahankan
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
            Tidak ada poin yang bertahan pada sesi ini.
          </p>
        )}
      </section>

      <section>
        <h4 className="text-caption mb-2 font-medium text-[color:var(--color-warning)]">
          Masih belum terjawab
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
          Pola yang dibawa ke sesi berikutnya
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
          Tempelkan poin ini saat memulai sesi berikutnya agar diuji lebih dulu.
        </p>
      </section>

      {summary.closing_remark ? (
        <section>
          <h4 className="text-caption mb-2 font-medium text-[color:var(--color-ink-600)]">
            Penutup penguji
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
  findings: WeaknessFinding[];
  evaluation: AnswerEvaluation | null;
  summary: SessionSummary | null;
  finished: boolean;
  closing: boolean;
  onClose: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Slideover({
  findings,
  evaluation,
  summary,
  finished,
  closing,
  onClose,
  activeTab,
  onTabChange,
}: Props) {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'weakness', label: 'Peta kelemahan' },
    { id: 'evaluation', label: 'Penilaian' },
    { id: 'report', label: 'Laporan' },
  ];

  return (
    <aside
      aria-label="Panel kontekstual"
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
            <AiLabel>Peta kelemahan hasil analisis draf</AiLabel>
            {findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        ) : null}

        {activeTab === 'evaluation' ? <EvaluationPanel evaluation={evaluation} /> : null}

        {activeTab === 'report' ? (
          <ReportPanel
            summary={summary}
            onClose={onClose}
            closing={closing}
            canClose={finished}
          />
        ) : null}
      </div>
    </aside>
  );
}

export type { Tab };
