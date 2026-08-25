import { NextResponse } from 'next/server';

import { get, remove } from '@/lib/api';
import type { SessionState } from '@/lib/types';
import { toErrorResponse } from '../_shared';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await get<SessionState>(`/api/sessions/${id}`));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Delete a session and the manuscript stored with it.
 *
 * Permanent. The backend refuses a session that is not the caller's as
 * not-found, so nothing here needs to decide who owns what.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await remove(`/api/sessions/${id}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
