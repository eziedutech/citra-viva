import { DraftIntake } from '@/components/DraftIntake';
import { dictionaryFor } from '@/lib/i18n';
import { currentLocale } from '@/lib/locale';

export default async function HomePage() {
  const locale = await currentLocale();

  return (
    <main className="min-h-dvh bg-[color:var(--color-canvas)]">
      <DraftIntake dict={dictionaryFor(locale)} locale={locale} />
    </main>
  );
}
