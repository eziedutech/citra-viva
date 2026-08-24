/**
 * The name of the cookie carrying the caller's Firebase ID token.
 *
 * It lives in its own module because both a route handler and the server API
 * client need it, and importing a route module for a constant drags a whole
 * request handler in behind it.
 */
export const ID_TOKEN_COOKIE = 'citra_id_token';

/**
 * Whether the caller arrives with a session cookie.
 *
 * Used only to choose which of the two front doors to render on the server. It
 * is not a permission check and must never be used as one: the token is
 * verified by the API on every call, and an expired cookie here simply means
 * the first paint is corrected once Firebase reports in.
 */
export async function hasSessionCookie(): Promise<boolean> {
  const { cookies } = await import('next/headers');
  return Boolean((await cookies()).get(ID_TOKEN_COOKIE)?.value);
}
