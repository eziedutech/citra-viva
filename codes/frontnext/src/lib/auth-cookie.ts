/**
 * The name of the cookie carrying the caller's Firebase ID token.
 *
 * It lives in its own module because both a route handler and the server API
 * client need it, and importing a route module for a constant drags a whole
 * request handler in behind it.
 */
export const ID_TOKEN_COOKIE = 'citra_id_token';

/**
 * A credential-free marker that this browser has signed in before.
 *
 * The token cookie deliberately expires before the token it carries, so a
 * person who closes the tab and returns two hours later arrives with no cookie
 * at all while Firebase, which keeps its own record in the browser, still
 * considers them signed in. Choosing the front door from the token cookie alone
 * would show that person a sign-in screen that vanishes a moment later.
 *
 * This cookie holds nothing but the fact that a sign-in has happened, is not
 * HttpOnly because the client writes it, and grants nothing: every API call is
 * still authorised by the verified token.
 */
export const SIGNED_IN_HINT_COOKIE = 'citra_signed_in';

/**
 * Whether the caller looks signed in, for choosing which page to render.
 *
 * Not a permission check, and it must never be used as one. It decides a first
 * paint, nothing more. The API verifies the token on every call, and when this
 * guess is wrong the browser corrects the page as soon as Firebase reports in.
 */
export async function looksSignedIn(): Promise<boolean> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return Boolean(
    store.get(ID_TOKEN_COOKIE)?.value || store.get(SIGNED_IN_HINT_COOKIE)?.value,
  );
}
