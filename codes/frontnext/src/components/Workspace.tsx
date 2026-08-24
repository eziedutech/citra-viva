'use client';

import { DraftIntake } from '@/components/DraftIntake';
import { HistorySidebar } from '@/components/HistorySidebar';
import type { Dictionary, Locale } from '@/lib/i18n';

interface Props {
  dict: Dictionary;
  locale: Locale;
}

/**
 * What a signed-in student sees first.
 *
 * Their own work down the left, and the one thing they came to do on the right.
 * On a wide screen the height is locked and each column scrolls on its own, the
 * same arrangement the defense room uses, so scrolling a long history never
 * moves the manuscript they are pasting in. Below that width the two stack and
 * the page scrolls normally: a fixed sidebar on a phone is a sidebar that eats
 * the screen.
 */
export function Workspace({ dict, locale }: Props) {
  return (
    <div className="flex flex-col lg:grid lg:h-dvh lg:grid-cols-[288px_1fr] lg:overflow-hidden">
      <HistorySidebar dict={dict} locale={locale} />

      <div className="panel-scroll min-h-0 bg-[color:var(--color-canvas)]">
        <DraftIntake dict={dict} locale={locale} embedded />
      </div>
    </div>
  );
}
