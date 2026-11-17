import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Upload, LoaderCircle, Sparkles } from 'lucide-react';
import { StudentProfile, CompletedCourseRecord } from '../types';
import { CRC_COURSES, COURSE_MAP } from '../data/crcCurriculum';
import { ARTICULATION_TARGETS } from '../data/articulationAgreements';
import { authHeaders } from '../lib/auth';

interface Props {
  open: boolean;
  initial: StudentProfile;
  onClose: () => void;
  onSave: (p: StudentProfile) => void;
}

const GRADES: CompletedCourseRecord['grade'][] = ['A', 'B', 'C', 'D', 'F', 'IP', 'CR'];

const fileToBase64 = (f: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(f);
});

export const ProfileEditor: React.FC<Props> = ({ open, initial, onClose, onSave }) => {
  const [p, setP] = useState<StudentProfile>(initial);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { if (open) { setP(initial); setImportMsg(null); } }, [open, initial]);
  if (!open) return null;

  const setCourse = (i: number, patch: Partial<CompletedCourseRecord>) =>
    setP(prev => ({ ...prev, completedCourses: prev.completedCourses.map((c, j) => j === i ? { ...c, ...patch } : c) }));

  const addCourse = () => {
    const taken = new Set(p.completedCourses.map(c => c.courseCode));
    const next = CRC_COURSES.find(c => !taken.has(c.code));
    if (!next) return;
    setP(prev => ({ ...prev, completedCourses: [...prev.completedCourses, { courseCode: next.code, grade: 'A', term: 'Fall 2026', units: next.units }] }));
  };

  const importTranscript = async (file: File) => {
    setImportMsg(null);
    if (file.size > 4_500_000) return setImportMsg({ kind: 'err', text: 'File too large (max 4.5 MB).' });
    setImporting(true);
    try {
      const data = await fileToBase64(file);
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ mediaType: file.type, data }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
      const merged = new Map(p.completedCourses.map(c => [c.courseCode, c]));
      for (const c of out.courses as CompletedCourseRecord[]) merged.set(c.courseCode, c);
      setP(prev => ({ ...prev, name: out.studentName || prev.name, completedCourses: [...merged.values()] }));
      setImportMsg({
        kind: 'ok',
        text: `Read ${out.courses.length} course${out.courses.length === 1 ? '' : 's'} in ${(out.ms / 1000).toFixed(1)}s.` +
          (out.unrecognized?.length ? ` Skipped ${out.unrecognized.length} not in the CRC STEM catalog (${out.unrecognized.slice(0, 5).join(', ')}).` : '') +
          ' Review below before saving.',
      });
    } catch (e) {
      setImportMsg({ kind: 'err', text: (e as Error).message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-300 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold">My academic record</h2>
            <p className="text-xs text-slate-500">Upload a transcript photo or PDF, or enter classes by hand.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-900" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-4 space-y-5">
          <label className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 cursor-pointer transition ${importing ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-300'}`}>
            {importing ? <LoaderCircle className="w-6 h-6 text-blue-600 animate-spin" /> : <Upload className="w-6 h-6 text-blue-600" />}
            <div className="text-sm">
              <div className="font-semibold flex items-center gap-1.5">{importing ? 'Reading your transcript…' : 'Import from transcript'} <Sparkles className="w-3.5 h-3.5 text-blue-600" /></div>
              <div className="text-xs text-slate-500">Gemini reads each row, then every course is checked against the catalog. PNG, JPG or PDF.</div>
            </div>
            <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" disabled={importing}
              onChange={e => { const f = e.target.files?.[0]; if (f) importTranscript(f); e.target.value = ''; }} />
          </label>
          {importMsg && <p className={`text-xs ${importMsg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{importMsg.text}</p>}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs text-slate-500">Name
              <input value={p.name} maxLength={60} onChange={e => setP({ ...p, name: e.target.value })}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs text-slate-500">Transfer goal
              <select value={p.targetUniversity} onChange={e => setP({ ...p, targetUniversity: e.target.value })}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500">
                {ARTICULATION_TARGETS.map(t => <option key={t.id} value={t.id}>{t.universityName} · {t.majorName}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-500">Work hours / week
              <input type="number" min={0} max={60} value={p.workingHoursPerWeek}
                onChange={e => setP({ ...p, workingHoursPerWeek: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs text-slate-500">Target units / term
              <input type="number" min={6} max={21} value={p.targetUnitsPerTerm}
                onChange={e => setP({ ...p, targetUnitsPerTerm: Math.max(6, Math.min(21, Number(e.target.value) || 12)) })}
                className="mt-1 w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={p.isMesaStudent} onChange={e => setP({ ...p, isMesaStudent: e.target.checked })} className="accent-blue-600" />
            I'm in the MESA program
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Courses ({p.completedCourses.length})</span>
              <button onClick={addCourse} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"><Plus className="w-3.5 h-3.5" /> Add course</button>
            </div>
            <div className="space-y-1.5">
              {p.completedCourses.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={c.courseCode} onChange={e => setCourse(i, { courseCode: e.target.value, units: COURSE_MAP.get(e.target.value)?.units ?? c.units })}
                    className="flex-1 min-w-0 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono">
                    {CRC_COURSES.map(cc => <option key={cc.code} value={cc.code}>{cc.code} · {cc.title}</option>)}
                  </select>
                  <select value={c.grade} onChange={e => setCourse(i, { grade: e.target.value as CompletedCourseRecord['grade'] })}
                    className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs">
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input value={c.term} maxLength={30} onChange={e => setCourse(i, { term: e.target.value })}
                    className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs hidden sm:block" />
                  <button onClick={() => setP(prev => ({ ...prev, completedCourses: prev.completedCourses.filter((_, j) => j !== i) }))}
                    className="p-1.5 text-slate-500 hover:text-red-600" aria-label={`Remove ${c.courseCode}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {p.completedCourses.length === 0 && <p className="text-xs text-slate-500">No courses yet. That's fine if you're just starting out.</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={() => onSave({ ...p, id: 'my-plan', name: p.name.trim() || 'My plan' })}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white">Save &amp; build my plan</button>
        </div>
      </div>
    </div>
  );
};
