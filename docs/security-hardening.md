# Sprint 7.4 — Security hardening

## Rate limiting

Wattwise uses two persistent PostgreSQL rate-limit stores:

- Better Auth's `RateLimit` table protects auth endpoints. Sign-in is limited to 5 attempts/minute per client IP, sign-up to 3/minute, and password recovery/change endpoints have dedicated limits. The global auth limit is 100 requests/minute.
- `ApiRateLimit` uses an atomic PostgreSQL upsert, so counters are shared across application instances. Limits use independent SHA-256-hashed buckets for the authenticated user and client address, so rotating addresses does not bypass a user's quota and multiple users behind one address still share an IP quota. Raw IP addresses are not stored.

| API scope | Limit |
| --- | ---: |
| Bill list | 60/minute |
| Bill upload | 5/minute |
| PDF preview | 10/minute |
| Bill deletion | 20/minute |
| Bill download | 60/minute |
| AI analysis | 5/minute |

When the rate-limit database is unavailable, protected API requests fail closed with HTTP 503. Rate-limited requests return HTTP 429 and a `Retry-After` header.

## Reverse proxy / client IP

The limiter reads `x-real-ip` first, then the first address in `x-forwarded-for`. In production, configure the hosting platform or reverse proxy to overwrite these headers and prevent direct untrusted access to the origin. Do not trust client-supplied forwarding headers on a directly exposed Node server.

## Request origins

State-changing browser API requests are checked against the exact origins in `BETTER_AUTH_TRUSTED_ORIGINS`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL`. Server-to-server requests without an `Origin` header are allowed; use authentication and secret-based authorization for those integrations.

## Session and response hardening

- Session lifetime: 7 days; refresh age: 24 hours; fresh-session age: 1 hour.
- Session cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Production responses include HSTS. All responses include anti-sniffing, anti-framing, referrer, permissions, and cross-origin opener headers.
- Upload endpoints reject oversized declared request bodies before parsing multipart form data and continue to validate the PDF structure and 10 MB file limit.

## Operational checks

1. Apply migrations with `npm run db:migrate:deploy`.
2. Regenerate Prisma with `npm run db:generate`.
3. Run `npm test`, `npm run format:check`, `npm run build`, and `npm run test:integration`.
4. Confirm that the production proxy overwrites `x-real-ip` or `x-forwarded-for`.
5. Confirm production uses HTTPS and exact trusted origins; never use wildcard origins.
6. Monitor HTTP 429/503 responses and PostgreSQL rate-limit table growth. Expired rows can be removed periodically with a maintenance task.
