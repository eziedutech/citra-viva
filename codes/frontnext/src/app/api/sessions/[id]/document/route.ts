import { NextRequest, NextResponse } from 'next/server';

import { get } from '@/lib/api';
import type { SessionDocument } from '@/lib/types';
import { toErrorResponse } from '../../_shared';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await get<SessionDocument>(`/api/sessions/${id}/document`));
  } catch (error) {
    return toErrorResponse(error);
  }
}
