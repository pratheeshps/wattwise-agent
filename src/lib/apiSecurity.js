import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from './prisma.js';

export const API_RATE_LIMITS = Object.freeze({
  'bill-list': { limit: 60, windowSeconds: 60 },
  'bill-upload': { limit: 5, windowSeconds: 60 },
  'bill-preview': { limit: 10, windowSeconds: 60 },
  'bill-delete': { limit: 20, windowSeconds: 60 },
  'bill-download': { limit: 60, windowSeconds: 60 },
  analysis: { limit: 5, windowSeconds: 60 },
});

function getClientAddress(request) {
  const direct = request.headers.get('x-real-ip')?.trim();
  if (direct) return direct;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}

export function isTrustedRequestOrigin(request) {
  const origin = request.headers.get('origin');
  // Requests without Origin are non-browser/server-to-server requests. Browser
  // state-changing requests include Origin and are checked against exact origins.
  if (!origin) return true;

  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return false;
  }

  const configured = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || '').split(','),
  ].filter(Boolean);

  return configured.some((value) => {
    try {
      return new URL(value.trim()).origin === normalizedOrigin;
    } catch {
      return false;
    }
  });
}

export function rejectUntrustedOrigin(request) {
  if (isTrustedRequestOrigin(request)) return null;
  return NextResponse.json({ error: 'Untrusted request origin.' }, { status: 403 });
}

export async function enforceApiRateLimit(request, userId, scope) {
  const policy = API_RATE_LIMITS[scope];
  if (!policy) throw new Error(`Unknown API rate-limit scope: ${scope}`);

  const subject = createHash('sha256')
    .update(`${userId}:${getClientAddress(request)}`)
    .digest('hex');
  const key = `api:${scope}:${subject}`;

  try {
    const rows = await prisma.$queryRaw`
      INSERT INTO "ApiRateLimit" ("key", "count", "windowStartedAt", "expiresAt")
      VALUES (
        ${key},
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + (${policy.windowSeconds} * INTERVAL '1 second')
      )
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "ApiRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE "ApiRateLimit"."count" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "ApiRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
          ELSE "ApiRateLimit"."windowStartedAt"
        END,
        "expiresAt" = CASE
          WHEN "ApiRateLimit"."expiresAt" <= CURRENT_TIMESTAMP
            THEN CURRENT_TIMESTAMP + (${policy.windowSeconds} * INTERVAL '1 second')
          ELSE "ApiRateLimit"."expiresAt"
        END
      RETURNING
        "count",
        GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("ApiRateLimit"."expiresAt" - CURRENT_TIMESTAMP))))::INTEGER AS "retryAfter"
    `;

    const row = rows[0];
    if (row.count <= policy.limit) return null;

    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(row.retryAfter),
          'X-RateLimit-Limit': String(policy.limit),
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('API rate-limit storage unavailable', error);
    return NextResponse.json(
      { error: 'Security controls are temporarily unavailable. Please retry shortly.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export function rejectOversizedRequest(request, maxBytes = 10 * 1024 * 1024 + 128 * 1024) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  }
  return null;
}
