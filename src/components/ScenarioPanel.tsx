import React from 'react';
import { Briefcase, GraduationCap, RotateCcw, Target, FlaskConical } from 'lucide-react';
import { StudentProfile } from '../types';
import { ARTICULATION_TARGETS } from '../data/articulationAgreements';
import { Scenario } from '../utils/scenario';

interface Props {
  profile: StudentProfile;
  scenario: Scenario;
  onChange: (s: Scenario) => void;
  delta: number;
}

export const ScenarioPanel: React.FC<Props> = ({ profile, scenario, onChange, delta }) => {
  const hours = scenario.workHours ?? profile.workingHoursPerWeek;
  const units = scenario.unitsPerTerm ?? profile.targetUnitsPerTerm;
  const targetId = scenario.targetId ?? profile.targetUniversity;
  const failSet = new Set(scenario.failCourses ?? []);
  const failable = profile.completedCourses.filter(c => c.grade === 'IP' || ['CISP', 'MATH', 'PHYS'].includes(c.courseCode.split(' ')[0]));
  const isBaseline = !scenario.label && scenario.workHours == null && scenario.unitsPerTerm == null && !scenario.targetId && !(scenario.failCourses?.length);

  const set = (patch: Partial<Scenario>) => onChange({ ...scenario, label: scenario.label ?? 'Custom what-if', ...patch });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-bold">What-if simulator</h3>
        {!isBaseline && (
          <button onClick={() => onChange({})} className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {scenario.label && (
        <div className={`text-xs rounded-lg px-3 py-2 border ${delta > 0 ? 'border-red-200 bg-red-50 text-red-800' : delta < 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-slate-50 text-slate-600'}`}>
          <span className="font-semibold">{scenario.label}</span>
          <span className="block mt-0.5">
            {delta > 0 ? `Transfer slips ${delta} term${delta > 1 ? 's' : ''} vs your current plan` : delta < 0 ? `Transfer moves up ${-delta} term${delta < -1 ? 's' : ''}` : 'No change to your transfer term'}
          </span>
        </div>
      )}

      <label className="block">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5"><Target className="w-3.5 h-3.5" /> Transfer target</span>
        <select value={targetId} onChange={e => set({ targetId: e.target.value })}
          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500">
          {ARTICULATION_TARGETS.map(t => <option key={t.id} value={t.id}>{t.universityName} · {t.majorName}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Work hours / week</span>
          <span className="font-mono text-slate-900 font-semibold">{hours}h</span>
        </span>
        <input type="range" min={0} max={40} step={5} value={hours} onChange={e => set({ workHours: Number(e.target.value) })}
          className="w-full accent-blue-600" aria-label="Work hours per week" />
      </label>

      <label className="block">
        <span className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Units / term</span>
          <span className="font-mono text-slate-900 font-semibold">{units}</span>
        </span>
        <input type="range" min={6} max={19} value={units} onChange={e => set({ unitsPerTerm: Number(e.target.value) })}
          className="w-full accent-blue-600" aria-label="Units per term" />
        {hours >= 25 && <span className="text-[11px] text-amber-700">Capped at {hours >= 30 ? 10 : 12} units at {hours}h of work, to protect your GPA</span>}
      </label>

      <div>
        <span className="text-xs text-slate-500">Stress test: what if I fail…</span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {failable.map(c => {
            const on = failSet.has(c.courseCode);
            return (
              <button key={c.courseCode} onClick={() => {
                const next = new Set(failSet);
                on ? next.delete(c.courseCode) : next.add(c.courseCode);
                set({ failCourses: [...next], label: next.size ? `Fail ${[...next].join(' + ')}` : scenario.label });
              }}
                className={`text-[11px] font-mono px-2 py-1 rounded-md border transition ${on ? 'bg-red-50 border-red-500 text-red-800' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                {c.courseCode}{c.grade === 'IP' ? ' ·IP' : ''}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
