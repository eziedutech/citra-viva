import { NextResponse } from 'next/server';

/**
 * Where the browser should open its transcription socket.
 *
 * The API address is a server-side setting and stays one. This hands out only
 * the single endpoint that has to be reached directly, because a route handler
 * here cannot carry a WebSocket upgrade, and it derives it rather than adding a
 * second variable that could disagree with the first.
 */
export async function GET() {
  const base = process.env.CITRA_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ error: 'No API address is configured.' }, { status: 503 });
  }

  const url = base.replace(/\/+$/, '').replace(/^http/, 'ws');
  return NextResponse.json({ url: `${url}/api/speech/live` });
}
