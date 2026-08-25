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
    // `speak` has to be forwarded, not dropped.
    //
    // It is what makes the backend synthesise the examiner's reply inside the
    // wait the student is already having, so the voice arrives with the text
    // rather than being fetched after it. Left off, the request still
    // succeeds and the turn still returns, which is why its absence showed up
    // as the voice merely being slow rather than as anything failing.
    const data = await post<SessionTurnResult>(`/api/sessions/${id}/answer`, {
      answer: body.answer ?? '',
      speak: body.speak === true,
      pasted_characters: Number(body.pasted_characters) || 0,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
