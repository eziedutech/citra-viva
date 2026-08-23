import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[color:var(--color-canvas)] px-6">
      <div className="max-w-[46ch] text-center">
        <h1 className="text-h1 mb-3">Sesi tidak ditemukan</h1>
        <p className="text-body mb-6 text-[color:var(--color-ink-600)]">
          Sesi ini tidak ada, atau tautannya salah. Sesi yang sudah dimulai tidak pernah hilang,
          jadi periksa kembali alamatnya sebelum memulai dari awal.
        </p>
        <Link
          href="/"
          className="text-body-sm inline-flex h-10 items-center rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white"
        >
          Mulai sidang baru
        </Link>
      </div>
    </main>
  );
}
