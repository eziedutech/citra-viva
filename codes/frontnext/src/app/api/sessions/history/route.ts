import { NextResponse } from 'next/server';

import { get } from '@/lib/api';
import type { SessionHistory } from '@/lib/types';
import { toErrorResponse } from '../_shared';

// Not under /api/sessions, because that path already belongs to the dynamic
// session route in this app's own routing. The backend endpoint it forwards to
// is the plain collection.
export async function GET() {
  try {
    return NextResponse.json(await get<SessionHistory>('/api/sessions'));
  } catch (error) {
    return toErrorResponse(error);
  }
}
