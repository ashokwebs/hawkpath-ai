/**
 * Verifies a Firebase ID token (JWT) server-side using Google's public signing keys.
 * No service account needed. Signed-in members get a higher rate-limit tier and are
 * keyed by user id instead of IP. Identity comes only from the verified token, never
 * from the request body.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
  { cacheMaxAge: 6 * 3600_000, timeoutDuration: 5_000 },
);

const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';

export async function verifyUser(authHeader: string | undefined | null): Promise<{ userId: string } | null> {
  const m = String(authHeader ?? '').match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/);
  const pid = projectId();
  if (!m || !pid) return null;
  try {
    const { payload } = await jwtVerify(m[1], JWKS, {
      issuer: `https://securetoken.google.com/${pid}`,
      audience: pid,
      algorithms: ['RS256'],
    });
    return typeof payload.sub === 'string' && payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null; // invalid/expired token → treated as a guest
  }
}
