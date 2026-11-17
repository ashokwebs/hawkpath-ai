import { Course } from '../types/index.js';

export const CRC_COURSES: Course[] = [
  // --- Computer Science (CISP) ---
  {
    code: 'CISP 300',
    title: 'Algorithm Design/Problem Solving',
    units: 3,
    department: 'CISP',
    description: 'Introduction to computer science and programming logic using pseudocode, flowcharts, control structures, and modular algorithms.',
    prerequisites: [],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'CISP 360',
    title: 'Structured Programming with C++',
    units: 4,
    department: 'CISP',
    description: 'Fundamental structured programming principles using C++. Covers control structures, functions, arrays, pointers, memory allocation, and file I/O.',
    prerequisites: ['CISP 300'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'CISP 310',
    title: 'Assembly Language & Computer Architecture',
    units: 3,
    department: 'CISP',
    description: 'Architecture of x86/ARM processors, machine instruction execution, memory hierarchy, register operations, stack frames, and assembly implementation.',
    prerequisites: ['CISP 360'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'CISP 400',
    title: 'Object Oriented Programming with C++',
    units: 4,
    department: 'CISP',
    description: 'Advanced OOP principles: classes, dynamic polymorphism, operator overloading, templates, inheritance, exception handling, and standard template library (STL).',
    prerequisites: ['CISP 360'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'CISP 401',
    title: 'Object Oriented Programming with Java',
    units: 4,
    department: 'CISP',
    description: 'Java language fundamentals, OOP design patterns, GUI programming, thread synchronization, stream processing, and collections.',
    prerequisites: ['CISP 360'],
    termsOffered: ['Spring'],
    minGrade: 'C'
  },
  {
    code: 'CISP 430',
    title: 'Data Structures and Algorithms',
    units: 4,
    department: 'CISP',
    description: 'Essential CS theory: asymptotic complexity (Big-O), linked lists, stacks, queues, AVL trees, B-trees, hash tables, heaps, graph traversals (BFS/DFS), and Dijkstra’s algorithm.',
    prerequisites: ['CISP 400'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'CISP 440',
    title: 'Discrete Structures for Computer Science',
    units: 3,
    department: 'CISP',
    description: 'Propositional and predicate logic, proof techniques, induction, set theory, combinatorics, relations, graph theory, and Boolean algebra.',
    prerequisites: ['CISP 360', 'MATH 370'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },

  // --- Mathematics (MATH) ---
  {
    code: 'MATH 370',
    title: 'Pre-Calculus Mathematics',
    units: 5,
    department: 'MATH',
    description: 'Polynomial, rational, exponential, logarithmic, and trigonometric functions, inverse functions, analytic trigonometry, conic sections, and sequences.',
    prerequisites: [],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'MATH 400',
    title: 'Calculus I',
    units: 5,
    department: 'MATH',
    description: 'Limits, continuity, derivatives of algebraic and transcendental functions, Mean Value Theorem, optimization, curve sketching, Riemann sums, and Fundamental Theorem of Calculus.',
    prerequisites: ['MATH 370'],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'MATH 401',
    title: 'Calculus II',
    units: 5,
    department: 'MATH',
    description: 'Techniques of integration, applications of definite integrals, improper integrals, Taylor and Maclaurin power series, and parametric equations in polar coordinates.',
    prerequisites: ['MATH 400'],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'MATH 402',
    title: 'Calculus III (Multivariable)',
    units: 5,
    department: 'MATH',
    description: 'Vector-valued functions, partial differentiation, directional derivatives, Lagrange multipliers, multiple integrals, vector calculus, Green’s, Stokes’, and Divergence theorems.',
    prerequisites: ['MATH 401'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'MATH 410',
    title: 'Introduction to Linear Algebra',
    units: 3,
    department: 'MATH',
    description: 'Matrices, Gaussian elimination, determinants, vector spaces, subspaces, linear transformations, eigenvalues, eigenvectors, and diagonalization.',
    prerequisites: ['MATH 401'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'MATH 420',
    title: 'Differential Equations',
    units: 4,
    department: 'MATH',
    description: 'First order and higher order linear differential equations, Laplace transforms, power series solutions, systems of linear differential equations, and phase plane analysis.',
    prerequisites: ['MATH 401'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'STAT 300',
    title: 'Introduction to Probability and Statistics',
    units: 4,
    department: 'MATH',
    description: 'Descriptive statistics, normal and binomial distributions, confidence intervals, hypothesis testing, regression analysis, ANOVA, and contingency tables.',
    prerequisites: [],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },

  // --- Physics (PHYS) ---
  {
    code: 'PHYS 411',
    title: 'Mechanics of Solids and Fluids',
    units: 4,
    department: 'PHYS',
    description: 'Calculus-based physics covering kinematics, Newton’s laws of motion, work, kinetic and potential energy, linear and angular momentum, rotation, gravitation, and fluid mechanics.',
    prerequisites: ['MATH 400'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'PHYS 421',
    title: 'Electricity and Magnetism',
    units: 4,
    department: 'PHYS',
    description: 'Electrostatics, Coulomb’s Law, Gauss’s Law, electric potential, capacitance, DC circuits, magnetic fields, Ampere’s Law, Faraday’s Law, and Maxwell’s equations.',
    prerequisites: ['PHYS 411', 'MATH 401'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },
  {
    code: 'CHEM 400',
    title: 'General Chemistry I',
    units: 5,
    department: 'CHEM',
    description: 'Atomic structure, chemical nomenclature, stoichiometry, gas laws, thermochemistry, quantum mechanics, chemical bonding, and molecular orbital theory.',
    prerequisites: ['MATH 370'],
    termsOffered: ['Fall', 'Spring'],
    minGrade: 'C'
  },

  // --- General Ed & IGETC Transfer Breadth ---
  {
    code: 'ENGWR 300',
    title: 'College Composition',
    units: 3,
    department: 'IGETC',
    description: 'Critical reading, expository writing, rhetoric, synthesis of academic texts, and documented analytical research essays.',
    prerequisites: [],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'ENGWR 302',
    title: 'Advanced Composition & Critical Thinking',
    units: 3,
    department: 'IGETC',
    description: 'Formal logic, deductive reasoning, inductive argument evaluation, fallacies, and rhetorical research analysis.',
    prerequisites: ['ENGWR 300'],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'COMM 301',
    title: 'Introduction to Public Speaking',
    units: 3,
    department: 'IGETC',
    description: 'Oral communication theory, informative and persuasive speech presentation, audience analysis, and speech organization.',
    prerequisites: [],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'POLS 301',
    title: 'Introduction to Government: United States',
    units: 3,
    department: 'IGETC',
    description: 'Constitutional basis of federal government, civil liberties, civil rights, federalism, congress, the presidency, and political participation.',
    prerequisites: [],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'HIST 310',
    title: 'History of the United States (To 1877)',
    units: 3,
    department: 'IGETC',
    description: 'Social, political, and economic development of the American people from early colonial settlement through Reconstruction.',
    prerequisites: [],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  },
  {
    code: 'PSYC 300',
    title: 'General Principles of Psychology',
    units: 3,
    department: 'IGETC',
    description: 'Scientific study of behavior, nervous system functioning, sensory perception, cognitive development, conditioning, and personality theory.',
    prerequisites: [],
    termsOffered: ['Fall', 'Spring', 'Summer'],
    minGrade: 'C'
  }
];

export const COURSE_MAP = new Map<string, Course>(
  CRC_COURSES.map(c => [c.code, c])
);
