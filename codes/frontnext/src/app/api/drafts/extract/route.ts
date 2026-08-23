import { NextRequest, NextResponse } from 'next/server';

import { postForm } from '@/lib/api';
import { toErrorResponse } from '../../sessions/_shared';

// A large PDF takes a moment to parse, though nowhere near as long as a turn.
export const maxDuration = 120;

interface ExtractResponse {
  text: string;
  page_count: number;
  characters: number;
  notes: string[];
}

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    }

    // Rebuilt rather than forwarded as-is: the incoming form may carry fields
    // the API neither expects nor should be handed.
    const outgoing = new FormData();
    outgoing.append('file', file, file.name);

    return NextResponse.json(await postForm<ExtractResponse>('/api/drafts/extract', outgoing));
  } catch (error) {
    return toErrorResponse(error);
  }
}
