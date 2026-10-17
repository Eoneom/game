# Slice 001 — Health API

## Summary

Expose a single public health check for load balancers and operators. Slice 1 covers HTTP routing and middleware wiring only (no database, auth, or domain logic).

## Requirements

### Canonical endpoint

| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | None (public) | `200` with body `{ "status": "ok" }` |

- Content-Type: `application/json` (via `res.json`).
- No API key or session token required.
- No additional fields in the response body for slice 1.

### Legacy aliases (redirect)

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/health` | `308 Permanent Redirect` to `/api/v1/health` |
| `GET` | `/` | `308 Permanent Redirect` to `/api/v1/health` (replaces informal root health response) |

Clients should follow redirects or call the canonical URL directly.

## Decisions (resolved 2026-10-17)

| ID | Question | Decision |
| --- | --- | --- |
| Q1 | Is `GET /health` public? | Yes — no API key |
| Q2 | Is `GET /api/v1/health` public? | Yes — no API key |
| Q3 | One or two health URLs long-term? | **One canonical:** `/api/v1/health`. Other paths redirect with `308`. |
| Q4 | Response body shape? | `{ "status": "ok" }` only |
| Q5 | Slice 1 scope? | Routes + router/middleware wiring only |

## Rationale

- Versioned path `/api/v1/health` matches the intended public HTTP API surface; game routes remain at legacy root paths until a later slice migrates them.
- `308` preserves method on redirect (safe for probes that might upgrade to non-GET later).
- Public access allows orchestration health checks without credentials.

## Out of scope (later slices)

- API key middleware (`requireApiKey`) on protected routes
- Readiness vs liveness (DB, job queue, dependencies)
- OpenAPI / client SDK types for health

## Acceptance

- `GET /api/v1/health` returns `200` and `{ "status": "ok" }` without `Authorization` header.
- `GET /health` and `GET /` return `308` with `Location: /api/v1/health`.
- Server unit/integration tests cover the above.
