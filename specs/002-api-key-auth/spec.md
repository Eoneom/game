# Feature Specification: Player session authentication (brownfield partial)

**Feature Branch**: `002-api-key-auth`

**Created**: 2026-10-17

**Status**: Partial — behaviors below are evidenced in `Eoneom/game` at `main` (`180d959`). Gaps and naming mismatches are tracked in `docs/spec-kit/slice-2-open-questions.md`.

**Input**: Spec Kit slice 2 inventory (“Auth / API key”); codebase survey slice 1 (“Player session authentication”).

**Not evidenced in repository (out of scope for this partial spec)**: `requireApiKey`, service/API-key headers, `constitution.md`, `.specify/` templates, `GET /api/v1/health` (slice 1 not present on `main` at time of survey).

## User Scenarios & Testing

### User Story 1 — Log in with player name (Priority: P1)

A human player who already exists in the game enters their **player name** and receives a session token used for subsequent API and WebSocket access.

**Independent test**: `POST /player/login` with `player_name` returns `status: ok` and `data.token`; `apps/server/src/app/command/auth/login.spec.ts` and `apps/server/src/web/handler/player/login.spec.ts`.

**Acceptance scenarios**:

1. **Given** a non–system-controlled player exists, **When** the client posts `{ "player_name": "<name>" }` to `/player/login`, **Then** the server responds HTTP 200 with `{ "status": "ok", "data": { "token": "<uuid>" } }` and persists a new row in `auth` linked to that player.
2. **Given** `player_name` is omitted, **When** login is attempted, **Then** the server responds HTTP 400 with `{ "status": "nok", "error_code": "player_name:not-found" }`.
3. **Given** the player is `system_controlled`, **When** login is attempted, **Then** the command rejects with `player:system-controlled` (surfaced via error middleware as HTTP 200 + `status: nok` unless otherwise clarified).

### User Story 2 — Call protected HTTP routes with session token (Priority: P1)

An authenticated client calls game HTTP routes; the server resolves the token to `player_id` before running handlers.

**Independent test**: Routes in `apps/server/src/web/router.ts` use `authMiddleware` except `/`, `/player/login`, `/player/signup`, `/player/logout`; handlers read `player_id` via `getPlayerIdFromContext`.

**Acceptance scenarios**:

1. **Given** a valid token in the `Authorization` request header, **When** a protected route is called, **Then** `authorizeAuth` runs, `last_action_at` is updated, and `res.locals.player_id` is set for the handler.
2. **Given** the `Authorization` header is absent, **When** a protected route is called, **Then** the server responds HTTP **401** with `{ "status": "nok", "error_code": "token:not-found" }` (`apps/server/src/web/middleware/auth.ts`).
3. **Given** the token is unknown, **When** a protected route is called, **Then** `authorizeAuth` fails with `auth:not-found` and the global error middleware returns HTTP **200** with `{ "status": "nok", "error_code": "auth:not-found" }` (`apps/server/src/web/middleware/error.ts`).

### User Story 3 — Log out (Priority: P2)

A client ends a session by deleting the server-side auth record.

**Independent test**: `apps/server/src/app/command/auth/logout.spec.ts`, `apps/server/src/web/handler/player/logout.spec.ts`.

**Acceptance scenarios**:

1. **Given** a valid `Authorization` header value matching a stored token, **When** `POST /player/logout` succeeds, **Then** the server responds HTTP 200 `{ "status": "ok" }` and deletes the `auth` row.
2. **Given** the token is not found, **When** logout runs, **Then** the command completes without error (no delete).

### User Story 4 — Real-time connection gated by token (Priority: P2)

The web client opens a WebSocket on the same port as HTTP and passes the session token as a query parameter.

**Independent test**: `apps/server/src/web/ws.spec.ts`, `apps/web/src/helpers/websocket.ts`.

**Acceptance scenarios**:

1. **Given** `?token=` is missing on the WebSocket URL, **When** the connection is accepted, **Then** the server closes with code `4001` and reason `token:not-found`.
2. **Given** `authorizeAuth` fails, **When** connection is attempted, **Then** the server closes with code `4001` and reason `unauthorized` (string literal, not a `RequestError` enum value).
3. **Given** authorization succeeds, **When** domain events fire for that `player_id`, **Then** JSON messages are sent on the open socket (`apps/server/src/web/ws.ts`).

### User Story 5 — Web client session persistence (Priority: P2)

The SPA stores the token in `localStorage`, attaches it to API calls, and reconnects WebSocket listeners on reload when a token is present.

**Independent test**: `apps/web/src/modules/auth/context.tsx`, `apps/web/src/modules/auth/hooks.ts`.

**Acceptance scenarios**:

1. **Given** login succeeds, **When** `startSession` runs, **Then** the token is saved under key `token`, module WS listeners register, and `wsClient.connect(token)` runs.
2. **Given** API responses imply `auth:not-found` or `token:not_found` (client set), **When** a query fails, **Then** the client clears the token, disconnects WS, and clears React Query cache (`useClearInvalidSession`).

### Edge Cases (evidenced or explicitly ambiguous)

- Login creates a **new** `auth` row each time; no code evicts prior tokens for the same player.
- `Authorization` header value is passed **verbatim** to `repository.auth.get({ token })`; there is no `Bearer ` stripping in middleware (logout handler tests use `Bearer token123` as the full stored value).
- `POST /player/logout` uses `assert(token)` when the header is missing (throws, not a structured 401).
- Web client `AUTH_ERROR_CODES` includes `token:not_found` (underscore) while the API enum is `token:not-found` (hyphen).

## Requirements

### Functional Requirements (evidenced)

- **FR-001**: The system MUST issue opaque session tokens as UUID strings (`generateToken()` in `apps/server/src/shared/identification.ts`).
- **FR-002**: The system MUST persist sessions in Postgres table `auth` with `player_id`, `token`, and `last_action_at` (`apps/server/src/adapter/database/migrations/00001_initial.ts`, `PostgresAuthRepository`).
- **FR-003**: The system MUST expose unauthenticated HTTP endpoints `POST /player/login`, `POST /player/signup`, and `POST /player/logout` at the Express root (no `/api/v1` prefix in `apps/server/src/web/http.ts`).
- **FR-004**: The system MUST protect all other HTTP routes listed in `apps/server/src/web/router.ts` with `authMiddleware`.
- **FR-005**: The system MUST map a valid session token to `player_id` via `authorizeAuth` and expose it to handlers as `res.locals.player_id`.
- **FR-006**: The system MUST update `last_action_at` on each successful `authorizeAuth` invocation.
- **FR-007**: The system MUST reject login for system-controlled players with `player:system-controlled`.
- **FR-008**: The API client MUST send the session token on HTTP requests in the `Authorization` header when provided (`packages/api-client/src/fetcher.ts`).
- **FR-009**: Typed request validation errors for missing login fields MUST use `RequestError` codes (`packages/api-client/src/error/request.ts`).

### Functional Requirements (not evidenced — do not implement from this spec)

- **FR-010**: [NEEDS CLARIFICATION] Service **API key** validation (`requireApiKey`, `X-Api-Key`, env-based keys, etc.) — **no symbols or middleware found on `main`.**

### Key Entities

- **Auth session (`auth` table / `AuthEntity`)**: Links one `player_id` to one `token` and `last_action_at`; created on login, deleted on logout, looked up on each authorize.
- **Player**: Identified by `player_id` after authorization; login looks up by `name`.

## Success Criteria

Partial brownfield spec — measurable outcomes pending product clarification (see open questions).

- **SC-001**: [NEEDS CLARIFICATION] Consistent HTTP status and `error_code` for invalid/expired sessions on REST vs WebSocket.
- **SC-002**: [NEEDS CLARIFICATION] Whether “API key” in slice naming is distinct from player session tokens.

## Assumptions (documentation only)

- Brownfield capture reflects `main` at commit `180d959`; no `constitution.md` exists in the repository.
- Signup and player bootstrap are specified separately (store slice inventory §2); signup does not return a token in the HTTP response—web client logs in immediately after signup (`apps/web/src/modules/auth/hooks.ts`).

## Evidence index (primary paths)

| Area | Paths |
| --- | --- |
| Domain | `apps/server/src/core/auth/{entity,error}.ts` |
| Commands | `apps/server/src/app/command/auth/{login,logout,authorize}.ts` |
| HTTP gate | `apps/server/src/web/middleware/auth.ts`, `apps/server/src/web/router.ts` |
| Handlers | `apps/server/src/web/handler/player/{login,logout}.ts` |
| WebSocket gate | `apps/server/src/web/ws.ts` |
| Persistence | `apps/server/src/adapter/database/repository/auth.ts` |
| Client contract | `packages/api-client/src/{fetcher,error/request,endpoints/player/*}.ts` |
| Web UI | `apps/web/src/modules/auth/{context,hooks}.tsx`, `apps/web/src/helpers/websocket.ts` |
