'use client';

import { DEFAULT_LOCALE, dictionaryFor } from '@/lib/i18n';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  // An error boundary cannot read a cookie, and a failure is the worst moment
  // to add a way to fail. The default locale is the honest fallback here.
  const dict = dictionaryFor(DEFAULT_LOCALE);

  return (
    <main className="grid min-h-dvh place-items-center bg-[color:var(--color-canvas)] px-6">
      <div className="max-w-[52ch] text-center">
        <h1 className="text-h1 mb-3">{dict.errors.unavailableTitle}</h1>
        <p className="text-body mb-6 text-[color:var(--color-ink-600)]">
          {dict.errors.unavailableBody}
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-body-sm h-10 rounded-[var(--radius-action)] bg-[color:var(--color-primary-700)] px-5 font-medium text-white"
        >
          {dict.errors.retry}
        </button>
      </div>
    </main>
  );
}
