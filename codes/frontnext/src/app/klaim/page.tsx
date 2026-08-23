import { ClaimChecker } from '@/components/ClaimChecker';
import { dictionaryFor } from '@/lib/i18n';
import { currentLocale } from '@/lib/locale';

export default async function ClaimPage() {
  const locale = await currentLocale();

  return (
    <main className="min-h-dvh bg-[color:var(--color-canvas)]">
      <ClaimChecker dict={dictionaryFor(locale)} locale={locale} />
    </main>
  );
}
