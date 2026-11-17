export type Department = 'CISP' | 'MATH' | 'PHYS' | 'CHEM' | 'ENGR' | 'IGETC';

export type TermSeason = 'Fall' | 'Spring' | 'Summer';

export interface Course {
  code: string;                  // e.g. "CISP 360"
  title: string;                 // e.g. "Structured Programming with C++"
  units: number;                 // e.g. 4
  department: Department;
  description: string;
  prerequisites: string[];       // Course codes required
  corequisites?: string[];
  termsOffered: TermSeason[];
  minGrade?: string;             // Typically "C"
  criticalityScore?: number;     // CPM Fanout degree
}

export interface CompletedCourseRecord {
  courseCode: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'IP' | 'CR';
  term: string;                  // e.g. "Fall 2024"
  units: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  studentId: string;             // e.g. "W1984210"
  college: string;               // e.g. "Cosumnes River College"
  major: string;                 // e.g. "Computer Science (AS-T)"
  targetUniversity: string;      // e.g. "UC Davis - Computer Science (B.S.)"
  completedCourses: CompletedCourseRecord[];
  targetUnitsPerTerm: number;    // e.g. 13-16 units
  workingHoursPerWeek: number;   // e.g. 20 hours
  isMesaStudent: boolean;
  notes?: string;
}

export interface ArticulationTarget {
  id: string;
  universityName: string;
  majorName: string;
  minTransferGPA: number;
  competitiveGPA: number;
  requiredMajorCourses: string[];
  recommendedCourses: string[];
  igetcRequired: boolean;
  assistAgreementUrl?: string;
  notes: string;
  acceptanceRate?: string;
}

export interface PlannedSemester {
  id: string;
  term: TermSeason;
  year: number;
  courses: Course[];
  totalUnits: number;
  warnings: string[];
  isHeavyWorkload: boolean;
}

export interface DAGNode {
  id: string;
  code: string;
  title: string;
  department: Department;
  units: number;
  status: 'completed' | 'in-progress' | 'planned' | 'locked' | 'critical';
  prereqs: string[];
  isCriticalPath: boolean;
  grade?: string;
  semesterIndex?: number;
  x?: number;
  y?: number;
}

export interface DAGEdge {
  from: string;
  to: string;
  isCritical: boolean;
}

export interface SimulationResult {
  semesters: PlannedSemester[];
  graduationTerm: string;
  totalTransferUnits: number;
  majorPrepCompleteness: number;  // 0 - 100%
  igetcCompleteness: number;       // 0 - 100%
  bottlenecksFound: string[];
  criticalPathCourses: string[];
  counselorRecommendation: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  toolCall?: {
    name: string;
    params: any;
    result: any;
  };
}
