/**
 * Server-side calls to the CITRA Viva API.
 *
 * Everything here runs on the server. The browser talks only to this app's own
 * route handlers, which means the API URL is never shipped to the client, there
 * is no CORS to configure, and the API can be locked down later without
 * touching the interface.
 */

import 'server-only';

import { cookies } from 'next/headers';

import { ID_TOKEN_COOKIE } from '@/lib/auth-cookie';

const DEFAULT_BASE_URL = 'http://localhost:8080';

// A defense turn is two model calls deep and regularly takes half a minute.
// A default fetch timeout would cut the examiner off mid-question.
const REQUEST_TIMEOUT_MS = 300_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function baseUrl(): string {
  return (process.env.CITRA_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/**
 * The caller's credential, from the HttpOnly cookie the auth provider set.
 *
 * Taking it from the cookie rather than from an argument means no call site can
 * forget to pass it, which is how one endpoint ends up unauthenticated while
 * every other one is fine.
 */
async function authorization(): Promise<Record<string, string>> {
  const token = (await cookies()).get(ID_TOKEN_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(await authorization()),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();

  if (!response.ok) {
    // FastAPI puts the readable message in `detail`. Passing that through keeps
    // the backend's careful error wording instead of replacing it with a status
    // code the user cannot act on.
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.detail === 'string') detail = parsed.detail;
    } catch {
      // Not JSON. The raw body is still better than nothing.
    }
    throw new ApiError(response.status, detail || response.statusText);
  }

  return JSON.parse(text) as T;
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}
