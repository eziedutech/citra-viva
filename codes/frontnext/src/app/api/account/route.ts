import { NextResponse } from 'next/server';

import { remove } from '@/lib/api';
import { toErrorResponse } from '../sessions/_shared';

interface AccountDeletion {
  sessions_deleted: number;
}

/**
 * Erase everything the caller has: every session, every manuscript, every
 * Weakness Map.
 *
 * The count comes back rather than a bare 204, because somebody erasing their
 * own work is owed a number. "Deleted" with nothing behind it asks them to take
 * it on trust, and this is the one operation where trust is the thing being
 * spent.
 *
 * The sign-in itself is not removed here. The backend verifies Google ID tokens
 * rather than holding Firebase admin credentials, so the browser deletes the
 * identity after this returns. Data first, identity second: losing the identity
 * first would strand the manuscripts with no signed-in way to reach them.
 */
export async function DELETE() {
  try {
    return NextResponse.json(await remove<AccountDeletion>('/api/account'));
  } catch (error) {
    return toErrorResponse(error);
  }
}
