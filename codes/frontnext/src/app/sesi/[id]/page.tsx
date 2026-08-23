import { notFound } from 'next/navigation';

import { DefenseRoom } from '@/components/DefenseRoom';
import { ApiError, get } from '@/lib/api';
import { normalizeSession } from '@/lib/session';
import type { SessionState } from '@/lib/types';

// The session is read on the server for every visit, which is what makes a
// refresh mid-defense harmless: nothing about the state lives in the tab.
export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let session: SessionState;
  try {
    session = await get<SessionState>(`/api/sessions/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return <DefenseRoom initial={normalizeSession(session)} />;
}
