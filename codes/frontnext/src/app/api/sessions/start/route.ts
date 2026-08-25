import { NextRequest, NextResponse } from 'next/server';

import { post } from '@/lib/api';
import type { StartSessionResponse } from '@/lib/types';
import { toErrorResponse } from '../_shared';

// Analysis plus question planning is two model calls and takes roughly a
// minute. Nothing about that fits in a default serverless timeout.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await post<StartSessionResponse>('/api/sessions/start', {
      draft_text: body.draft_text ?? '',
      recurring_gaps: body.recurring_gaps ?? [],
      user_id: body.user_id ?? 'web-user',
      persist: false,
      // Synthesised during the minute the planning already takes, so the
      // opening question can be heard the moment the room opens.
      speak: body.speak === true,
    });
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
