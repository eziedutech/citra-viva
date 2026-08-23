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

import type { FirebaseConfig } from '@/lib/firebase-config';

interface AuthState {
  /** null while still checking, then the user or false for signed out. */
  user: FirebaseUser | null;
  ready: boolean;
  /** False when Firebase is not configured. The app still runs; sign-in does not. */
  enabled: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  ready: true,
  enabled: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
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
        } else {
          await fetch('/api/auth/session', { method: 'DELETE' });
        }
      } catch {
        // The cookie could not be synced. The next token refresh tries again,
        // and until then the server simply sees a signed out visitor, which is
        // the safe direction to fail in.
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
    await firebaseSignOut(getAuth(appFor(config)));
  }, [config]);

  const value = useMemo<AuthState>(
    () => ({ user, ready, enabled: Boolean(config), signIn, signOut }),
    [user, ready, config, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
