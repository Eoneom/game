# Slice 002 — Human player: session, signup, and bootstrap

**Status**: As implemented on `main` (brownfield). Merges former slices **002** (session auth) and **003** (signup/bootstrap).

**Related**: [`001`](../001-health-api/spec.md) health routing. Playable factions: [`004`](../004-faction-domain/spec.md).

## Session authentication

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

## Registration and bootstrap

`POST /player/signup` creates a new human player, their first city on the world grid, and initial buildings, technologies, troops, resource stock, and exploration visibility. The HTTP response returns `player_id` and `city_id` only—**no session token**. The web client calls `POST /player/login` immediately after signup (`useSignup` in `apps/web/src/modules/auth/hooks.ts`).

Signup delegates to `signupAuth` → `bootstrapPlayer` (`apps/server/src/app/command/auth/signup.ts`, `apps/server/src/app/command/player/bootstrap.ts`).

### Signup HTTP contract

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `POST` | `/player/signup` | None | `signupHandler` (`apps/server/src/web/handler/player/signup.ts`) |

**Request** (JSON):

```json
{
  "player_name": "<string>",
  "city_name": "<string>",
  "faction_code": "<FactionCode>"
}
```

Types: `packages/api-client/src/endpoints/player/signup.ts` (`FactionCode` from `apps/server/src/core/faction/constant/code.ts`).

**Success** — HTTP `200`:

```json
{
  "status": "ok",
  "data": {
    "player_id": "<uuid>",
    "city_id": "<uuid>"
  }
}
```

**Validation errors** (handler, HTTP `400`):

| Missing field | `error_code` |
| --- | --- |
| `player_name` | `player_name:not-found` |
| `city_name` | `city_name:not-found` |
| `faction_code` | `faction_code:not-found` |

**Domain errors** (command throws; error middleware HTTP `200`, `status: nok`, `error_code` = thrown message):

| Condition | `error_code` |
| --- | --- |
| Player name taken | `player:already-exists` |
| City name taken | `city:already-exists` |
| Unknown faction | `faction:not-found` |
| Non-playable faction | `faction:not-playable` |

Faction rules: `FactionService.assertPlayable` in `signupAuth` (see [`004`](../004-faction-domain/spec.md)).

Tests: `apps/server/src/web/handler/player/signup.spec.ts`, `apps/server/src/app/command/auth/signup.spec.ts`.

### Command flow (`signupAuth`)

1. `FactionService.assertPlayable(faction_code)`.
2. `bootstrapPlayer({ player_name, city_name, faction_code, system_controlled: false })`.

### Bootstrap (`bootstrapPlayer`)

Orchestration in `apps/server/src/app/command/player/bootstrap.ts`:

| Step | Behavior |
| --- | --- |
| Uniqueness | `repository.player.exist(player_name)`, `repository.city.exist(city_name)` |
| World placement | `AppService.selectCityFirstCell()`; `AppService.getCellsAround({ coordinates })` |
| Player | `PlayerService.init` with `system_controlled: false` |
| City | `CityService.settle` on first cell |
| Buildings | `BuildingService.init` — one row per `BuildingCode`; mushroom farm, recycling plant, and solar panel at **level 1**, others at **0** |
| Technologies | `TechnologyService.init` — one row per `TechnologyCode` for `player_id` |
| Resources | Load stock for city cell; `ResourcesService.firstCityCanonicalResourceStockState` then `updateOne` (`STARTING_PLASTIC` 3000, `STARTING_MUSHROOM` 2000 in `apps/server/src/core/city/constant/index.ts`) |
| Troops | `TroopService.init` — zero-count stacks per faction troop codes on city cell |
| Exploration | `ExplorationEntity.init` for city cell + surrounding cells |
| Persist | `player.create`, `city.create`, parallel creates for buildings, technologies, stock, troops, exploration |

Returns `{ player_id, city_id }` from created entities.

`bootstrapPlayer` is also used for non-signup flows (e.g. system players) with `system_controlled: true`; signup always passes `false`.

### Signup web UI

| Path | Role |
| --- | --- |
| `apps/web/src/modules/auth/signup-form.tsx` | Form: player name, city name, faction radio from `playableFactionCodes()` |
| `apps/web/src/modules/auth/hooks.ts` | `useSignup`: signup → login → `startSession` |
| `apps/web/src/modules/auth/signup-form.test.tsx` | Component tests |

Client-side validation uses French toast messages before submit; server enforces typed `RequestError` codes above.

### Signup evidence

| Area | Paths |
| --- | --- |
| Commands | `apps/server/src/app/command/auth/signup.ts`, `apps/server/src/app/command/player/bootstrap.ts` |
| HTTP | `apps/server/src/web/handler/player/signup.ts` |
| API types | `packages/api-client/src/endpoints/player/signup.ts` |
| Web | `apps/web/src/modules/auth/{signup-form,hooks}.tsx` |
