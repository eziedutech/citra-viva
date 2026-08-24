import { NextRequest, NextResponse } from 'next/server';

import { post } from '@/lib/api';
import { toErrorResponse } from '../../sessions/_shared';

export const maxDuration = 120;

interface SpeakResponse {
  audio_base64: string;
  mime_type: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json(
      await post<SpeakResponse>('/api/speech/say', { text: body.text ?? '' }),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
