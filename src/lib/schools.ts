import { useEffect, useState } from 'react';

export interface SchoolOutcomes {
  unitId: number; name: string; city: string; url: string | null; students: number | null;
  admissionRate: number | null; netPrice: number | null; inStateTuition: number | null; gradRate: number | null;
  medianDebt: number | null; medianEarnings10yr: number | null; pellShare: number | null;
}

export interface SchoolsPayload {
  source: string;
  fetchedAt: number | null;
  stale: boolean;
  schools: Record<string, SchoolOutcomes | null>;
}

let memo: Promise<SchoolsPayload | null> | null = null;

function load(): Promise<SchoolsPayload | null> {
  memo ??= fetch('/api/schools')
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(d => { if (!d) memo = null; return d; }); // allow a retry later if it failed
  return memo;
}

/** Live College Scorecard outcomes (cached server-side for 24h). null while loading or unavailable. */
export function useSchools(): SchoolsPayload | null {
  const [data, setData] = useState<SchoolsPayload | null>(null);
  useEffect(() => { let on = true; load().then(d => { if (on) setData(d); }); return () => { on = false; }; }, []);
  return data;
}

export const fmtUSD = (v: number | null | undefined) =>
  v == null ? '—' : `$${Math.round(v).toLocaleString('en-US')}`;
export const fmtPct = (v: number | null | undefined) =>
  v == null ? '—' : `${Math.round(v * 100)}%`;
export const fmtK = (v: number | null | undefined) =>
  v == null ? '—' : v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`;
