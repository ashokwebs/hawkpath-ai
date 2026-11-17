import { StudentProfile } from '../types';
import { Scenario } from '../utils/scenario';
import { supabase } from './supabase';

const LOCAL_KEY = 'hawkpath.myplan.v1';

export interface SavedPlan { profile: StudentProfile; scenario: Scenario }

function readLocal(): SavedPlan | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeLocal(p: SavedPlan) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(p)); } catch { /* private mode: ignore */ }
}

/** Signed in → Supabase (RLS-protected row). Guest → this browser only. */
export async function loadPlan(userId: string | null): Promise<SavedPlan | null> {
  if (supabase && userId) {
    const { data, error } = await supabase.from('plans').select('profile, scenario').eq('user_id', userId).maybeSingle();
    if (!error && data) return { profile: data.profile as StudentProfile, scenario: (data.scenario ?? {}) as Scenario };
    if (error) console.warn('[plans] load failed, using local copy', error.message);
  }
  return readLocal();
}

export async function savePlan(userId: string | null, plan: SavedPlan): Promise<'cloud' | 'local'> {
  writeLocal(plan);
  if (supabase && userId) {
    const { error } = await supabase.from('plans').upsert({
      user_id: userId, profile: plan.profile, scenario: plan.scenario, updated_at: new Date().toISOString(),
    });
    if (!error) return 'cloud';
    console.warn('[plans] cloud save failed', error.message);
  }
  return 'local';
}
