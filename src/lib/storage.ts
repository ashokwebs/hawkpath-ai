import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { StudentProfile } from '../types';
import { Scenario } from '../utils/scenario';
import { db } from './firebase';

const LOCAL_KEY = 'hawkpath.myplan.v1';
const COLLECTION = 'hawkpath_plans'; // namespaced: never touches other apps' data in the same project

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

/** Firestore rejects `undefined`; JSON round-trip strips it and any non-plain values. */
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Signed in → Firestore (security rules: owner only). Guest → this browser only. */
export async function loadPlan(userId: string | null): Promise<SavedPlan | null> {
  if (db && userId) {
    try {
      const snap = await getDoc(doc(db, COLLECTION, userId));
      if (snap.exists()) {
        const d = snap.data();
        return { profile: d.profile as StudentProfile, scenario: (d.scenario ?? {}) as Scenario };
      }
    } catch (e) {
      console.warn('[plans] cloud load failed, using local copy:', (e as { code?: string })?.code ?? e);
    }
  }
  return readLocal();
}

export async function savePlan(userId: string | null, plan: SavedPlan): Promise<'cloud' | 'local'> {
  writeLocal(plan);
  if (db && userId) {
    try {
      await setDoc(doc(db, COLLECTION, userId), { profile: plain(plan.profile), scenario: plain(plan.scenario), updatedAt: serverTimestamp() });
      return 'cloud';
    } catch (e) {
      console.warn('[plans] cloud save failed, kept local copy:', (e as { code?: string })?.code ?? e);
    }
  }
  return 'local';
}
