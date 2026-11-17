import React, { useMemo } from 'react';
import { Landmark, ExternalLink } from 'lucide-react';
import { StudentProfile } from '../types';
import { ARTICULATION_TARGETS } from '../data/articulationAgreements';
import { Scenario, runScenario } from '../utils/scenario';
import { useSchools, fmtUSD, fmtPct, SchoolOutcomes } from '../lib/schools';

interface Props {
  profile: StudentProfile;
  scenario: Scenario;
  onPickTarget: (targetId: string) => void;
}

/** Side-by-side: our deterministic transfer timeline + live federal outcome data. */
export const SchoolCompare: React.FC<Props> = ({ profile, scenario, onPickTarget }) => {
  const schools = useSchools();
  const currentId = scenario.targetId ?? profile.targetUniversity;

  const rows = useMemo(() => ARTICULATION_TARGETS.map(t => {
    const r = runScenario(profile, { ...scenario, targetId: t.id });
    return { t, term: r.sim.graduationTerm, terms: r.sim.semesters.length, gpa: r.gpa, prep: r.sim.majorPrepCompleteness };
  }), [profile, scenario]);

  const fetched = schools?.fetchedAt ? new Date(schools.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2"><Landmark className="w-4 h-4 text-blue-600" /> Compare transfer options</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your projected timeline (from the planner) next to real outcomes for each university. Click a row to plan for it.</p>
        </div>
        <span className="text-[11px] text-slate-500">
          Outcomes: U.S. Dept. of Education College Scorecard{fetched ? ` · updated ${fetched}` : ''}{schools?.stale ? ' (cached)' : ''}
        </span>
      </div>
      <div className="overflow-x-auto scroll-thin -mx-5 px-5">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-3 font-medium">University · program</th>
              <th className="py-2 px-3 font-medium">Your transfer</th>
              <th className="py-2 px-3 font-medium">GPA min / comp.</th>
              <th className="py-2 px-3 font-medium text-right">Net price / yr</th>
              <th className="py-2 px-3 font-medium text-right">Grad rate</th>
              <th className="py-2 px-3 font-medium text-right">Median debt</th>
              <th className="py-2 pl-3 font-medium text-right">Earnings (10 yr)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, term, terms, gpa }) => {
              const o: SchoolOutcomes | null | undefined = schools?.schools[t.id];
              const active = t.id === currentId;
              const gpaTone = gpa >= t.competitiveGPA ? 'text-emerald-700' : gpa >= t.minTransferGPA ? 'text-amber-700' : 'text-red-600';
              return (
                <tr key={t.id} onClick={() => onPickTarget(t.id)}
                  className={`border-b border-slate-100 last:border-0 cursor-pointer transition ${active ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}>
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                      {t.universityName}
                      {active && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-600 text-white">Current</span>}
                    </div>
                    <div className="text-xs text-slate-500">{t.majorName}</div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{term}</div>
                    <div className="text-xs text-slate-500">{terms} term{terms === 1 ? '' : 's'} left</div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`font-medium ${gpaTone}`}>{gpa.toFixed(2)}</span>
                    <span className="text-slate-500"> vs {t.minTransferGPA.toFixed(1)} / {t.competitiveGPA.toFixed(1)}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{schools ? fmtUSD(o?.netPrice) : <Skel />}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{schools ? fmtPct(o?.gradRate) : <Skel />}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{schools ? fmtUSD(o?.medianDebt) : <Skel />}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-slate-900">{schools ? fmtUSD(o?.medianEarnings10yr) : <Skel />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
        Net price is the average after grants for in-state students; graduation rate is completion within 6 years; earnings are the median 10 years after entry.
        <a href="https://collegescorecard.ed.gov/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-700 hover:underline ml-1">Source <ExternalLink className="w-3 h-3" /></a>
      </p>
    </section>
  );
};

const Skel = () => <span className="inline-block w-14 h-3 rounded bg-slate-100 animate-pulse align-middle" />;

/** Compact outcomes card for the current target. */
export const OutcomesCard: React.FC<{ targetId: string; targetLabel: string }> = ({ targetId, targetLabel }) => {
  const schools = useSchools();
  const o = schools?.schools[targetId];
  const crc = schools?.schools.crc;
  const items: [string, string, string?][] = o ? [
    ['Avg net price / yr', fmtUSD(o.netPrice), crc ? `CRC today: ${fmtUSD(crc.netPrice)}` : undefined],
    ['Graduation rate', fmtPct(o.gradRate), 'within 6 years'],
    ['Median debt', fmtUSD(o.medianDebt), 'at graduation'],
    ['Median earnings', fmtUSD(o.medianEarnings10yr), '10 yrs after entry'],
    ['Pell grant students', fmtPct(o.pellShare), 'share of undergrads'],
    ['Undergraduates', o.students != null ? o.students.toLocaleString('en-US') : '—', o.city],
  ] : [];
  return (
    <div className="card p-4">
      <div className="text-sm font-semibold text-slate-900">{targetLabel}: what it costs &amp; pays</div>
      <div className="text-[11px] text-slate-500 mb-3">Live from the U.S. Dept. of Education College Scorecard</div>
      {!schools ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />)}</div>
      ) : !o ? (
        <p className="text-xs text-slate-500">Outcome data is temporarily unavailable.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {items.map(([k, v, sub]) => (
            <div key={k}>
              <dt className="text-[11px] text-slate-500">{k}</dt>
              <dd className="text-[15px] font-semibold text-slate-900 tabular-nums leading-tight">{v}</dd>
              {sub && <dd className="text-[10.5px] text-slate-400">{sub}</dd>}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
