# Eoneom brownfield Spec Kit slices (ordered)

Survey of `Eoneom/game` at `main`. Order follows dependency: shared contracts and access control before domain features; server domain before web-only surfaces where split.

## Spec Kit features on `main`

| # | Directory | Topic |
| --- | --- | --- |
| 001 | `specs/001-health-api/` | Public `GET /api/v1/health`, legacy redirects |
| 002 | `specs/002-player-session-auth/` | Player session token (HTTP + WebSocket) |
| 003 | `specs/003-player-registration-signup/` | Player signup and first-city bootstrap |
| 004 | `specs/004-faction-domain/` | Faction codes, playable vs known, shared vocabulary |

## Brownfield inventory (next specs, dependency order)

### 1. Player session authentication

- **Scope**: `packages/api-client` (`response.ts`, `fetcher.ts`, `error/request.ts`, `endpoints/player/login.ts`, `endpoints/player/logout.ts`); `apps/server/src/core/auth/`, `app/command/auth/{login,logout,authorize}.ts`, `web/middleware/auth.ts`, `web/handler/player/{login,logout}.ts`, `web/ws.ts` (token gate only); `apps/web/src/modules/auth/{context,hooks,login-form,unauthenticated}.tsx`, `helpers/api.ts`, `helpers/websocket.ts` (connect/disconnect with token).
- **Spec**: `specs/002-player-session-auth/spec.md` (final, as implemented).
- **Why coherent**: Single cross-cutting concern—how a **Player** obtains a session token, sends it on HTTP and WebSocket, and how the server resolves `player_id`. Signup is specified in slice 003.

### 2. Player registration (signup) and bootstrap

- **Scope**: `app/command/auth/signup.ts`, `app/command/player/bootstrap.ts`, `web/handler/player/signup.ts`, `core/player/`, `apps/web` signup form and `useSignup`; touches city/building/technology/troop/world only as side effects of bootstrap.
- **Spec**: `specs/003-player-registration-signup/spec.md` (final, as implemented).
- **Why coherent**: One user journey (“create commander + first city”) implemented as one command chain; depends on slice 002 for post-signup login.

### 3. Faction domain vocabulary

- **Scope**: `apps/server/src/core/faction/`, `packages/api-client` faction codes and `playableFactionCodes`, `apps/web/src/modules/faction/translations.ts`.
- **Spec**: `specs/004-faction-domain/spec.md` (final, as implemented).
- **Why coherent**: Playable vs known factions gate signup and troop init; small, shared kernel used by many features.

### 4. World grid and cell visibility

- **Scope**: `apps/server/src/core/world/`, `app/query/world/`, `web/handler/world/get-cells.ts`, `packages/api-client` world endpoints; `apps/web/src/modules/map/` (geometry, cells, world hook).
- **Why coherent**: Spatial model and “what cells can this Player see” before city settle, movement, or map UI actions.

### 5. City lifecycle and passive gathering

- **Scope**: `core/city/`, `app/command/city/`, `app/query/city/`, gather job in `app/job` + README `city.resources.gather`; `packages/api-client` city endpoints; `apps/web/src/modules/city/`.
- **Why coherent**: Cities as Player-owned settlements, settle/list/get, resource stock and gather loop.

### 6. Buildings and upgrade queue

- **Scope**: `core/building/`, building commands/queries, pg-boss `building.upgrade.finish`, `apps/web/src/modules/building/`.
- **Why coherent**: Building list/detail, upgrade/cancel, queue timers and WS `building:upgrade-finished`.

### 7. Technology research

- **Scope**: `core/technology/`, technology commands/queries, `technology.research.finish` job, `apps/web/src/modules/technology/`.
- **Why coherent**: Player-scoped research queue parallel to buildings but different singleton key semantics.

### 8. Troops (stationary stacks)

- **Scope**: `core/troop/` (non-movement), recruit/cancel, list by city/outpost, `apps/web/src/modules/troop/` (excluding movement create).
- **Why coherent**: Unit stacks on cells; recruitment uses pricing/requirements.

### 9. Troop movement and combat outcomes

- **Scope**: `app/command/troop/movement/`, `app/saga/`, movement finish job, communication report generation hooks; `apps/web/src/modules/movement/`.
- **Why coherent**: Create/estimate/list movements, finish saga, ties to reports and outposts.

### 10. Outposts

- **Scope**: `core/outpost/`, outpost commands/queries, permanent settlement, `apps/web/src/modules/outpost/`.
- **Why coherent**: Temporary vs permanent outposts driven by movement saga.

### 11. Communication reports

- **Scope**: `core/communication/`, report queries/commands, `apps/web/src/modules/communication/`.
- **Why coherent**: In-game messaging surface (list, read, unread count).

### 12. Location activity indicators

- **Scope**: `app/query/location/`, `web/handler/location/activity.ts`, `packages/api-client` location endpoints, `apps/web/src/modules/location/`.
- **Why coherent**: Cross-location “what is in progress” aggregation for city/outpost shells.

### 13. Requirements and pricing (cross-cutting rules)

- **Scope**: `core/requirement/`, `core/pricing/`, `apps/web/src/modules/requirement/`, `modules/cost/`.
- **Why coherent**: Shared gating and cost display consumed by building, technology, troop UIs.

### 14. Resources model

- **Scope**: `core/resources/`, resource stock adapters, energy helpers on web.
- **Why coherent**: Canonical resource types and stock mutations underpin city, movement, and buildings.

### 15. System-controlled Players

- **Scope**: `app/command/player/system/`, `adapter/job-queue/player/system-tick.ts`, `ensure-system`, `core/player/constant/system.ts`.
- **Why coherent**: Server-driven Players distinct from human session auth.

### 16. Real-time event fan-out (WebSocket)

- **Scope**: `app/event-bus.ts`, `core/events.ts`, `web/ws.ts` (event forwarding), per-module `ws-listener.ts` under `apps/web/src/modules/*`.
- **Why coherent**: Domain events → Player socket → React Query invalidation; depends on player session auth.

### 17. Application composition and background jobs

- **Scope**: `apps/server/src/index.ts`, `adapter/factory.ts`, `app/job/register.ts`, `adapter/job-queue/`, migrations entrypoint.
- **Why coherent**: Boot order, Factory wiring, pg-boss workers—foundation for timed game loops (can be specified after individual job semantics in slices 5–9).

### 18. Web application shell and routing

- **Scope**: `apps/web/src/App.tsx`, `modules/shared/root.tsx`, city/outpost roots, global styles—not individual feature pages.
- **Why coherent**: Navigation and layout wrapping authenticated modules; depends on player session auth.

**Out of scope for this inventory**: marketing site, `containers/` ops-only, CI workflow definitions.
