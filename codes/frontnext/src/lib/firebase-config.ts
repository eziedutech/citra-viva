/**
 * Firebase web configuration, read at runtime rather than baked at build time.
 *
 * The obvious approach is `NEXT_PUBLIC_` variables, and it is wrong here.
 * Those are inlined during `next build`, but Cloud Run supplies environment
 * variables to the running container, not to the build. The config would be
 * empty in production and correct on every developer machine, which is the
 * worst kind of bug: invisible until it is deployed.
 *
 * So the values are read on the server and handed to the client provider as
 * props. None of them is a secret. A Firebase web API key identifies the
 * project to Google's endpoints; it authorises nothing on its own, which is why
 * access is enforced by verifying ID tokens in the backend rather than by
 * hiding this.
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/** Read the config on the server. Returns null when Firebase is not set up,
 *  which is a supported state: the app then runs without sign-in. */
export function firebaseConfigFromEnv(): FirebaseConfig | null {
  const apiKey = process.env.FIREBASE_API_KEY ?? '';
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN ?? '';
  const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
  const appId = process.env.FIREBASE_APP_ID ?? '';

  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}
