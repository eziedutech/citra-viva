'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { QuestionSidebar } from '@/components/QuestionSidebar';
import { Slideover, type Tab } from '@/components/Slideover';
import { normalizeSession } from '@/lib/session';
import type {
  AnswerEvaluation,
  CloseSessionResponse,
  SessionState,
  SessionSummary,
  SessionTurnResult,
  TranscriptTurn,
} from '@/lib/types';

interface Props {
  initial: SessionState;
}

export function DefenseRoom({ initial }: Props) {
  const [session, setSession] = useState(initial);
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [adjustments, setAdjustments] = useState<string[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(initial.summary);
  const [tab, setTab] = useState<Tab>('weakness');
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const finished = session.current_index >= session.questions.length;
  const answered = session.transcript.filter((turn) => turn.role === 'student').length;

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session.transcript.length, thinking]);

  async function submit() {
    const text = answer.trim();
    if (!text || thinking) return;

    setThinking(true);
    setError('');

    // The answer is shown immediately rather than after the round trip. A turn
    // takes about half a minute, and watching your own words sit in a box that
    // whole time reads as a broken form.
    const optimistic: TranscriptTurn = {
      role: 'student',
      text,
      question_id: session.questions[session.current_index]?.id ?? '',
      timestamp: null,
      evaluated_strength: '',
      decision: '',
    };
    setSession((current) => ({ ...current, transcript: [...current.transcript, optimistic] }));
    setAnswer('');

    try {
      const response = await fetch(`/api/sessions/${session.session_id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Jawaban gagal dikirim.');

      const turn = data as SessionTurnResult;
      setEvaluation(turn.evaluation);
      setAdjustments(turn.adjustments);
      setTab('evaluation');

      // The server is the source of truth for the transcript, so the optimistic
      // turn is replaced rather than appended to.
      const fresh = await fetch(`/api/sessions/${session.session_id}`);
      if (fresh.ok) setSession(normalizeSession((await fresh.json()) as SessionState));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Jawaban gagal dikirim.');
      setSession((current) => ({
        ...current,
        transcript: current.transcript.filter((turn) => turn !== optimistic),
      }));
      setAnswer(text);
    } finally {
      setThinking(false);
    }
  }

  async function closeSession() {
    setClosing(true);
    setError('');
    try {
      const response = await fetch(`/api/sessions/${session.session_id}/close`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Laporan gagal disusun.');
      setSummary((data as CloseSessionResponse).summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Laporan gagal disusun.');
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="flex h-14 items-center justify-between border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-[color:var(--color-primary-700)]"
          >
            <Icon name="shield" size={20} />
            <span className="text-body-sm font-medium">CITRA Viva</span>
          </Link>
          <span className="text-caption text-[color:var(--color-ink-400)]">/</span>
          <span className="text-body-sm text-[color:var(--color-ink-600)]">Sidang latihan</span>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-body-sm text-[color:var(--color-ink-600)]">
            Pertanyaan {Math.min(session.current_index + 1, session.questions.length)} dari{' '}
            {session.questions.length}
          </span>
          <span className="text-caption text-[color:var(--color-ink-400)]">
            {answered} jawaban tersimpan
          </span>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[240px_1fr_380px]">
        <QuestionSidebar
          questions={session.questions}
          progress={session.progress}
          currentIndex={session.current_index}
        />

        <main className="grid min-h-0 grid-rows-[1fr_auto] bg-[color:var(--color-canvas)]">
          <div className="panel-scroll px-8 py-6" tabIndex={0} aria-label="Transkrip sidang">
            <div className="mx-auto max-w-[680px] space-y-5">
              {session.transcript.map((turn, index) => (
                <article
                  key={`${index}-${turn.text.slice(0, 24)}`}
                  className={
                    turn.role === 'examiner'
                      ? 'border-l-2 border-[color:var(--color-ai)] bg-[color:var(--color-surface)] p-4'
                      : 'border border-[color:var(--color-line)] bg-[color:var(--color-primary-050)] p-4'
                  }
                >
                  <p
                    className={[
                      'text-micro mb-2 flex items-center gap-[6px] font-medium',
                      turn.role === 'examiner'
                        ? 'text-[color:var(--color-ai)]'
                        : 'text-[color:var(--color-primary-700)]',
                    ].join(' ')}
                  >
                    {turn.role === 'examiner' ? <Icon name="cpu" size={16} /> : null}
                    {turn.role === 'examiner' ? 'Penguji' : 'Anda'}
                    {turn.question_id ? (
                      <span className="font-normal text-[color:var(--color-ink-400)]">
                        {turn.question_id}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-editor font-[family-name:var(--font-serif)] whitespace-pre-wrap">
                    {turn.text}
                  </p>
                </article>
              ))}

              {thinking ? (
                <p
                  aria-live="polite"
                  className="text-body-sm flex items-center gap-2 px-4 text-[color:var(--color-ai)]"
                >
                  <Icon name="cpu" size={18} />
                  Penguji menimbang jawaban Anda
                </p>
              ) : null}

              {adjustments.length > 0 ? (
                <div className="border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
                  <p className="text-micro mb-1 font-medium text-[color:var(--color-ink-600)]">
                    Aturan sesi yang diterapkan atas keputusan model
                  </p>
                  <ul className="text-caption space-y-1 text-[color:var(--color-ink-600)]">
                    {adjustments.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div ref={transcriptEnd} />
            </div>
          </div>

          <div className="border-t border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-8 py-4">
            <div className="mx-auto max-w-[680px]">
              {error ? (
                <p
                  role="alert"
                  className="text-body-sm mb-3 flex items-start gap-2 border border-[color:var(--color-danger)] bg-[color:var(--color-tint-danger)] p-3 text-[color:var(--color-danger)]"
                >
                  <Icon name="alert" size={18} className="mt-[2px] shrink-0" />
                  <span>{error}</span>
                </p>
              ) : null}

              {finished ? (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-body-sm text-[color:var(--color-ink-600)]">
                    Seluruh pertanyaan telah dijawab.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('report');
                      if (!summary) void closeSession();
                    }}
                    disabled={closing}
                    className="text-body-sm h-10 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-4 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
                  >
                    {closing ? 'Menyusun laporan' : 'Lihat laporan sesi'}
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-3">
                  <label htmlFor="answer" className="sr-only">
                    Jawaban Anda
                  </label>
                  <textarea
                    id="answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                    disabled={thinking}
                    rows={3}
                    placeholder="Pertahankan poin Anda. Tekan Ctrl dan Enter untuk mengirim."
                    className="text-body flex-1 resize-none border border-[color:var(--color-line)] p-3 outline-none focus:border-[color:var(--color-primary-500)] disabled:bg-[color:var(--color-primary-050)]"
                  />
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={thinking || answer.trim().length === 0}
                    className="text-body-sm flex h-10 items-center gap-2 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-4 font-medium text-white transition-colors duration-150 hover:bg-[color:var(--color-primary-900)] disabled:bg-[color:var(--color-ink-400)]"
                  >
                    <Icon name="send" size={18} />
                    Jawab
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        <Slideover
          findings={session.findings}
          evaluation={evaluation}
          summary={summary}
          finished={finished}
          closing={closing}
          onClose={() => void closeSession()}
          activeTab={tab}
          onTabChange={setTab}
        />
      </div>
    </div>
  );
}
