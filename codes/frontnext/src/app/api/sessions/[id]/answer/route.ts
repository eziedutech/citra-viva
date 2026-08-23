import { NextRequest, NextResponse } from 'next/server';

import { post } from '@/lib/api';
import type { SessionTurnResult } from '@/lib/types';
import { toErrorResponse } from '../../_shared';

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = await post<SessionTurnResult>(`/api/sessions/${id}/answer`, {
      answer: body.answer ?? '',
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
