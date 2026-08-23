import { NextRequest, NextResponse } from 'next/server';

import { ID_TOKEN_COOKIE } from '@/lib/auth-cookie';

// Firebase ID tokens last an hour. The cookie is given slightly less, so it
// expires before the token it carries rather than after: a cookie that outlives
// its token produces a confusing 401 instead of a clean signed-out state.
const COOKIE_MAX_AGE_SECONDS = 55 * 60;

/**
 * Store the caller's ID token in an HttpOnly cookie.
 *
 * The token is not validated here. It is forwarded to the API, and the API
 * verifies it against Google's public keys before trusting a single claim in
 * it. Checking it twice, once in a place that cannot enforce anything, would
 * only invite someone to rely on the weaker check.
 */
export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'No token supplied.' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ID_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ID_TOKEN_COOKIE);
  return response;
}
