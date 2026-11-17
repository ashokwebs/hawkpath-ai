import { StudentProfile, SimulationResult, ArticulationTarget } from '../types/index.js';
import { ARTICULATION_TARGETS } from '../data/articulationAgreements.js';
import { COURSE_MAP, CRC_COURSES } from '../data/crcCurriculum.js';
import { simulateAcademicRoadmap } from './graphAlgorithms.js';

/**
 * A "what-if" scenario layered on top of a student's real record.
 * Shared by the browser dashboard and the server-side agent tools so the
 * numbers the AI speaks are byte-for-byte the numbers the UI draws.
 */
export interface Scenario {
  label?: string;
  targetId?: string;
  workHours?: number;
  unitsPerTerm?: number;
  failCourses?: string[];      // courses the student fails / withdraws from
  completeCourses?: string[];  // courses the student imagines finishing (e.g. summer)
}

const GRADE_POINTS: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

export function getTarget(id: string | undefined): ArticulationTarget {
  return ARTICULATION_TARGETS.find(t => t.id === id) ?? ARTICULATION_TARGETS[0];
}

export function isKnownCourse(code: string): boolean {
  return COURSE_MAP.has(code);
}

/** Normalises "cisp400", "CISP-400", "cisp 400" → "CISP 400". */
export function normalizeCourseCode(raw: string): string {
  const m = String(raw).toUpperCase().match(/([A-Z]{3,5})\s*-?\s*(\d{3})/);
  return m ? `${m[1]} ${m[2]}` : String(raw).toUpperCase().trim();
}

export function applyScenario(profile: StudentProfile, s: Scenario): StudentProfile {
  const fail = new Set((s.failCourses ?? []).map(normalizeCourseCode));
  const complete = (s.completeCourses ?? []).map(normalizeCourseCode).filter(isKnownCourse);

  const courses = profile.completedCourses.map(c =>
    fail.has(c.courseCode) ? { ...c, grade: 'F' as const } : c
  );
  for (const code of complete) {
    if (!courses.some(c => c.courseCode === code && c.grade !== 'F')) {
      courses.push({ courseCode: code, grade: 'CR', term: 'Summer (what-if)', units: COURSE_MAP.get(code)!.units });
    }
  }
  return {
    ...profile,
    targetUniversity: s.targetId ?? profile.targetUniversity,
    workingHoursPerWeek: s.workHours ?? profile.workingHoursPerWeek,
    targetUnitsPerTerm: s.unitsPerTerm ?? profile.targetUnitsPerTerm,
    completedCourses: courses,
  };
}

export function computeGPA(profile: StudentProfile): number {
  let pts = 0, units = 0;
  for (const c of profile.completedCourses) {
    if (c.grade in GRADE_POINTS) {
      pts += GRADE_POINTS[c.grade] * c.units;
      units += c.units;
    }
  }
  return units ? Math.round((pts / units) * 100) / 100 : 0;
}

/** Converts "Fall 2027" into a sortable index (two terms per year). */
export function termIndex(term: string): number {
  const m = term.match(/(Spring|Summer|Fall)\s+(\d{4})/);
  if (!m) return 0;
  return Number(m[2]) * 2 + (m[1] === 'Fall' ? 1 : 0);
}

export function runScenario(profile: StudentProfile, s: Scenario) {
  const p = applyScenario(profile, s);
  const target = getTarget(s.targetId ?? profile.targetUniversity);
  const sim = simulateAcademicRoadmap(p, target);
  return { profile: p, target, sim, gpa: computeGPA(p) };
}

/** All courses that (transitively) depend on `code`. */
export function downstreamOf(code: string): string[] {
  const out = new Set<string>();
  const stack = [code];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const c of CRC_COURSES) {
      if (c.prerequisites.includes(cur) && !out.has(c.code)) {
        out.add(c.code);
        stack.push(c.code);
      }
    }
  }
  return [...out];
}

/** All courses `code` (transitively) requires. */
export function upstreamOf(code: string): string[] {
  const out = new Set<string>();
  const stack = [...(COURSE_MAP.get(code)?.prerequisites ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (out.has(cur)) continue;
    out.add(cur);
    stack.push(...(COURSE_MAP.get(cur)?.prerequisites ?? []));
  }
  return [...out];
}

export function summarizeSim(sim: SimulationResult) {
  return {
    projectedTransferTerm: sim.graduationTerm,
    termsRemaining: sim.semesters.length,
    majorPrepCompleteness: `${sim.majorPrepCompleteness}%`,
    criticalPath: sim.criticalPathCourses,
    bottlenecks: sim.bottlenecksFound,
    // Compact form keeps AI token usage low: "Spring 2027 (14u): CISP 430, PHYS 411"
    plan: sim.semesters.map(s => `${s.term} ${s.year} (${s.totalUnits}u): ${s.courses.map(c => c.code).join(', ')}${s.warnings.length ? ` ⚠ ${s.warnings.join('; ')}` : ''}`),
  };
}
