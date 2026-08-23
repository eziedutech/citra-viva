import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/api';

/**
 * Turn a failed backend call into a response the interface can show.
 *
 * The backend writes its errors to be read by a person ("Draft text is too
 * short to analyze"), so those messages are passed through rather than
 * replaced. Anything else is reported as an upstream failure without leaking
 * a stack trace to the browser.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return NextResponse.json(
      { error: 'The examiner took too long to respond. Try again in a moment.' },
      { status: 504 },
    );
  }
  return NextResponse.json(
    { error: 'The CITRA Viva service could not be reached.' },
    { status: 502 },
  );
}
