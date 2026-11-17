import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Wrench, Bot, LoaderCircle, ChevronDown, ShieldCheck, Zap } from 'lucide-react';
import { StudentProfile } from '../types';
import { Scenario } from '../utils/scenario';
import { authHeaders } from '../lib/auth';

interface TraceEntry { tool: string; input: unknown; output: unknown; ms: number; error?: boolean }
interface Msg {
  role: 'user' | 'assistant';
  content: string;
  trace?: TraceEntry[];
  mode?: 'live' | 'offline' | 'degraded';
  provider?: string;
  model?: string;
  degradedReason?: string;
  ms?: number;
  usage?: { input: number; output: number };
}

interface Props {
  profile: StudentProfile;
  scenario: Scenario;
  onApplyScenario: (s: Scenario) => void;
}

const SUGGESTIONS = [
  'What happens if I fail CISP 400 this semester?',
  'Show me what 30 hours of work a week does to my plan',
  'Which school can I transfer to soonest?',
  'Why is CISP 430 such a big deal?',
];

// Minimal typing for the Web Speech API (not in TS DOM lib everywhere).
type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: (e: any) => void; onend: () => void; onerror: (e: any) => void;
  start: () => void; stop: () => void;
};
const SpeechRecognitionCtor: (new () => SpeechRec) | undefined =
  typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : undefined;

function renderInline(text: string) {
  // Safe tiny markdown: **bold** and `code` only. No HTML injection (React escapes).
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith('**') ? <strong key={i} className="text-slate-900 font-semibold">{p.slice(2, -2)}</strong>
      : p.startsWith('`') ? <code key={i} className="font-mono text-[12px] bg-slate-100 px-1 rounded">{p.slice(1, -1)}</code>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

const TraceView: React.FC<{ trace: TraceEntry[] }> = ({ trace }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px]">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-600 hover:text-slate-900">
        <Wrench className="w-3.5 h-3.5 text-blue-600" />
        <span className="font-semibold whitespace-nowrap">{trace.length} deterministic tool call{trace.length > 1 ? 's' : ''}</span>
        <span className="font-mono text-slate-500 truncate">{trace.map(t => t.tool).join(' → ')}</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-200 max-h-72 overflow-auto scroll-thin">
          {trace.map((t, i) => (
            <div key={i} className="px-2.5 py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 font-mono">
                <span className={t.error ? 'text-red-600' : 'text-emerald-600'}>{t.tool}</span>
                <span className="text-slate-500">({JSON.stringify(t.input)})</span>
                <span className="ml-auto text-slate-500">{t.ms}ms</span>
              </div>
              <pre className="mt-1 text-slate-500 whitespace-pre-wrap break-all font-mono text-[10.5px] leading-snug">
                {JSON.stringify(t.output, null, 1).slice(0, 1800)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdvisorChat: React.FC<Props> = ({ profile, scenario, onApplyScenario }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(true);
  const [interim, setInterim] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const recRef = useRef<SpeechRec | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;

  // Scroll only the chat list (never the page) when new content arrives.
  useEffect(() => {
    const el = listRef.current;
    if (el && (messages.length || busy || interim)) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, interim]);
  useEffect(() => { setMessages([]); }, [profile.id]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const speakText = (text: string) => {
    if (!speak || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*|`/g, '').replace(/→/g, ' then '));
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  };

  const send = async (text: string) => {
    const q = text.trim().slice(0, 1500);
    if (!q || busy || cooldown > 0) return;
    window.speechSynthesis?.cancel();
    const history = [...messagesRef.current, { role: 'user' as const, content: q }];
    setMessages(history);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          profile, scenario,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const wait = Number(data.retryAfter ?? res.headers.get('Retry-After') ?? 10);
        setCooldown(wait);
        setMessages(m => [...m, { role: 'assistant', content: `Slow down a little — rate limit protects our free-tier budget. Try again in ${wait}s.`, mode: 'degraded' }]);
        return;
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      for (const a of data.uiActions ?? []) if (a.type === 'apply_scenario') onApplyScenario(a.scenario);
      setMessages(m => [...m, {
        role: 'assistant', content: data.reply, trace: data.trace, mode: data.mode,
        degradedReason: data.degradedReason, ms: data.ms, usage: data.usage, provider: data.provider, model: data.model,
      }]);
      speakText(data.reply);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `Network problem: ${(e as Error).message}. Your dashboard still works offline.`, mode: 'degraded' }]);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    if (!SpeechRecognitionCtor) {
      alertless('Voice input needs Chrome or Edge (Web Speech API).');
      return;
    }
    if (listening) { recRef.current?.stop(); return; }
    window.speechSynthesis?.cancel();
    const rec = new SpeechRecognitionCtor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (e: any) => {
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else partial += r[0].transcript;
      }
      setInterim(finalText + partial);
    };
    rec.onerror = () => { setListening(false); setInterim(''); };
    rec.onend = () => {
      setListening(false);
      setInterim('');
      if (finalText.trim()) send(finalText);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const [notice, setNotice] = useState('');
  function alertless(msg: string) { setNotice(msg); setTimeout(() => setNotice(''), 4000); }

  const last = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <div className="flex flex-col h-full min-h-[520px] rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Bot className="w-4.5 h-4.5 text-blue-600" /></div>
        <div className="min-w-0">
          <div className="text-sm font-bold">HawkPath Voice Advisor</div>
          <div className="text-[11px] text-slate-500 truncate">AI tool-calling over a verified planning engine</div>
        </div>
        <button onClick={() => { setSpeak(s => !s); window.speechSynthesis?.cancel(); }}
          className="ml-auto p-2 rounded-lg hover:bg-slate-100 text-slate-600" title={speak ? 'Mute voice replies' : 'Speak replies aloud'}
          aria-label={speak ? 'Mute voice replies' : 'Speak replies aloud'}>
          {speak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {last?.mode && (
        <div className={`px-4 py-1.5 text-[11px] flex items-center gap-1.5 border-b border-slate-200 ${
          last.mode === 'live' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-800 bg-amber-50'}`}>
          {last.mode === 'live' ? <Zap className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
          {last.mode === 'live' && `Live · ${last.provider ?? 'AI'}${last.model ? ` (${last.model.replace(/^.*\//, '')})` : ''} · ${(Number(last.ms) / 1000).toFixed(1)}s${last.usage ? ` · ${last.usage.input + last.usage.output} tokens` : ''}`}
          {last.mode === 'offline' && 'Offline mode: no API key configured, answering from the deterministic engine'}
          {last.mode === 'degraded' && `Graceful fallback${last.degradedReason ? `: ${last.degradedReason}` : ''}`}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto scroll-thin px-4 py-3 space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500 space-y-3">
            <p>Ask out loud or type. Every number I say comes from the prerequisite engine, not from guessing, and I can redraw your plan live.</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-[13px] px-3 py-2 rounded-lg border border-slate-300 hover:border-blue-300 hover:bg-slate-50 text-slate-700 transition">
                  “{s}”
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`max-w-[92%] rounded-xl px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-blue-600 text-white font-medium' : 'bg-slate-100 text-slate-800'}`}>
              {m.role === 'assistant' ? renderInline(m.content) : m.content}
              {m.trace && m.trace.length > 0 && <TraceView trace={m.trace} />}
            </div>
          </div>
        ))}
        {interim && <div className="flex justify-end"><div className="max-w-[92%] rounded-xl px-3 py-2 text-[13.5px] bg-blue-100 text-blue-900 italic">{interim}…</div></div>}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <LoaderCircle className="w-4 h-4 animate-spin text-blue-600" /> Calling tools…
          </div>
        )}
      </div>

      {notice && <div className="px-4 py-1 text-[11px] text-amber-700">{notice}</div>}
      <form onSubmit={e => { e.preventDefault(); send(input); }} className="p-3 border-t border-slate-200 flex items-center gap-2">
        <button type="button" onClick={toggleMic} disabled={busy}
          className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition ${
            listening ? 'bg-red-600 text-white mic-live' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'} disabled:opacity-50`}
          aria-label={listening ? 'Stop listening' : 'Speak a question'} title="Hold a conversation by voice">
          {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <input value={input} onChange={e => setInput(e.target.value)} maxLength={1500}
          placeholder={cooldown > 0 ? `Rate limited, wait ${cooldown}s` : listening ? 'Listening…' : 'Ask “what if I work 30 hours?”'}
          className="flex-1 min-w-0 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
        <button type="submit" disabled={busy || !input.trim() || cooldown > 0}
          className="shrink-0 w-11 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-40"
          aria-label="Send">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
