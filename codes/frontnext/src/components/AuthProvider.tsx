'use client';

import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { SIGNED_IN_HINT_COOKIE } from '@/lib/auth-cookie';
import type { FirebaseConfig } from '@/lib/firebase-config';

interface AuthState {
  /** null while still checking, then the user or false for signed out. */
  user: FirebaseUser | null;
  ready: boolean;
  /**
   * Whether the ID token has reached the server yet.
   *
   * `ready` says Firebase has decided who this is. This says the cookie
   * carrying that answer has been written, which is a later moment and the one
   * that matters to anything about to call the API. Asking in between produces
   * a 401 and tells a signed-in student to sign in.
   */
  sessionReady: boolean;
  /** False when Firebase is not configured. The app still runs; sign-in does not. */
  enabled: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * `fetch`, with one retry after refreshing the credential.
   *
   * An ID token lasts an hour, and the cookie carrying it expires a little
   * sooner. Anything can therefore meet a 401 partway through a defense, at
   * which point a single forced token refresh fixes it. Without this the
   * student loses the answer they just wrote to a message about signing in.
   */
  authedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  ready: true,
  sessionReady: true,
  enabled: false,
  signIn: async () => {},
  signOut: async () => {},
  authedFetch: (input, init) => fetch(input, init),
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** The credential-free marker the server reads to pick a first paint. */
function markSignedIn(signedIn: boolean) {
  document.cookie = signedIn
    ? `${SIGNED_IN_HINT_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    : `${SIGNED_IN_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function appFor(config: FirebaseConfig): FirebaseApp {
  // Next remounts components in development, and initializing twice throws.
  return getApps()[0] ?? initializeApp(config);
}

/**
 * Sign-in, and the bridge between the browser's Firebase session and the
 * server's.
 *
 * The ID token is posted to our own route handler, which stores it in an
 * HttpOnly cookie. Everything else then reads it from there: server rendered
 * pages, route handlers, and the calls they forward to the API. Three
 * consequences follow, all deliberate.
 *
 * The token is never handed to any script on the page, so an injected script
 * cannot read it. The session page can be rendered on the server, because the
 * server has the credential. And no component has to remember to attach a
 * header, which is the sort of thing that gets forgotten on exactly one
 * endpoint.
 *
 * `onIdTokenChanged` rather than `onAuthStateChanged`: Firebase refreshes the
 * ID token roughly hourly, and only this one fires on refresh. Listening to the
 * other would leave a stale token in the cookie and sign the user out mid
 * defense.
 */
export function AuthProvider({
  config,
  children,
}: {
  config: FirebaseConfig | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [ready, setReady] = useState(!config);
  const [sessionReady, setSessionReady] = useState(!config);

  useEffect(() => {
    if (!config) return;
    const auth = getAuth(appFor(config));

    return onIdTokenChanged(auth, async (next) => {
      setUser(next);
      setReady(true);
      try {
        if (next) {
          const token = await next.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          markSignedIn(true);
        } else {
          await fetch('/api/auth/session', { method: 'DELETE' });
          markSignedIn(false);
        }
      } catch {
        // The cookie could not be synced. The next token refresh tries again,
        // and until then the server simply sees a signed out visitor, which is
        // the safe direction to fail in.
      } finally {
        // Released on failure too. A caller waiting on this should get a real
        // error from the API rather than wait forever on a sync that will not
        // arrive until the next hourly refresh.
        setSessionReady(true);
      }
    });
  }, [config]);

  const signIn = useCallback(async () => {
    if (!config) return;
    const auth = getAuth(appFor(config));
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, [config]);

  const signOut = useCallback(async () => {
    if (!config) return;
    // Cleared here as well as in the listener. Sign-out has to leave nothing
    // behind even if the listener never runs, because the next person at this
    // machine is the one who would find what it left.
    markSignedIn(false);
    await firebaseSignOut(getAuth(appFor(config)));
  }, [config]);

  /** Force a fresh ID token and put it back in the cookie. */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!config) return false;
    const current = getAuth(appFor(config)).currentUser;
    if (!current) return false;

    try {
      const token = await current.getIdToken(true);
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [config]);

  const authedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const first = await fetch(input, init);
      // Only 401 is retried, and only once. Anything else is a real answer, and
      // a second attempt at a request the server understood would either repeat
      // work or repeat a failure.
      if (first.status !== 401) return first;
      if (!(await refreshSession())) return first;
      return fetch(input, init);
    },
    [refreshSession],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      sessionReady,
      enabled: Boolean(config),
      signIn,
      signOut,
      authedFetch,
    }),
    [user, ready, sessionReady, config, signIn, signOut, authedFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
