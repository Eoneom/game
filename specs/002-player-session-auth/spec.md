# Feature Specification: Player session authentication

**Feature Branch**: `002-player-session-auth`

**Created**: 2026-10-17

**Status**: Final — documented as implemented on `main` (brownfield capture). No separate service API key layer exists in the repository.

**Related**: Public health routing is specified in [`specs/001-health-api/spec.md`](../001-health-api/spec.md). Player signup/bootstrap is out of scope (brownfield inventory slice 2).

## Summary

Human players authenticate with **player name only** (no password). The server issues an opaque UUID **session token**, stores it in Postgres `auth`, and requires that token on protected HTTP routes (`Authorization` header, verbatim value) and on WebSocket connections (`?token=` query parameter). The web SPA persists the token in `localStorage` and attaches it to API calls.

## User Scenarios & Testing

### User Story 1 — Log in with player name (Priority: P1)

A human player who already exists enters their **player name** and receives a session token.

**Independent test**: `POST /player/login` with `player_name` returns `status: ok` and `data.token`; `apps/server/src/app/command/auth/login.spec.ts`, `apps/server/src/web/handler/player/login.spec.ts`.

**Acceptance scenarios**:

1. **Given** a non–system-controlled player exists, **When** the client posts `{ "player_name": "<name>" }` to `/player/login`, **Then** HTTP 200 with `{ "status": "ok", "data": { "token": "<uuid>" } }` and a new `auth` row for that player.
2. **Given** `player_name` is omitted, **When** login is attempted, **Then** HTTP 400 with `{ "status": "nok", "error_code": "player_name:not-found" }`.
3. **Given** the player is `system_controlled`, **When** login is attempted, **Then** rejection with `player:system-controlled` (surfaced via error middleware as HTTP 200 + `status: nok`).

### User Story 2 — Call protected HTTP routes with session token (Priority: P1)

Authenticated clients call game HTTP routes; the server resolves the token to `player_id` before handlers run.

**Independent test**: `apps/server/src/web/router.ts` — `authMiddleware` on all routes except canonical health, `/health`, `/`, and `POST /player/login`, `/player/signup`, `/player/logout`.

**Acceptance scenarios**:

1. **Given** a valid token in `Authorization`, **When** a protected route is called, **Then** `authorizeAuth` runs, `last_action_at` updates, and `res.locals.player_id` is set.
2. **Given** `Authorization` is absent, **When** a protected route is called, **Then** HTTP **401** with `{ "status": "nok", "error_code": "token:not-found" }`.
3. **Given** an unknown token, **When** a protected route is called, **Then** `auth:not-found` via error middleware → HTTP **200** with `{ "status": "nok", "error_code": "auth:not-found" }`.

### User Story 3 — Log out (Priority: P2)

The client ends a session by deleting the server-side auth row.

**Independent test**: `apps/server/src/app/command/auth/logout.spec.ts`, `apps/server/src/web/handler/player/logout.spec.ts`.

**Acceptance scenarios**:

1. **Given** `Authorization` matches a stored token, **When** `POST /player/logout` succeeds, **Then** HTTP 200 `{ "status": "ok" }` and the `auth` row is deleted.
2. **Given** the token is not found, **When** logout runs, **Then** the command completes without error (no delete).
3. **Given** `Authorization` is missing, **When** logout is called, **Then** `assert(token)` throws (no structured 401) — **as implemented**.

### User Story 4 — Real-time connection gated by token (Priority: P2)

The web client opens WebSocket on the HTTP port with the session token as a query parameter.

**Independent test**: `apps/server/src/web/ws.spec.ts`, `apps/web/src/helpers/websocket.ts`.

**Acceptance scenarios**:

1. **Given** `?token=` is missing, **When** the connection is accepted, **Then** close code `4001`, reason `token:not-found`.
2. **Given** `authorizeAuth` fails, **When** connection is attempted, **Then** close code `4001`, reason `unauthorized` (string literal).
3. **Given** authorization succeeds, **When** domain events fire for that `player_id`, **Then** JSON messages are sent (`apps/server/src/web/ws.ts`).

### User Story 5 — Web client session persistence (Priority: P2)

The SPA stores the token, attaches it to API calls, and reconnects WebSocket on reload.

**Independent test**: `apps/web/src/modules/auth/context.tsx`, `apps/web/src/modules/auth/hooks.ts`.

**Acceptance scenarios**:

1. **Given** login succeeds, **When** `startSession` runs, **Then** token saved under `localStorage` key `token`, WS listeners register, `wsClient.connect(token)` runs.
2. **Given** API responses imply `auth:not-found` or client-side `token:not_found`, **When** a query fails, **Then** client clears token, disconnects WS, clears React Query cache (`useClearInvalidSession`).

### Edge cases (documented as implemented)

- Each login creates a **new** `auth` row; prior tokens for the same player are not revoked.
- `Authorization` is the **raw token** (no `Bearer ` stripping in middleware); tests may use arbitrary header strings as the lookup key.
- `last_action_at` is updated on authorize but **not** used for expiry.
- Web client `AUTH_ERROR_CODES` includes `token:not_found` (underscore) while the API enum is `token:not-found` (hyphen); missing-header paths use the API code.

## Requirements

### Functional Requirements

- **FR-001**: Issue opaque session tokens as UUID strings (`generateToken()` in `apps/server/src/shared/identification.ts`).
- **FR-002**: Persist sessions in Postgres `auth` (`player_id`, `token`, `last_action_at`).
- **FR-003**: Expose unauthenticated `POST /player/login`, `POST /player/signup`, `POST /player/logout` at Express root (no `/api/v1` prefix on auth routes today).
- **FR-004**: Protect all other HTTP routes in `router.ts` with `authMiddleware` (health canonical path and redirects remain public).
- **FR-005**: Map valid token → `player_id` via `authorizeAuth`; expose `res.locals.player_id` to handlers.
- **FR-006**: Update `last_action_at` on each successful `authorizeAuth`.
- **FR-007**: Reject login for system-controlled players with `player:system-controlled`.
- **FR-008**: API client sends session token in `Authorization` when set (`packages/api-client/src/fetcher.ts`).
- **FR-009**: Typed validation errors use `RequestError` (`packages/api-client/src/error/request.ts`).

### Out of scope (not in repository)

- Service **API key** middleware (`requireApiKey`, `X-Api-Key`, env keys).
- Session expiry, idle timeout, or single-session enforcement.
- Password or third-party identity providers.
- Moving player auth routes under `/api/v1` (future slice).

### Key Entities

- **Auth session** (`auth` / `AuthEntity`): `player_id`, `token`, `last_action_at`; created on login, deleted on logout.
- **Player**: Resolved by `player_id` after authorization; login looks up by `name`.

## Success Criteria (as implemented)

- **SC-001**: Missing `Authorization` on REST → **401** + `token:not-found`; unknown token → **200** + `auth:not-found`.
- **SC-002**: Player session tokens are the only credential layer for human API/WS access; naming “API key” in early drafts referred to this slice incorrectly.

## Evidence index

| Area | Paths |
| --- | --- |
| Domain | `apps/server/src/core/auth/{entity,error}.ts` |
| Commands | `apps/server/src/app/command/auth/{login,logout,authorize}.ts` |
| HTTP gate | `apps/server/src/web/middleware/auth.ts`, `apps/server/src/web/router.ts` |
| Handlers | `apps/server/src/web/handler/player/{login,logout}.ts` |
| WebSocket | `apps/server/src/web/ws.ts` |
| Persistence | `apps/server/src/adapter/database/repository/auth.ts` |
| Client | `packages/api-client/src/{fetcher,error/request,endpoints/player/*}.ts` |
| Web UI | `apps/web/src/modules/auth/{context,hooks}.tsx`, `apps/web/src/helpers/websocket.ts` |
