import { ClaimShell } from '@/components/ClaimShell';
import { looksSignedIn } from '@/lib/auth-cookie';
import { dictionaryFor } from '@/lib/i18n';
import { currentLocale } from '@/lib/locale';

export const dynamic = 'force-dynamic';

export default async function ClaimPage() {
  const locale = await currentLocale();
  const signedIn = await looksSignedIn();

  return (
    <main className="min-h-dvh bg-[color:var(--color-canvas)]">
      <ClaimShell dict={dictionaryFor(locale)} locale={locale} initialSignedIn={signedIn} />
    </main>
  );
}
