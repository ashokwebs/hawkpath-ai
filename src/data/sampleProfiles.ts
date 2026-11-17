import { StudentProfile } from '../types';

export const SAMPLE_PROFILES: StudentProfile[] = [
  {
    id: 'ashok-patel',
    name: 'Ashok Patel',
    studentId: 'W1984210',
    college: 'Cosumnes River College',
    major: 'Computer Science (AS-T)',
    targetUniversity: 'uc-davis-cs',
    completedCourses: [
      { courseCode: 'CISP 300', grade: 'A', term: 'Fall 2024', units: 3 },
      { courseCode: 'MATH 370', grade: 'A', term: 'Fall 2024', units: 5 },
      { courseCode: 'ENGWR 300', grade: 'A', term: 'Fall 2024', units: 3 },
      { courseCode: 'CISP 360', grade: 'A', term: 'Spring 2025', units: 4 },
      { courseCode: 'MATH 400', grade: 'B', term: 'Spring 2025', units: 5 },
      { courseCode: 'COMM 301', grade: 'A', term: 'Spring 2025', units: 3 },
      { courseCode: 'CISP 400', grade: 'IP', term: 'Fall 2025', units: 4 },
      { courseCode: 'MATH 401', grade: 'IP', term: 'Fall 2025', units: 5 },
      { courseCode: 'HIST 310', grade: 'A', term: 'Summer 2025', units: 3 },
    ],
    targetUnitsPerTerm: 14,
    workingHoursPerWeek: 20,
    isMesaStudent: true,
    notes: 'MESA Scholar balancing 20 hrs/wk part-time job at the CRC Tutoring Center.'
  },
  {
    id: 'maya-lin',
    name: 'Maya Lin',
    studentId: 'W2041923',
    college: 'Cosumnes River College',
    major: 'Computer Science (Freshman)',
    targetUniversity: 'uc-berkeley-eecs',
    completedCourses: [
      { courseCode: 'CISP 300', grade: 'A', term: 'Fall 2025', units: 3 },
      { courseCode: 'MATH 370', grade: 'A', term: 'Fall 2025', units: 5 },
      { courseCode: 'ENGWR 300', grade: 'A', term: 'Fall 2025', units: 3 }
    ],
    targetUnitsPerTerm: 16,
    workingHoursPerWeek: 0,
    isMesaStudent: true,
    notes: 'Ambitious first-year student aiming for competitive admission to UC Berkeley EECS.'
  },
  {
    id: 'marcus-vance',
    name: 'Marcus Vance',
    studentId: 'W1782390',
    college: 'Cosumnes River College',
    major: 'Computer Science (Transfer Track)',
    targetUniversity: 'csus-cs',
    completedCourses: [
      { courseCode: 'CISP 300', grade: 'B', term: 'Spring 2024', units: 3 },
      { courseCode: 'MATH 370', grade: 'C', term: 'Spring 2024', units: 5 },
      { courseCode: 'CISP 360', grade: 'B', term: 'Fall 2024', units: 4 },
      { courseCode: 'MATH 400', grade: 'B', term: 'Spring 2025', units: 5 },
      { courseCode: 'ENGWR 300', grade: 'B', term: 'Fall 2024', units: 3 },
      { courseCode: 'POLS 301', grade: 'A', term: 'Summer 2025', units: 3 }
    ],
    targetUnitsPerTerm: 12,
    workingHoursPerWeek: 30,
    isMesaStudent: false,
    notes: 'Working adult student needing a streamlined, low-stress path to Sac State CS.'
  }
];
