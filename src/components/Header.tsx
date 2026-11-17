import React, { useState } from 'react';
import { FileText, UserPen, LogOut, LogIn, Users, Cloud, HardDrive } from 'lucide-react';
import { StudentProfile } from '../types';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { useAuth } from '../lib/auth';

interface HeaderProps {
  currentProfile: StudentProfile;
  myProfile: StudentProfile | null;
  onSelectProfile: (profile: StudentProfile) => void;
  onEditRecord: () => void;
  onOpenReport: () => void;
  onSignIn: () => void;
  savedTo: 'cloud' | 'local' | null;
}

/** Brand mark: three connected nodes (a prerequisite path). */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 36 36" className={`${className} shrink-0`} aria-hidden>
    <rect width="36" height="36" rx="9" fill="#1d4ed8" />
    <path d="M10 25 L18 12 L26 22" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    <circle cx="10" cy="25" r="3.2" fill="#fff" />
    <circle cx="18" cy="12" r="3.2" fill="#fff" />
    <circle cx="26" cy="22" r="3.2" fill="#fbbf24" />
  </svg>
);

export const Logo: React.FC<{ onClick?: () => void; compact?: boolean }> = ({ onClick, compact }) => (
  <button onClick={onClick} className="flex items-center gap-2.5 group" aria-label="HawkPath home">
    <LogoMark />
    <span className={`font-bold text-[17px] tracking-tight text-slate-900 whitespace-nowrap ${compact ? 'hidden sm:inline' : ''}`}>HawkPath</span>
  </button>
);

export const Header: React.FC<HeaderProps> = ({ currentProfile, myProfile, onSelectProfile, onEditRecord, onOpenReport, onSignIn, savedTo }) => {
  const { user, signOut, enabled } = useAuth();
  const [menu, setMenu] = useState(false);
  const options = [...(myProfile ? [myProfile] : []), ...SAMPLE_PROFILES];

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-2 sm:gap-3">
        <Logo compact onClick={() => { window.location.hash = '#/'; }} />

        <div className="hidden md:flex items-center gap-1 ml-4 bg-white p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 px-2 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Viewing</span>
          {options.map(p => (
            <button key={p.id} onClick={() => onSelectProfile(p)}
              className={`px-2.5 py-1 rounded-md font-medium transition ${currentProfile.id === p.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {p.id === 'my-plan' ? 'My plan' : `${p.name.split(' ')[0]} (demo)`}
            </button>
          ))}
        </div>

        <select aria-label="Choose which plan to view" value={currentProfile.id}
          onChange={e => { const p = options.find(o => o.id === e.target.value); if (p) onSelectProfile(p); }}
          className="md:hidden ml-1 min-w-0 max-w-[8.5rem] bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
          {options.map(p => <option key={p.id} value={p.id}>{p.id === 'my-plan' ? 'My plan' : `${p.name.split(' ')[0]} (demo)`}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {savedTo && currentProfile.id === 'my-plan' && (
            <span className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500" title={savedTo === 'cloud' ? 'Saved to your account' : 'Saved in this browser'}>
              {savedTo === 'cloud' ? <Cloud className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />} Saved
            </span>
          )}
          <button onClick={onEditRecord} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300">
            <UserPen className="w-3.5 h-3.5 text-blue-600" /><span className="hidden sm:inline">{myProfile ? 'Edit my record' : 'Add my classes'}</span>
          </button>
          <button onClick={onOpenReport} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white">
            <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">Counselor report</span>
          </button>
          {user ? (
            <div className="relative">
              <button onClick={() => setMenu(m => !m)} className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 text-sm font-bold text-blue-600" aria-label="Account menu">
                {(user.email ?? '?')[0].toUpperCase()}
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-300 bg-white shadow-xl p-1 text-sm" onMouseLeave={() => setMenu(false)}>
                  <div className="px-3 py-2 text-xs text-slate-500 truncate">{user.email}</div>
                  <button onClick={() => { setMenu(false); signOut(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-left">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : enabled ? (
            <button onClick={onSignIn} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100">
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
};
