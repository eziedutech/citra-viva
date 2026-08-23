/**
 * The name of the cookie carrying the caller's Firebase ID token.
 *
 * It lives in its own module because both a route handler and the server API
 * client need it, and importing a route module for a constant drags a whole
 * request handler in behind it.
 */
export const ID_TOKEN_COOKIE = 'citra_id_token';
