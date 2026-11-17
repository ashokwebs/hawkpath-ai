/**
 * U.S. Department of Education College Scorecard API (api.data.gov).
 * Real outcome data for each transfer target: net price, graduation rate,
 * median debt, earnings, Pell share. Cached for 24h per instance; serves the
 * last good copy if the API is down, and never blocks the planner.
 */
import { ARTICULATION_TARGETS } from '../src/data/articulationAgreements';

const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';
const TTL_MS = 24 * 3600_000;

/** IPEDS unit ids for our schools (verified against the API). */
export const UNIT_IDS: Record<string, number> = {
  'uc-davis-cs': 110644,
  'uc-davis-ds': 110644,
  'uc-berkeley-eecs': 110635,
  'csus-cs': 110617,
  'sjsu-se': 122755,
  crc: 113096,
};

const FIELDS: Record<string, string> = {
  id: 'id',
  name: 'school.name',
  city: 'school.city',
  url: 'school.school_url',
  students: 'latest.student.size',
  admissionRate: 'latest.admissions.admission_rate.overall',
  netPrice: 'latest.cost.avg_net_price.public',
  inStateTuition: 'latest.cost.tuition.in_state',
  gradRate: 'latest.completion.completion_rate_4yr_150nt',
  medianDebt: 'latest.aid.median_debt.completers.overall',
  medianEarnings10yr: 'latest.earnings.10_yrs_after_entry.median',
  pellShare: 'latest.aid.pell_grant_rate',
};

export interface SchoolOutcomes {
  unitId: number; name: string; city: string; url: string | null; students: number | null;
  admissionRate: number | null; netPrice: number | null; inStateTuition: number | null; gradRate: number | null;
  medianDebt: number | null; medianEarnings10yr: number | null; pellShare: number | null;
}

let cache: { at: number; data: Record<number, SchoolOutcomes> } | null = null;
let inflight: Promise<Record<number, SchoolOutcomes>> | null = null;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function fetchAll(): Promise<Record<number, SchoolOutcomes>> {
  const ids = [...new Set(Object.values(UNIT_IDS))];
  const url = new URL(BASE);
  url.searchParams.set('api_key', process.env.SCORECARD_API_KEY || 'DEMO_KEY');
  url.searchParams.set('id', ids.join(','));
  url.searchParams.set('fields', Object.values(FIELDS).join(','));
  url.searchParams.set('per_page', String(ids.length));
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Scorecard HTTP ${res.status}`);
  const body = await res.json() as { results?: Record<string, unknown>[] };
  const out: Record<number, SchoolOutcomes> = {};
  for (const r of body.results ?? []) {
    const id = Number(r[FIELDS.id]);
    if (!ids.includes(id)) continue; // only accept the schools we asked for
    out[id] = {
      unitId: id,
      name: String(r[FIELDS.name] ?? '').slice(0, 120),
      city: String(r[FIELDS.city] ?? '').slice(0, 60),
      url: typeof r[FIELDS.url] === 'string' ? String(r[FIELDS.url]).slice(0, 120) : null,
      students: num(r[FIELDS.students]),
      admissionRate: num(r[FIELDS.admissionRate]),
      netPrice: num(r[FIELDS.netPrice]),
      inStateTuition: num(r[FIELDS.inStateTuition]),
      gradRate: num(r[FIELDS.gradRate]),
      medianDebt: num(r[FIELDS.medianDebt]),
      medianEarnings10yr: num(r[FIELDS.medianEarnings10yr]),
      pellShare: num(r[FIELDS.pellShare]),
    };
  }
  if (!Object.keys(out).length) throw new Error('Scorecard returned no rows');
  return out;
}

/** Cached, de-duplicated fetch. Returns stale data (or null) instead of throwing. */
export async function getOutcomes(): Promise<{ data: Record<number, SchoolOutcomes> | null; fetchedAt: number | null; stale: boolean }> {
  if (cache && Date.now() - cache.at < TTL_MS) return { data: cache.data, fetchedAt: cache.at, stale: false };
  try {
    inflight ??= fetchAll().finally(() => { inflight = null; });
    const data = await inflight;
    cache = { at: Date.now(), data };
    return { data, fetchedAt: cache.at, stale: false };
  } catch (e) {
    console.warn('[scorecard]', e instanceof Error ? e.message : e);
    return { data: cache?.data ?? null, fetchedAt: cache?.at ?? null, stale: Boolean(cache) };
  }
}

export async function outcomesForTarget(targetId: string): Promise<SchoolOutcomes | null> {
  const { data } = await getOutcomes();
  const id = UNIT_IDS[targetId];
  return (data && id && data[id]) || null;
}

/** Route handler: GET /api/schools → outcomes keyed by target id (+ CRC). */
export async function handleSchools() {
  const { data, fetchedAt, stale } = await getOutcomes();
  if (!data) return { status: 503, body: { error: 'School outcome data is temporarily unavailable.' } };
  const byTarget: Record<string, SchoolOutcomes | null> = {};
  for (const t of ARTICULATION_TARGETS) byTarget[t.id] = data[UNIT_IDS[t.id]] ?? null;
  byTarget.crc = data[UNIT_IDS.crc] ?? null;
  return {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=3600' },
    body: { source: 'U.S. Department of Education College Scorecard', fetchedAt, stale, schools: byTarget },
  };
}

/** Compact, model-friendly summary (rounded, labelled). */
export function describeOutcomes(o: SchoolOutcomes | null) {
  if (!o) return null;
  const pct = (v: number | null) => (v == null ? 'n/a' : `${Math.round(v * 100)}%`);
  const usd = (v: number | null) => (v == null ? 'n/a' : `$${Math.round(v).toLocaleString('en-US')}`);
  return {
    school: o.name,
    avgNetPricePerYear: usd(o.netPrice),
    graduationRateWithin6Years: pct(o.gradRate),
    medianDebtAtGraduation: usd(o.medianDebt),
    medianEarnings10YearsAfterEntry: usd(o.medianEarnings10yr),
    pellGrantStudentShare: pct(o.pellShare),
    overallAdmissionRateAllApplicants: pct(o.admissionRate),
    source: 'U.S. Dept. of Education College Scorecard (live)',
  };
}
