import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, GitBranch, Gauge, Award, ListChecks, TriangleExclamationPoint } from 'lucide-react';
import { Header } from '../components/Header';
import { DAGView, DAGLegend } from '../components/DAGView';
import { SemesterPlan } from '../components/SemesterPlan';
import { ScenarioPanel } from '../components/ScenarioPanel';
import { AdvisorChat } from '../components/AdvisorChat';
import { AuthModal } from '../components/AuthModal';
import { ProfileEditor } from '../components/ProfileEditor';
import { ReportModal } from '../components/ReportModal';
import { SchoolCompare, OutcomesCard } from '../components/SchoolCompare';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { StudentProfile } from '../types';
import { buildDAGGraph } from '../utils/graphAlgorithms';
import { Scenario, runScenario, termIndex, getTarget } from '../utils/scenario';
import { useAuth } from '../lib/auth';
import { loadPlan, savePlan } from '../lib/storage';

const EMPTY_PROFILE: StudentProfile = {
  id: 'my-plan', name: 'My plan', studentId: '', college: 'Cosumnes River College', major: 'Computer Science',
  targetUniversity: 'uc-davis-cs', completedCourses: [], targetUnitsPerTerm: 14, workingHoursPerWeek: 15, isMesaStudent: true,
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string; flashKey?: string }> =
  ({ icon, label, value, sub, tone = 'text-slate-900', flashKey }) => (
  <div key={flashKey} className="card p-4 flash">
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 font-medium">{icon}{label}</div>
    <div className={`mt-1.5 text-2xl font-bold tracking-tight tabular-nums ${tone}`}>{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
  </div>
);

export const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [myProfile, setMyProfile] = useState<StudentProfile | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(SAMPLE_PROFILES[0]);
  const [scenario, setScenario] = useState<Scenario>({});
  const [savedTo, setSavedTo] = useState<'cloud' | 'local' | null>(null);
  const [modal, setModal] = useState<null | 'auth' | 'edit' | 'report'>(null);

  // Load the student's own plan (cloud if signed in, otherwise this browser).
  useEffect(() => {
    if (loading) return;
    loadPlan(user?.id ?? null).then(saved => {
      if (saved?.profile) {
        const p = { ...saved.profile, id: 'my-plan' };
        setMyProfile(p);
        setProfile(p);
        setScenario(saved.scenario ?? {});
      }
    });
  }, [user?.id, loading]);

  // Persist scenario changes for the student's own plan.
  useEffect(() => {
    if (profile.id !== 'my-plan') return;
    const t = setTimeout(() => savePlan(user?.id ?? null, { profile, scenario }).then(setSavedTo), 600);
    return () => clearTimeout(t);
  }, [profile, scenario, user?.id]);

  const baseline = useMemo(() => runScenario(profile, {}), [profile]);
  const current = useMemo(() => runScenario(profile, scenario), [profile, scenario]);
  const graph = useMemo(() => buildDAGGraph(current.profile, current.target, current.sim), [current]);
  const failed = useMemo(() => new Set(scenario.failCourses ?? []), [scenario]);
  const delta = termIndex(current.sim.graduationTerm) - termIndex(baseline.sim.graduationTerm);

  const selectProfile = (p: StudentProfile) => { setProfile(p); setScenario({}); };
  const applyScenario = useCallback((s: Scenario) => setScenario(s), []);

  const gpaTone = current.gpa >= current.target.competitiveGPA ? 'text-emerald-600' : current.gpa >= current.target.minTransferGPA ? 'text-amber-600' : 'text-red-600';
  const scenarioKey = JSON.stringify(scenario) + profile.id;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header currentProfile={profile} myProfile={myProfile} onSelectProfile={selectProfile}
        onEditRecord={() => setModal('edit')} onOpenReport={() => setModal('report')} onSignIn={() => setModal('auth')} savedTo={savedTo} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {profile.name}{profile.isMesaStudent && <span className="ml-2 align-middle text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">MESA</span>}
            </h1>
            <p className="text-sm text-slate-500">{current.target.universityName}, {current.target.majorName} · {current.profile.workingHoursPerWeek} h/week work · {profile.notes ?? 'Your saved plan'}</p>
          </div>
          {profile.id !== 'my-plan' && (
            <button onClick={() => setModal('edit')} className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-4">
              This is a demo student. Build your own plan →
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat flashKey={scenarioKey + 'a'} icon={<CalendarClock className="w-3.5 h-3.5" />} label="Projected transfer"
            value={current.sim.graduationTerm}
            tone={delta > 0 ? 'text-red-600' : delta < 0 ? 'text-emerald-600' : 'text-slate-900'}
            sub={delta !== 0 ? `${delta > 0 ? '+' : ''}${delta} term${Math.abs(delta) > 1 ? 's' : ''} vs current plan` : `${current.sim.semesters.length} terms to go`} />
          <Stat flashKey={scenarioKey + 'b'} icon={<Gauge className="w-3.5 h-3.5" />} label="GPA vs target" value={current.gpa.toFixed(2)} tone={gpaTone}
            sub={`min ${current.target.minTransferGPA} · competitive ${current.target.competitiveGPA}`} />
          <Stat flashKey={scenarioKey + 'c'} icon={<ListChecks className="w-3.5 h-3.5" />} label="Major prep" value={`${current.sim.majorPrepCompleteness}%`}
            sub="complete after this plan" />
          <Stat flashKey={scenarioKey + 'd'} icon={<Award className="w-3.5 h-3.5" />} label="Critical path" value={`${current.sim.criticalPathCourses.length} courses`}
            sub={<span className="font-mono">{current.sim.criticalPathCourses.slice(-3).join(' → ')}</span>} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-3 space-y-5 order-2 xl:order-1 min-w-0">
            <ScenarioPanel profile={profile} scenario={scenario} onChange={setScenario} delta={delta} />
            <OutcomesCard targetId={current.target.id} targetLabel={current.target.universityName} />
            <div className="card p-4 text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-sm text-slate-900">Counselor note</div>
              <p>{current.sim.counselorRecommendation}</p>
              {current.sim.bottlenecksFound.map(b => (
                <p key={b} className="text-amber-700 flex gap-1"><TriangleExclamationPoint className="w-3.5 h-3.5 shrink-0" />{b}</p>
              ))}
            </div>
          </div>

          <div className="xl:col-span-6 space-y-5 order-1 xl:order-2 min-w-0">
            <section className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-[15px] font-semibold text-slate-900 flex items-center gap-2"><GitBranch className="w-4 h-4 text-blue-600" /> Prerequisite graph, by term</h2>
                <DAGLegend />
              </div>
              <DAGView nodes={graph.nodes} edges={graph.edges} simulation={current.sim} failed={failed} />
            </section>
            <section className="card p-4">
              <h2 className="text-[15px] font-semibold text-slate-900 mb-3">Term-by-term plan</h2>
              <SemesterPlan simulation={current.sim} />
            </section>

          </div>

          <div className="xl:col-span-3 order-3 min-w-0 xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)]">
            <AdvisorChat profile={profile} scenario={scenario} onApplyScenario={applyScenario} />
          </div>
        </div>

        <SchoolCompare profile={profile} scenario={scenario}
              onPickTarget={id => setScenario(s => ({ ...s, targetId: id, label: id === profile.targetUniversity && !s.failCourses?.length ? s.label : `Transfer to ${getTarget(id).universityName} (${getTarget(id).majorName})` }))} />

        <p className="text-[11px] text-slate-500 text-center pt-4">
          HawkPath is a planning aid, not an official degree audit. Course data is a curated CRC STEM catalog sample; always confirm on ASSIST.org and with a counselor.
        </p>
      </main>

      <AuthModal open={modal === 'auth'} onClose={() => setModal(null)} />
      <ProfileEditor open={modal === 'edit'} initial={myProfile ?? EMPTY_PROFILE} onClose={() => setModal(null)}
        onSave={p => { setMyProfile(p); setProfile(p); setScenario({}); setModal(null); }} />
      <ReportModal open={modal === 'report'} onClose={() => setModal(null)} profile={profile} target={current.target}
        simulation={current.sim} gpa={current.gpa} scenario={scenario} />
    </div>
  );
};
