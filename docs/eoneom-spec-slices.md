# Eoneom brownfield Spec Kit slices (ordered)

Survey of `Eoneom/game` on `main`. Order follows dependency: shared contracts and access control before domain features; server domain before web-only surfaces where split.

## Spec Kit features on `main`

| # | Directory | Topic |
| --- | --- | --- |
| 001 | `specs/001-health-api/` | Public `GET /api/v1/health`, legacy redirects |
| 002 | `specs/002-player-session-auth/` | Player session token (HTTP + WebSocket) |
| 003 | `specs/003-player-registration-signup/` | Signup + player/world bootstrap |
| 004 | `specs/004-faction-domain/` | Faction codes, playable vs non-playable |

## Brownfield inventory (next specs, dependency order)

### 1. Player session authentication

- **Scope**: `packages/api-client` (`response.ts`, `fetcher.ts`, `error/request.ts`, `endpoints/player/login.ts`, `endpoints/player/logout.ts`); `apps/server/src/core/auth/`, `app/command/auth/{login,logout,authorize}.ts`, `web/middleware/auth.ts`, `web/handler/player/{login,logout}.ts`, `web/ws.ts` (token gate only); `apps/web/src/modules/auth/{context,hooks,login-form,unauthenticated}.tsx`, `helpers/api.ts`, `helpers/websocket.ts`.
- **Spec**: `specs/002-player-session-auth/spec.md`.

### 2. Player registration (signup) and bootstrap

- **Scope**: `app/command/auth/signup.ts`, `app/command/player/bootstrap.ts`, `web/handler/player/signup.ts`, `core/player/`; web signup form and `useSignup`.
- **Spec**: `specs/003-player-registration-signup/spec.md`.

### 3. Faction domain vocabulary

- **Scope**: `apps/server/src/core/faction/`, `packages/api-client` faction codes and `playableFactionCodes`, `apps/web/src/modules/faction/translations.ts`.
- **Spec**: `specs/004-faction-domain/spec.md`.

### 4. World grid and cell visibility

- **Scope**: `apps/server/src/core/world/`, `app/query/world/`, `web/handler/world/get-cells.ts`, `packages/api-client` world endpoints; `apps/web/src/modules/map/`.

### 5. City lifecycle and passive gathering

- **Scope**: `core/city/`, `app/command/city/`, `app/query/city/`, gather job; `apps/web/src/modules/city/`.

### 6. Buildings and upgrade queue

- **Scope**: `core/building/`, building commands/queries, pg-boss `building.upgrade.finish`, `apps/web/src/modules/building/`.

### 7. Technology research

- **Scope**: `core/technology/`, technology commands/queries, `technology.research.finish` job, `apps/web/src/modules/technology/`.

### 8. Troops (stationary stacks)

- **Scope**: `core/troop/` (non-movement), recruit/cancel, list by city/outpost, `apps/web/src/modules/troop/` (excluding movement create).

### 9. Troop movement and combat outcomes

- **Scope**: `app/command/troop/movement/`, `app/saga/`, movement finish job; `apps/web/src/modules/movement/`.

### 10. Outposts

- **Scope**: `core/outpost/`, outpost commands/queries, `apps/web/src/modules/outpost/`.

### 11. Communication reports

- **Scope**: `core/communication/`, `apps/web/src/modules/communication/`.

### 12. Location activity indicators

- **Scope**: `app/query/location/`, `web/handler/location/activity.ts`, `apps/web/src/modules/location/`.

### 13. Requirements and pricing (cross-cutting rules)

- **Scope**: `core/requirement/`, `core/pricing/`, `apps/web/src/modules/requirement/`, `modules/cost/`.

### 14. Resources model

- **Scope**: `core/resources/`, resource stock adapters, energy helpers on web.

### 15. System-controlled Players

- **Scope**: `app/command/player/system/`, `adapter/job-queue/player/system-tick.ts`, `ensure-system`, `core/player/constant/system.ts`.

### 16. Real-time event fan-out (WebSocket)

- **Scope**: `app/event-bus.ts`, `core/events.ts`, `web/ws.ts`, per-module `ws-listener.ts` under `apps/web/src/modules/*`.

### 17. Application composition and background jobs

- **Scope**: `apps/server/src/index.ts`, `adapter/factory.ts`, `app/job/register.ts`, `adapter/job-queue/`, migrations entrypoint.

### 18. Web application shell and routing

- **Scope**: `apps/web/src/App.tsx`, `modules/shared/root.tsx`, city/outpost roots, global styles.

**Out of scope for this inventory**: marketing site, `containers/` ops-only, CI workflow definitions.
