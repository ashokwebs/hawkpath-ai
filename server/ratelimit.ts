/**
 * In-memory token-bucket rate limiter + global daily budget.
 * Per-instance (fine for a single dev server / warm serverless instance);
 * swap the Map for Upstash Redis to share limits across instances.
 */
type Kind = 'advisor' | 'transcript';
type Tier = 'guest' | 'member';

const LIMITS: Record<Kind, Record<Tier, { burst: number; perMin: number }>> = {
  advisor: { guest: { burst: 5, perMin: 5 }, member: { burst: 10, perMin: 15 } },
  transcript: { guest: { burst: 2, perMin: 2 }, member: { burst: 4, perMin: 4 } },
};

const buckets = new Map<string, { tokens: number; ts: number }>();
let dailyCount = 0;
let dailyResetAt = Date.now() + 86_400_000;

export function takeToken(key: string, kind: Kind, tier: Tier = 'guest'): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const budget = Number(process.env.DAILY_REQUEST_BUDGET || 500);
  if (now > dailyResetAt) { dailyCount = 0; dailyResetAt = now + 86_400_000; }
  if (dailyCount >= budget) return { ok: false, retryAfter: Math.ceil((dailyResetAt - now) / 1000) };

  const { burst, perMin } = LIMITS[kind][tier];
  const refill = perMin / 60;
  const id = `${kind}:${tier}:${key}`;
  const b = buckets.get(id) ?? { tokens: burst, ts: now };
  b.tokens = Math.min(burst, b.tokens + ((now - b.ts) / 1000) * refill);
  b.ts = now;
  if (b.tokens < 1) {
    buckets.set(id, b);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((1 - b.tokens) / refill)) };
  }
  b.tokens -= 1;
  if (buckets.size > 10_000) buckets.clear(); // memory guard against key-spraying
  buckets.set(id, b);
  dailyCount++;
  return { ok: true, retryAfter: 0 };
}
