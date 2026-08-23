'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[color:var(--color-canvas)] px-6">
      <div className="max-w-[52ch] text-center">
        <h1 className="text-h1 mb-3">Layanan sedang tidak dapat dihubungi</h1>
        <p className="text-body mb-6 text-[color:var(--color-ink-600)]">
          Ini biasanya kuota model, bukan kesalahan pada draf Anda. Sesi yang sedang berjalan sudah
          tersimpan dan dapat dilanjutkan begitu layanan pulih.
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-body-sm h-10 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white"
        >
          Coba lagi
        </button>
      </div>
    </main>
  );
}
