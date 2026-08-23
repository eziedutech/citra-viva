'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { SAMPLE_DRAFT_ID } from '@/lib/sample-draft';
import type { StartSessionResponse } from '@/lib/types';

const MIN_DRAFT_CHARS = 200;

/**
 * Honest progress labels. Preparation is two model calls and takes about a
 * minute, and a blind spinner for that long reads as a hang. Naming the work
 * also happens to be the truth: the agent really is doing these two things in
 * this order.
 */
const STAGES = [
  'Membaca draf dan menandai klaim kunci',
  'Memeriksa setiap kutipan terhadap naskah',
  'Menyusun urutan pertanyaan penguji',
];

export function DraftIntake() {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [gaps, setGaps] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const tooShort = draft.trim().length > 0 && draft.trim().length < MIN_DRAFT_CHARS;
  const canStart = draft.trim().length >= MIN_DRAFT_CHARS && !busy;

  async function start() {
    setBusy(true);
    setError('');
    setStage(0);
    timer.current = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 12_000);

    try {
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_text: draft,
          recurring_gaps: gaps
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Sesi gagal dimulai.');

      const start = data as StartSessionResponse;
      // The room reads the session from the API on load, so nothing needs to be
      // handed across the navigation. A refresh mid-defense loses nothing.
      router.push(`/sesi/${start.session_id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sesi gagal dimulai.');
      setBusy(false);
      if (timer.current) clearInterval(timer.current);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 py-16">
      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-[color:var(--color-primary-700)]">
          <Icon name="shield" size={20} />
          <span className="text-body-sm font-medium">CITRA Viva</span>
        </div>
        <h1 className="text-display mb-3">Uji draf Anda sebelum penguji yang melakukannya</h1>
        <p className="text-body-lg max-w-[60ch] text-[color:var(--color-ink-600)]">
          Tempel naskah riset Anda. Agent membacanya utuh, menyusun peta titik terlemah argumen,
          lalu menguji Anda seperti penguji sungguhan. Ia tidak akan menuliskan jawaban untuk Anda.
        </p>
      </header>

      <section className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
        <div className="mb-2 flex items-end justify-between gap-4">
          <label htmlFor="draft" className="text-body-sm font-medium">
            Naskah riset
          </label>
          <button
            type="button"
            onClick={() => setDraft(SAMPLE_DRAFT_ID)}
            disabled={busy}
            className="text-caption text-[color:var(--color-primary-700)] underline underline-offset-2 disabled:text-[color:var(--color-ink-400)]"
          >
            Gunakan draf contoh
          </button>
        </div>

        <textarea
          id="draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy}
          rows={14}
          spellCheck={false}
          placeholder="Tempel bab pendahuluan, metodologi, dan hasil di sini."
          className="text-editor w-full resize-y border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 font-[family-name:var(--font-serif)] outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
        />

        <p className="text-caption mt-2 text-[color:var(--color-ink-600)]">
          {draft.trim().length.toLocaleString('id-ID')} karakter
          {tooShort ? ` · minimal ${MIN_DRAFT_CHARS} karakter untuk dapat dianalisis` : ''}
        </p>

        <div className="mt-6 border-t border-[color:var(--color-line)] pt-5">
          <label htmlFor="gaps" className="text-body-sm mb-1 block font-medium">
            Kelemahan yang belum diperbaiki dari sesi sebelumnya
            <span className="ml-2 font-normal text-[color:var(--color-ink-600)]">opsional</span>
          </label>
          <p className="text-caption mb-2 max-w-[60ch] text-[color:var(--color-ink-600)]">
            Satu per baris. Pertanyaan yang menyasar poin ini akan diajukan lebih dulu, meskipun
            temuan lain berbobot lebih tinggi.
          </p>
          <textarea
            id="gaps"
            value={gaps}
            onChange={(event) => setGaps(event.target.value)}
            disabled={busy}
            rows={3}
            className="text-body-sm w-full resize-y border border-[color:var(--color-line)] p-3 outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
          />
        </div>
      </section>

      {error ? (
        <p
          role="alert"
          className="text-body-sm mt-4 flex items-start gap-2 border border-[color:var(--color-danger)] bg-[color:var(--color-tint-danger)] p-3 text-[color:var(--color-danger)]"
        >
          <Icon name="alert" size={18} className="mt-[2px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="h-10 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 text-body-sm font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
        >
          {busy ? 'Menyiapkan sidang' : 'Mulai sidang'}
        </button>

        {busy ? (
          <p
            aria-live="polite"
            className="text-body-sm flex items-center gap-2 text-[color:var(--color-ai)]"
          >
            <Icon name="cpu" size={18} />
            {STAGES[stage]}
          </p>
        ) : null}
      </div>
    </div>
  );
}
