import { NextResponse } from 'next/server';

import { get } from '@/lib/api';
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
