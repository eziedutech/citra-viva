import { notFound } from 'next/navigation';

import { DefenseRoom } from '@/components/DefenseRoom';
import { SessionRecovery } from '@/components/SessionRecovery';
import { ApiError, get } from '@/lib/api';
import { dictionaryFor } from '@/lib/i18n';
import { currentLocale } from '@/lib/locale';
import { normalizeSession } from '@/lib/session';
import type { SessionState } from '@/lib/types';

// The session is read on the server for every visit, which is what makes a
// refresh mid-defense harmless: nothing about the state lives in the tab.
export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await currentLocale();

  let session: SessionState;
  try {
    session = await get<SessionState>(`/api/sessions/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();

    // No credential reached the API. Usually the token cookie has simply
    // outlived its hour while the browser still knows who this is, which is a
    // state to recover from rather than an error to report. Anything else is a
    // real failure and belongs to the error boundary.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return <SessionRecovery dict={dictionaryFor(locale)} />;
    }

    throw error;
  }

  return (
    <DefenseRoom
      initial={normalizeSession(session)}
      dict={dictionaryFor(locale)}
      locale={locale}
    />
  );
}
