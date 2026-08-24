import { NextRequest, NextResponse } from 'next/server';

import { postForm } from '@/lib/api';
import { toErrorResponse } from '../../sessions/_shared';

// Transcribing a spoken answer is a single model call over a recording of at
// most a few minutes. Slower than a form post, far quicker than a defense turn.
export const maxDuration = 120;

interface TranscribeResponse {
  text: string;
  characters: number;
}

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No recording was received.' }, { status: 400 });
    }

    const outgoing = new FormData();
    outgoing.append('file', file, file.name || 'answer.webm');

    return NextResponse.json(
      await postForm<TranscribeResponse>('/api/speech/transcribe', outgoing),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
