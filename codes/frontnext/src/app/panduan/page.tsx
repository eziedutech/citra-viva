import { AppHeader } from '@/components/AppHeader';
import { GuideDoc } from '@/components/GuideDoc';
import { dictionaryFor } from '@/lib/i18n';
import { currentLocale } from '@/lib/locale';

// Open to anyone, signed in or not. Someone deciding whether to hand this
// service their unpublished manuscript should be able to read what it does with
// it first, and that answer cannot sit behind a sign-in.
export const dynamic = 'force-dynamic';

export default async function GuidePage() {
  const locale = await currentLocale();
  const dict = dictionaryFor(locale);

  return (
    <main className="min-h-dvh bg-[color:var(--color-canvas)]">
      <AppHeader dict={dict} locale={locale} current="guide" />
      <GuideDoc dict={dict} />
    </main>
  );
}
