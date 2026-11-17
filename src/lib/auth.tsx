import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, authEnabled } from './supabase';

interface AuthState {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  magicLink: (email: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

const redirect = () => `${window.location.origin}/#/app`;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authEnabled);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const wrap = async (fn: () => Promise<{ error: { message: string } | null }>) => {
    if (!supabase) return 'Accounts are not configured on this deployment.';
    const { error } = await fn();
    return error ? error.message : null;
  };

  const value: AuthState = {
    enabled: authEnabled,
    loading,
    session,
    user: session?.user ?? null,
    signIn: (email, password) => wrap(() => supabase!.auth.signInWithPassword({ email, password })),
    signUp: (email, password) => wrap(() => supabase!.auth.signUp({ email, password, options: { emailRedirectTo: redirect() } })),
    magicLink: email => wrap(() => supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } })),
    resetPassword: email => wrap(() => supabase!.auth.resetPasswordForEmail(email, { redirectTo: redirect() })),
    signOut: async () => { await supabase?.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

/** Authorization header for API calls (server verifies the JWT; never trusts a body user id). */
export function authHeaders(session: Session | null): Record<string, string> {
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}
