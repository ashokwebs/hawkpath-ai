import { Course, DAGNode, DAGEdge, PlannedSemester, SimulationResult, ArticulationTarget, StudentProfile } from '../types/index.js';
import { COURSE_MAP, CRC_COURSES } from '../data/crcCurriculum.js';

/** First term the planner schedules (the next full term after Fall 2026). */
export const PLAN_START_YEAR = 2027;

/**
 * Calculates the fan-out degree (downstream dependents) of each course in the curriculum.
 */
export function calculateFanOutDegrees(): Map<string, number> {
  const fanout = new Map<string, number>();
  for (const course of CRC_COURSES) {
    fanout.set(course.code, 0);
  }

  for (const course of CRC_COURSES) {
    for (const prereq of course.prerequisites) {
      fanout.set(prereq, (fanout.get(prereq) || 0) + 1);
    }
  }
  return fanout;
}

/**
 * Computes the critical path of prerequisites for a given target curriculum.
 * Returns the set of course codes that lie on the longest dependency chain.
 */
export function computeCriticalPath(targetCourses: string[]): string[] {
  const memo = new Map<string, { length: number; path: string[] }>();

  function getLongestPathTo(code: string): { length: number; path: string[] } {
    if (memo.has(code)) return memo.get(code)!;
    const course = COURSE_MAP.get(code);
    if (!course || course.prerequisites.length === 0) {
      const res = { length: 1, path: [code] };
      memo.set(code, res);
      return res;
    }

    let maxSubPath: string[] = [];
    let maxLength = 0;

    for (const prereq of course.prerequisites) {
      const sub = getLongestPathTo(prereq);
      if (sub.length > maxLength) {
        maxLength = sub.length;
        maxSubPath = sub.path;
      }
    }

    const res = {
      length: maxLength + 1,
      path: [...maxSubPath, code]
    };
    memo.set(code, res);
    return res;
  }

  let criticalChain: string[] = [];
  let maxLen = 0;

  for (const target of targetCourses) {
    const chain = getLongestPathTo(target);
    if (chain.length > maxLen) {
      maxLen = chain.length;
      criticalChain = chain.path;
    }
  }

  return criticalChain;
}

/**
 * Simulates and generates an optimal semester-by-semester academic schedule
 * given student completed courses, target university, and workload constraints.
 */
export function simulateAcademicRoadmap(
  profile: StudentProfile,
  target: ArticulationTarget
): SimulationResult {
  const completedCodes = new Set(
    profile.completedCourses
      .filter(c => c.grade !== 'F' && c.grade !== 'D' && c.grade !== 'IP')
      .map(c => c.courseCode)
  );

  const inProgressCodes = new Set(
    profile.completedCourses
      .filter(c => c.grade === 'IP')
      .map(c => c.courseCode)
  );

  const allRequired = Array.from(new Set([
    ...target.requiredMajorCourses,
    ...(target.igetcRequired ? ['ENGWR 300', 'ENGWR 302', 'COMM 301', 'POLS 301', 'HIST 310'] : [])
  ]));

  // Missing prerequisites needed that aren't explicitly in the target major list
  const fullRequiredSet = new Set<string>();
  function addWithPrereqs(code: string) {
    if (fullRequiredSet.has(code)) return;
    fullRequiredSet.add(code);
    const c = COURSE_MAP.get(code);
    if (c) {
      for (const p of c.prerequisites) {
        addWithPrereqs(p);
      }
    }
  }

  allRequired.forEach(addWithPrereqs);

  const criticalPath = computeCriticalPath(Array.from(fullRequiredSet));
  const criticalPathSet = new Set(criticalPath);

  // Remaining courses to schedule
  const uncompleted = Array.from(fullRequiredSet).filter(
    code => !completedCodes.has(code) && !inProgressCodes.has(code)
  );

  // Available completed set as we simulate forward
  const currentSatisfied = new Set<string>([...completedCodes, ...inProgressCodes]);

  const semesters: PlannedSemester[] = [];
  // Workload-aware unit cap: heavier employment lowers the sustainable STEM load.
  const hoursCap = profile.workingHoursPerWeek >= 30 ? 10 : profile.workingHoursPerWeek >= 25 ? 12 : 99;
  const maxUnitsPerTerm = Math.min(profile.targetUnitsPerTerm || 14, hoursCap);

  let currentYear = PLAN_START_YEAR;
  const terms: ('Spring' | 'Summer' | 'Fall')[] = ['Spring', 'Fall']; // Standard full terms
  let termIndex = 0;
  let remainingList = [...uncompleted];
  const bottlenecksFound: string[] = [];

  // Sort remaining initially by criticality (critical path first, then fan-out degree)
  const fanOuts = calculateFanOutDegrees();
  remainingList.sort((a, b) => {
    const aCrit = criticalPathSet.has(a) ? 1 : 0;
    const bCrit = criticalPathSet.has(b) ? 1 : 0;
    if (aCrit !== bCrit) return bCrit - aCrit;
    return (fanOuts.get(b) || 0) - (fanOuts.get(a) || 0);
  });

  let safetyLoop = 0;
  while (remainingList.length > 0 && safetyLoop < 16) {
    safetyLoop++;
    const termSeason = terms[termIndex % terms.length];
    if (termSeason === 'Spring' && termIndex > 0) currentYear++;

    const termCourses: Course[] = [];
    let termUnits = 0;
    const warnings: string[] = [];
    const scheduledThisTerm: string[] = [];

    for (let i = 0; i < remainingList.length; i++) {
      const code = remainingList[i];
      const course = COURSE_MAP.get(code);
      if (!course) continue;

      // Check if all prerequisites are fulfilled in previous semesters
      const prereqsMet = course.prerequisites.every(p => currentSatisfied.has(p));
      if (!prereqsMet) continue;

      // Check term offering
      if (!course.termsOffered.includes(termSeason)) continue;

      // Check unit capacity
      if (termUnits + course.units > maxUnitsPerTerm && termCourses.length >= 2) {
        continue;
      }

      // Check heavy lab combo warning
      const isLabCourse = ['PHYS 411', 'PHYS 421', 'CHEM 400', 'CISP 430'].includes(code);
      const existingLabs = termCourses.filter(c => ['PHYS 411', 'PHYS 421', 'CHEM 400', 'CISP 430'].includes(c.code));
      if (isLabCourse && existingLabs.length >= 2) {
        warnings.push(`Heavy STEM load: ${code} scheduled alongside ${existingLabs.map(l => l.code).join(', ')}.`);
      }

      termCourses.push(course);
      termUnits += course.units;
      scheduledThisTerm.push(code);
    }

    // If no course could be scheduled, there is a circular or unfulfillable bottleneck
    if (scheduledThisTerm.length === 0 && remainingList.length > 0) {
      bottlenecksFound.push(`Prerequisite bottleneck for: ${remainingList.join(', ')}.`);
      break;
    }

    // Mark as satisfied for subsequent terms
    for (const code of scheduledThisTerm) {
      currentSatisfied.add(code);
    }

    remainingList = remainingList.filter(code => !scheduledThisTerm.includes(code));

    semesters.push({
      id: `sem-${termSeason.toLowerCase()}-${currentYear}`,
      term: termSeason,
      year: currentYear,
      courses: termCourses,
      totalUnits: termUnits,
      warnings,
      isHeavyWorkload: termUnits > 14 || termCourses.some(c => criticalPathSet.has(c.code))
    });

    termIndex++;
  }

  // Calculate completeness metrics
  const totalTargetRequired = target.requiredMajorCourses.length;
  const completedTargetCount = target.requiredMajorCourses.filter(c => currentSatisfied.has(c)).length;
  const majorPrepCompleteness = Math.min(100, Math.round((completedTargetCount / totalTargetRequired) * 100));

  const totalTransferUnits = profile.completedCourses.reduce((sum, c) => sum + c.units, 0) +
    semesters.reduce((sum, s) => sum + s.totalUnits, 0);

  const lastSem = semesters[semesters.length - 1];
  const graduationTerm = lastSem ? `${lastSem.term} ${lastSem.year}` : 'Ready to Transfer!';

  let counselorRecommendation = '';
  if (profile.workingHoursPerWeek > 20 && maxUnitsPerTerm > 13) {
    counselorRecommendation = `MESA Advisory: High work hours detected. Recommend capping at 12 units to protect GPA for the ${target.universityName} transfer.`;
  } else if (majorPrepCompleteness >= 90) {
    counselorRecommendation = 'On track: every sequential prerequisite is scheduled before the spring before transfer. Protect the critical-path courses above all else.';
  } else {
    counselorRecommendation = 'Sequential Sequence Alert: Follow the highlighted critical path to avoid a full 1-year graduation delay.';
  }

  return {
    semesters,
    graduationTerm,
    totalTransferUnits,
    majorPrepCompleteness,
    igetcCompleteness: target.igetcRequired ? 95 : 100,
    bottlenecksFound,
    criticalPathCourses: criticalPath,
    counselorRecommendation
  };
}

/**
 * Builds DAG nodes and edges for visual SVG rendering.
 */
export function buildDAGGraph(
  profile: StudentProfile,
  target: ArticulationTarget,
  simulation: SimulationResult
): { nodes: DAGNode[]; edges: DAGEdge[] } {
  const completedMap = new Map(profile.completedCourses.map(c => [c.courseCode, c]));
  const criticalPathSet = new Set(simulation.criticalPathCourses);

  // Map each course to its semester index (0 for completed, 1..N for planned)
  const courseSemesterIndex = new Map<string, number>();
  for (const c of profile.completedCourses) {
    if (c.grade === 'F' || c.grade === 'D') completedMap.delete(c.courseCode); // must be retaken
    courseSemesterIndex.set(c.courseCode, 0);
  }
  simulation.semesters.forEach((sem, idx) => {
    sem.courses.forEach(c => {
      courseSemesterIndex.set(c.code, idx + 1);
    });
  });

  const relevantCourses = new Set<string>([
    ...target.requiredMajorCourses,
    ...profile.completedCourses.map(c => c.courseCode),
    ...simulation.semesters.flatMap(s => s.courses.map(c => c.code))
  ]);

  const nodes: DAGNode[] = [];
  const edges: DAGEdge[] = [];

  for (const code of relevantCourses) {
    const course = COURSE_MAP.get(code);
    if (!course) continue;

    const compRecord = completedMap.get(code);
    let status: DAGNode['status'] = 'planned';

    if (compRecord) {
      status = compRecord.grade === 'IP' ? 'in-progress' : 'completed';
    } else if (criticalPathSet.has(code)) {
      status = 'critical';
    }

    nodes.push({
      id: code,
      code: course.code,
      title: course.title,
      department: course.department,
      units: course.units,
      status,
      prereqs: course.prerequisites,
      isCriticalPath: criticalPathSet.has(code),
      grade: compRecord?.grade,
      semesterIndex: courseSemesterIndex.get(code) || 0
    });

    for (const prereq of course.prerequisites) {
      if (relevantCourses.has(prereq)) {
        edges.push({
          from: prereq,
          to: code,
          isCritical: criticalPathSet.has(prereq) && criticalPathSet.has(code)
        });
      }
    }
  }

  return { nodes, edges };
}
