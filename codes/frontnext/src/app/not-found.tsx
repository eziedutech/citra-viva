import Link from 'next/link';

import { dictionaryFor } from '@/lib/i18n';
import { currentLocale } from '@/lib/locale';

export default async function NotFound() {
  const dict = dictionaryFor(await currentLocale());

  return (
    <main className="grid min-h-dvh place-items-center bg-[color:var(--color-canvas)] px-6">
      <div className="max-w-[52ch] text-center">
        <h1 className="text-h1 mb-3">{dict.errors.notFoundTitle}</h1>
        <p className="text-body mb-6 text-[color:var(--color-ink-600)]">
          {dict.errors.notFoundBody}
        </p>
        <Link
          href="/"
          className="text-body-sm inline-flex h-10 items-center rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white"
        >
          {dict.errors.startNew}
        </Link>
      </div>
    </main>
  );
}
