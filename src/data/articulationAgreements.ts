import { ArticulationTarget } from '../types';

export const ARTICULATION_TARGETS: ArticulationTarget[] = [
  {
    id: 'uc-davis-cs',
    universityName: 'UC Davis',
    majorName: 'Computer Science (B.S.)',
    minTransferGPA: 3.40,
    competitiveGPA: 3.80,
    requiredMajorCourses: [
      'CISP 360',
      'CISP 400',
      'CISP 430',
      'CISP 310',
      'CISP 440',
      'MATH 400',
      'MATH 401',
      'MATH 402',
      'MATH 410',
      'PHYS 411',
      'PHYS 421'
    ],
    recommendedCourses: [
      'ENGWR 300',
      'ENGWR 302',
      'COMM 301'
    ],
    igetcRequired: true,
    assistAgreementUrl: 'https://assist.org/transfer/report/26543209',
    acceptanceRate: '19.4%',
    notes: 'Major Preparation must be completed by the end of Spring term prior to Fall enrollment. No major courses may be taken P/NP.'
  },
  {
    id: 'csus-cs',
    universityName: 'California State University, Sacramento',
    majorName: 'Computer Science (B.S.)',
    minTransferGPA: 2.70,
    competitiveGPA: 3.25,
    requiredMajorCourses: [
      'CISP 360',
      'CISP 400',
      'CISP 430',
      'MATH 400',
      'MATH 401',
      'STAT 300',
      'PHYS 411'
    ],
    recommendedCourses: [
      'CISP 310',
      'MATH 410',
      'ENGWR 300'
    ],
    igetcRequired: false,
    assistAgreementUrl: 'https://assist.org/transfer/report/18793012',
    acceptanceRate: '72.0%',
    notes: 'CSUS is the primary local transfer destination for CRC students. Grade of C or better required in all pre-major coursework.'
  },
  {
    id: 'uc-berkeley-eecs',
    universityName: 'UC Berkeley',
    majorName: 'Electrical Engineering & Computer Sciences (B.S.)',
    minTransferGPA: 3.80,
    competitiveGPA: 3.95,
    requiredMajorCourses: [
      'CISP 360',
      'CISP 400',
      'CISP 430',
      'CISP 310',
      'CISP 440',
      'MATH 400',
      'MATH 401',
      'MATH 402',
      'MATH 410',
      'MATH 420',
      'PHYS 411',
      'PHYS 421',
      'CHEM 400'
    ],
    recommendedCourses: [
      'ENGWR 300',
      'ENGWR 302'
    ],
    igetcRequired: false, // College of Engineering requires 7-course breadth, not IGETC
    assistAgreementUrl: 'https://assist.org/transfer/report/9941203',
    acceptanceRate: '5.2%',
    notes: 'UC Berkeley College of Engineering does NOT accept IGETC. Must follow strict Engineering 7-course breadth.'
  },
  {
    id: 'uc-davis-ds',
    universityName: 'UC Davis',
    majorName: 'Data Science (B.S.)',
    minTransferGPA: 3.20,
    competitiveGPA: 3.65,
    requiredMajorCourses: [
      'CISP 360',
      'CISP 400',
      'CISP 430',
      'MATH 400',
      'MATH 401',
      'MATH 402',
      'MATH 410',
      'STAT 300'
    ],
    recommendedCourses: [
      'CISP 440',
      'ENGWR 300'
    ],
    igetcRequired: true,
    assistAgreementUrl: 'https://assist.org/transfer/report/3012894',
    acceptanceRate: '28.1%',
    notes: 'Fastest growing interdisciplinary STEM program at UC Davis. Strong emphasis on linear algebra and data structures.'
  },
  {
    id: 'sjsu-se',
    universityName: 'San Jose State University',
    majorName: 'Software Engineering (B.S.)',
    minTransferGPA: 3.30,
    competitiveGPA: 3.70,
    requiredMajorCourses: [
      'CISP 360',
      'CISP 400',
      'CISP 430',
      'CISP 440',
      'MATH 400',
      'MATH 401',
      'MATH 402',
      'PHYS 411',
      'PHYS 421'
    ],
    recommendedCourses: [
      'MATH 410',
      'ENGWR 300'
    ],
    igetcRequired: false,
    assistAgreementUrl: 'https://assist.org/transfer/report/4820193',
    acceptanceRate: '31.5%',
    notes: 'Direct pipeline into Silicon Valley tech firms. Highly impacted major with strict GPA cutoff recalculated each fall.'
  }
];
