import React, { useState } from 'react';
import { X, LoaderCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { LogoMark } from './Header';

type Mode = 'signin' | 'signup' | 'magic' | 'reset';

export const AuthModal: React.FC<{ open: boolean; onClose: () => void; initialMode?: Mode }> = ({ open, onClose, initialMode = 'signin' }) => {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setMsg({ kind: 'err', text: 'Enter a valid email address.' });
    if ((mode === 'signin' || mode === 'signup') && password.length < 8) return setMsg({ kind: 'err', text: 'Password must be at least 8 characters.' });
    setBusy(true);
    let err: string | null = null;
    if (mode === 'signin') err = await auth.signIn(em, password);
    if (mode === 'signup') err = await auth.signUp(em, password);
    if (mode === 'magic') err = await auth.magicLink(em);
    if (mode === 'reset') err = await auth.resetPassword(em);
    setBusy(false);
    if (err) return setMsg({ kind: 'err', text: err });
    if (mode === 'signin') return onClose();
    setMsg({ kind: 'ok', text: mode === 'signup' ? 'Check your inbox to confirm your account.' : 'Check your inbox for the link.' });
  };

  const titles: Record<Mode, string> = {
    signin: 'Welcome back', signup: 'Create your free account', magic: 'Email me a sign-in link', reset: 'Reset your password',
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <LogoMark className="w-8 h-8 mb-2" />
            <h2 className="text-lg font-bold">{titles[mode]}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Save your plan and pick it up on any device.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        {!auth.enabled ? (
          <p className="mt-5 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Accounts aren't switched on for this deployment yet. You can use everything as a guest, and your plan is saved in this browser.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block">
              <span className="sr-only">Email</span>
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 focus-within:border-blue-500">
                <Mail className="w-4 h-4 text-slate-500" />
                <input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={254}
                  placeholder="you@student.losrios.edu" className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none" />
              </div>
            </label>
            {(mode === 'signin' || mode === 'signup') && (
              <label className="block">
                <span className="sr-only">Password</span>
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 focus-within:border-blue-500">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} maxLength={128}
                    value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"
                    className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none" />
                </div>
              </label>
            )}
            {msg && <p className={`text-xs ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
            <button disabled={busy} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'magic' ? 'Send link' : 'Send reset link'}
            </button>
            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500 pt-1">
              {mode !== 'signin' && <button type="button" onClick={() => setMode('signin')} className="hover:text-slate-900">Have an account? Sign in</button>}
              {mode !== 'signup' && <button type="button" onClick={() => setMode('signup')} className="hover:text-slate-900">New here? Create account</button>}
              {mode === 'signin' && <button type="button" onClick={() => setMode('magic')} className="hover:text-slate-900">Use a magic link</button>}
              {mode === 'signin' && <button type="button" onClick={() => setMode('reset')} className="hover:text-slate-900">Forgot password?</button>}
            </div>
          </form>
        )}
        <p className="mt-5 text-[11px] text-slate-500 leading-snug">
          We store only your course list and plan settings. No SSNs, no student-ID login, never sold. Delete anytime.
        </p>
      </div>
    </div>
  );
};
