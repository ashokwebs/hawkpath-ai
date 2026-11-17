import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut as fbSignOut, GoogleAuthProvider, signInWithPopup, sendEmailVerification,
} from 'firebase/auth';
import { auth, authEnabled } from './firebase';

export interface AppUser { id: string; email: string | null; name: string | null }

interface AuthState {
  enabled: boolean;
  loading: boolean;
  user: AppUser | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

/** Human-friendly messages for Firebase Auth error codes. */
function friendly(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'That email and password don’t match.',
    'auth/invalid-login-credentials': 'That email and password don’t match.',
    'auth/wrong-password': 'That email and password don’t match.',
    'auth/user-not-found': 'No account with that email yet. Create one instead.',
    'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
    'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
    'auth/network-request-failed': 'Network problem. Check your connection and try again.',
    'auth/popup-closed-by-user': 'Sign-in window was closed.',
    'auth/operation-not-allowed': 'This sign-in method isn’t switched on yet. You can keep using HawkPath as a guest.',
    'auth/configuration-not-found': 'Accounts aren’t switched on yet. You can keep using HawkPath as a guest.',
    'auth/unauthorized-domain': 'Sign-in isn’t enabled for this website address yet.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(authEnabled);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, u => {
      setUser(u ? { id: u.uid, email: u.email, name: u.displayName } : null);
      setLoading(false);
    });
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    if (!auth) return 'Accounts aren’t available on this deployment. You can keep using HawkPath as a guest.';
    try { await fn(); return null; } catch (e) { console.warn('[auth]', (e as { code?: string })?.code); return friendly(e); }
  };

  const value: AuthState = {
    enabled: authEnabled,
    loading,
    user,
    signIn: (email, password) => run(() => signInWithEmailAndPassword(auth!, email, password)),
    signUp: (email, password) => run(async () => {
      const cred = await createUserWithEmailAndPassword(auth!, email, password);
      sendEmailVerification(cred.user).catch(() => { /* non-blocking */ });
    }),
    signInWithGoogle: () => run(() => signInWithPopup(auth!, new GoogleAuthProvider())),
    resetPassword: email => run(() => sendPasswordResetEmail(auth!, email)),
    signOut: async () => { if (auth) await fbSignOut(auth); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

/** Authorization header for API calls. The server verifies the Firebase ID token; it never trusts a body user id. */
export async function authHeaders(): Promise<Record<string, string>> {
  const u = auth?.currentUser;
  if (!u) return {};
  try { return { Authorization: `Bearer ${await u.getIdToken()}` }; } catch { return {}; }
}
