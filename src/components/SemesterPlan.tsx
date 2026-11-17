import React from 'react';
import { TriangleExclamationPoint } from 'lucide-react';
import { SimulationResult } from '../types';

export const SemesterPlan: React.FC<{ simulation: SimulationResult }> = ({ simulation }) => {
  const critical = new Set(simulation.criticalPathCourses);
  if (simulation.semesters.length === 0) {
    return <p className="text-sm text-emerald-600">All required courses are done or in progress. You're ready to apply. 🎉</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {simulation.semesters.map(s => (
        <div key={s.id} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">{s.term} {s.year}</span>
            <span className={`text-[11px] font-mono ${s.totalUnits > 15 ? 'text-amber-700' : 'text-slate-500'}`}>{s.totalUnits} units</span>
          </div>
          <ul className="mt-2 space-y-1">
            {s.courses.map(c => (
              <li key={c.code} className="flex items-center gap-2 text-[12.5px]">
                <span className={`font-mono font-semibold whitespace-nowrap shrink-0 ${critical.has(c.code) ? 'text-orange-600' : 'text-slate-700'}`}>{c.code}</span>
                <span className="text-slate-500 truncate min-w-0">{c.title}</span>
              </li>
            ))}
          </ul>
          {s.warnings.map(w => (
            <p key={w} className="mt-2 text-[11px] text-amber-700 flex gap-1"><TriangleExclamationPoint className="w-3 h-3 shrink-0 mt-0.5" />{w}</p>
          ))}
        </div>
      ))}
    </div>
  );
};
