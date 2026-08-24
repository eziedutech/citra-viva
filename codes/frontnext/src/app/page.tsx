import { HomeShell } from '@/components/HomeShell';
import { hasSessionCookie } from '@/lib/auth-cookie';
import { dictionaryFor } from '@/lib/i18n';
import { currentLocale } from '@/lib/locale';

// The locale can now come from the request's own Accept-Language header, so
// this page depends on the request and cannot be prerendered once for everyone.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const locale = await currentLocale();
  // Which door to render before any JavaScript runs. Firebase resolves in the
  // browser, and waiting for it would mean serving a blank frame to every
  // first-time visitor, which is the one visitor whose first paint matters.
  const signedIn = await hasSessionCookie();

  return (
    <main className="min-h-dvh bg-[color:var(--color-canvas)]">
      <HomeShell dict={dictionaryFor(locale)} locale={locale} initialSignedIn={signedIn} />
    </main>
  );
}
