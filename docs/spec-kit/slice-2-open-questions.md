# Slice 2 — Auth / API key — open questions for product owner

**Surveyed**: `Eoneom/game` `main` @ `180d959` (2026-10-17)  
**Partial spec**: [`specs/002-api-key-auth/spec.md`](../../specs/002-api-key-auth/spec.md)

Answer these before finalizing the spec or implementing `requireApiKey`-style behavior.

## Naming and scope

| ID | Question |
| --- | --- |
| Q1 | Slice title references **API key** and `requireApiKey`, but `main` only implements **player session tokens** (UUID in `auth` table). Is slice 2 strictly session auth, or must we add a separate service API key layer? |
| Q2 | Should the feature directory remain `002-api-key-auth`, or be renamed to match “player session authentication” (store inventory slice 1)? |

## HTTP contract

| ID | Question |
| --- | --- |
| Q3 | **`Authorization` format**: Should clients send the raw token only, or `Bearer <token>`? Middleware uses the header value as the DB lookup key with no parsing. |
| Q4 | **Invalid/missing session on REST**: Missing header returns **401** + `token:not-found`; unknown token returns **200** + `auth:not-found` via error middleware. Should both be 401? Same body shape? |
| Q5 | **`POST /player/logout` without header**: Handler `assert(token)` throws today. Should this be 401 + `token:not-found` like `authMiddleware`? |
| Q6 | **Route prefix**: All routes mount at `/` today. Will auth endpoints move under `/api/v1/...` with health (slice 1), and should this spec wait for that consolidation? |

## Session lifecycle

| ID | Question |
| --- | --- |
| Q7 | **Multiple sessions**: Each login creates a new `auth` row without revoking older tokens. Is multi-device concurrent session intended? |
| Q8 | **Expiry / idle timeout**: `last_action_at` is updated on authorize but never enforced. Should sessions expire? |
| Q9 | **Credentials**: Login is **player name only** (no password). Is that the long-term security model for humans? |

## WebSocket

| ID | Question |
| --- | --- |
| Q10 | Failed WS auth closes with reason string `unauthorized` instead of typed `auth:not-found`. Should WS use the same `error_code` vocabulary as HTTP? |
| Q11 | Should WS accept the token only via query string, or also support headers (future reverse-proxy setups)? |

## Web client

| ID | Question |
| --- | --- |
| Q12 | `useClearInvalidSession` watches `token:not_found` (underscore) but the API exposes `token:not-found` (hyphen). Which is canonical for session invalidation? |

## Service API key (if Q1 = yes)

| ID | Question |
| --- | --- |
| Q13 | Which routes require an API key vs a player session (health, admin, bots, CI)? |
| Q14 | Header name, key rotation, and storage (env, DB, per-deploy secret)? |
| Q15 | Failure mode: HTTP status, `error_code` values, and interaction with CORS/public health endpoints. |

## Spec Kit process

| ID | Question |
| --- | --- |
| Q16 | No `constitution.md` or `.specify/` directory on `main`. Should bootstrap from GitHub Spec Kit land before specs are marked “final”? |
