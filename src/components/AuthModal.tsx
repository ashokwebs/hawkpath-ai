import React, { useEffect, useState } from 'react';
import { X, LoaderCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { LogoMark } from './Header';

type Mode = 'signin' | 'signup' | 'reset';

const GoogleG = () => (
  <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.7 17.8 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z" />
    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

export const AuthModal: React.FC<{ open: boolean; onClose: () => void; initialMode?: Mode }> = ({ open, onClose, initialMode = 'signin' }) => {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { if (open) { setMode(initialMode); setMsg(null); setPassword(''); } }, [open, initialMode]);
  useEffect(() => { if (open && auth.user) onClose(); }, [auth.user, open, onClose]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setMsg({ kind: 'err', text: 'Enter a valid email address.' });
    if (mode !== 'reset' && password.length < 8) return setMsg({ kind: 'err', text: 'Password must be at least 8 characters.' });
    setBusy(true);
    const err = mode === 'signin' ? await auth.signIn(em, password)
      : mode === 'signup' ? await auth.signUp(em, password)
      : await auth.resetPassword(em);
    setBusy(false);
    if (err) return setMsg({ kind: 'err', text: err });
    if (mode === 'reset') setMsg({ kind: 'ok', text: 'If an account exists for that email, a reset link is on its way.' });
  };

  const google = async () => {
    setMsg(null);
    setBusy(true);
    const err = await auth.signInWithGoogle();
    setBusy(false);
    if (err) setMsg({ kind: 'err', text: err });
  };

  const titles: Record<Mode, [string, string]> = {
    signin: ['Welcome back', 'Sign in to sync your plan across devices.'],
    signup: ['Create your free account', 'Save your plan and pick it up anywhere.'],
    reset: ['Reset your password', 'We’ll email you a secure link.'],
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <LogoMark className="w-8 h-8 mb-3" />
            <h2 id="auth-title" className="text-lg font-semibold text-slate-900">{titles[mode][0]}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{titles[mode][1]}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        {!auth.enabled ? (
          <p className="mt-5 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Accounts aren’t switched on for this deployment yet. Everything works as a guest, and your plan is saved in this browser.
          </p>
        ) : (
          <>
            {mode !== 'reset' && (
              <>
                <button type="button" onClick={google} disabled={busy}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-800 disabled:opacity-60">
                  <GoogleG /> Continue with Google
                </button>
                <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
                </div>
              </>
            )}
            <form onSubmit={submit} className={`${mode === 'reset' ? 'mt-5' : ''} space-y-3`}>
              <label className="block">
                <span className="text-xs font-medium text-slate-700">Email</span>
                <div className="mt-1 flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={254}
                    placeholder="you@college.edu" className="flex-1 bg-transparent py-2.5 text-sm text-slate-900 focus:outline-none" />
                </div>
              </label>
              {mode !== 'reset' && (
                <label className="block">
                  <span className="flex justify-between text-xs font-medium text-slate-700">Password
                    {mode === 'signin' && <button type="button" onClick={() => { setMode('reset'); setMsg(null); }} className="font-normal text-blue-700 hover:underline">Forgot password?</button>}
                  </span>
                  <div className="mt-1 flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} maxLength={128}
                      value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"
                      className="flex-1 bg-transparent py-2.5 text-sm text-slate-900 focus:outline-none" />
                  </div>
                </label>
              )}
              {msg && <p role="status" className={`text-sm ${msg.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
              <button disabled={busy} className="w-full py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
                {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </button>
            </form>
            <p className="mt-4 text-sm text-slate-600 text-center">
              {mode === 'signin' && <>New to HawkPath? <button onClick={() => { setMode('signup'); setMsg(null); }} className="font-medium text-blue-700 hover:underline">Create an account</button></>}
              {mode === 'signup' && <>Already have an account? <button onClick={() => { setMode('signin'); setMsg(null); }} className="font-medium text-blue-700 hover:underline">Sign in</button></>}
              {mode === 'reset' && <button onClick={() => { setMode('signin'); setMsg(null); }} className="font-medium text-blue-700 hover:underline">Back to sign in</button>}
            </p>
          </>
        )}
        <p className="mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
          We store only your course list and plan settings. No SSNs or student IDs, and we never sell data.
        </p>
      </div>
    </div>
  );
};
