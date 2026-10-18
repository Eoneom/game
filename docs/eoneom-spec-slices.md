# Eoneom brownfield Spec Kit slices (ordered)

Survey of `Eoneom/game` at `main`. Order follows dependency: shared contracts and access control before domain features; server domain before web-only surfaces where split.

## Spec Kit features on `main`

| # | Directory | Topic |
| --- | --- | --- |
| 001 | [`specs/001-health-api/`](../specs/001-health-api/spec.md) | Public `GET /api/v1/health`, legacy redirects |
| 002 | [`specs/002-player-session-auth/`](../specs/002-player-session-auth/spec.md) | Human player: session, signup, bootstrap |
| 004 | [`specs/004-faction-domain/`](../specs/004-faction-domain/spec.md) | Faction codes, playable vs known, shared vocabulary |
| 005 | [`specs/005-world-grid-visibility/`](../specs/005-world-grid-visibility/spec.md) | World grid and cell visibility |
| 006 | [`specs/006-city-lifecycle-gathering/`](../specs/006-city-lifecycle-gathering/spec.md) | City lifecycle and passive gathering |
| 007 | [`specs/007-buildings-upgrade-queue/`](../specs/007-buildings-upgrade-queue/spec.md) | Buildings and upgrade queue |
| 008 | [`specs/008-technology-research/`](../specs/008-technology-research/spec.md) | Technology research (incl. queue) |
| 009 | [`specs/009-troops-stationary/`](../specs/009-troops-stationary/spec.md) | Troops (stationary stacks) |
| 010 | [`specs/010-troop-movement-combat/`](../specs/010-troop-movement-combat/spec.md) | Troop movement and combat outcomes |
| 011 | [`specs/011-outposts/`](../specs/011-outposts/spec.md) | Outposts |
| 012 | [`specs/012-communication-reports/`](../specs/012-communication-reports/spec.md) | Communication reports |
| 013 | [`specs/013-location-activity/`](../specs/013-location-activity/spec.md) | Location activity indicators |
| 014 | [`specs/014-requirements-pricing/`](../specs/014-requirements-pricing/spec.md) | Requirements and pricing |
| 015 | [`specs/015-resources-model/`](../specs/015-resources-model/spec.md) | Resources model |
| 016 | [`specs/016-system-controlled-players/`](../specs/016-system-controlled-players/spec.md) | System-controlled players |
| 017 | [`specs/017-realtime-websocket/`](../specs/017-realtime-websocket/spec.md) | Real-time event fan-out (WebSocket) |
| 018 | [`specs/018-app-composition-jobs/`](../specs/018-app-composition-jobs/spec.md) | Application composition and background jobs |
| 019 | [`specs/019-web-shell-routing/`](../specs/019-web-shell-routing/spec.md) | Web application shell and routing |
| 021 | [`specs/021-admin-operator-tools/`](../specs/021-admin-operator-tools/spec.md) | Admin operator tools (observability + combat simulator) |
| 022 | [`specs/022-timing-and-resources/`](../specs/022-timing-and-resources/spec.md) | Timing and resource pacing |
| 024 | [`specs/024-player-combat-pvp/`](../specs/024-player-combat-pvp/spec.md) | Player combat (PvP) — implemented (`attack`, battle jobs, reports, UI) |

## Brownfield inventory (dependency order)

### 1. Human player (session, signup, bootstrap)

- **Scope**: Session: `packages/api-client` player login/logout; `apps/server/src/core/auth/`, `app/command/auth/{login,logout,authorize,signup}.ts`, `web/middleware/auth.ts`, `web/handler/player/{login,logout,signup}.ts`, `web/ws.ts`; `apps/web/src/modules/auth/`. Signup/bootstrap: `app/command/player/bootstrap.ts`.
- **Spec**: [`specs/002-player-session-auth/spec.md`](../specs/002-player-session-auth/spec.md) (merged 002 + 003).
- **Why coherent**: Login, logout, signup, and first-city bootstrap are one human onboarding surface.

### 2. Faction domain vocabulary

- **Scope**: `apps/server/src/core/faction/`, `packages/api-client` faction codes and `playableFactionCodes`, `apps/web/src/modules/faction/translations.ts`.
- **Spec**: [`specs/004-faction-domain/spec.md`](../specs/004-faction-domain/spec.md) (final, as implemented).
- **Why coherent**: Playable vs known factions gate signup and troop init; small, shared kernel used by many features.

### 4. World grid and cell visibility

- **Scope**: `apps/server/src/core/world/`, `app/query/world/`, `web/handler/world/get-cells.ts`, `packages/api-client` world endpoints; `apps/web/src/modules/map/` (geometry, cells, world hook).
- **Spec**: [`specs/005-world-grid-visibility/spec.md`](../specs/005-world-grid-visibility/spec.md).
- **Why coherent**: Spatial model and “what cells can this Player see” before city settle, movement, or map UI actions.

### 5. City lifecycle and passive gathering

- **Scope**: `core/city/`, `app/command/city/`, `app/query/city/`, gather job (`city.resources.gather`); `packages/api-client` city endpoints; `apps/web/src/modules/city/`.
- **Spec**: [`specs/006-city-lifecycle-gathering/spec.md`](../specs/006-city-lifecycle-gathering/spec.md).
- **Why coherent**: Cities as Player-owned settlements, settle/list/get, resource stock and gather loop.

### 6. Buildings and upgrade queue

- **Scope**: `core/building/`, building commands/queries, pg-boss `building.upgrade.finish`, `apps/web/src/modules/building/`.
- **Spec**: [`specs/007-buildings-upgrade-queue/spec.md`](../specs/007-buildings-upgrade-queue/spec.md).
- **Why coherent**: Building list/detail, upgrade/cancel, queue timers and WS `building:upgrade-finished`.

### 7. Technology research (including queue)

- **Scope**: `core/technology/`, technology commands/queries, `technology.research.finish` job, `technology_research_queue`, `apps/web/src/modules/technology/`.
- **Spec**: [`specs/008-technology-research/spec.md`](../specs/008-technology-research/spec.md) (merged 008 + 023).
- **Why coherent**: Research start/cancel/finish and FIFO queue share one player-wide research lifecycle.

### 8. Troops (stationary stacks)

- **Scope**: `core/troop/` (non-movement), recruit/cancel, list by city/outpost, `apps/web/src/modules/troop/` (excluding movement create).
- **Spec**: [`specs/009-troops-stationary/spec.md`](../specs/009-troops-stationary/spec.md).
- **Why coherent**: Unit stacks on cells; recruitment uses pricing/requirements.

### 9. Troop movement and combat outcomes

- **Scope**: `app/command/troop/movement/`, `app/saga/`, movement finish job, communication report generation hooks; `apps/web/src/modules/movement/`.
- **Spec**: [`specs/010-troop-movement-combat/spec.md`](../specs/010-troop-movement-combat/spec.md).
- **Why coherent**: Create/estimate/list movements, finish saga, ties to reports and outposts.

### 10. Outposts

- **Scope**: `core/outpost/`, outpost commands/queries, permanent settlement, `apps/web/src/modules/outpost/`.
- **Spec**: [`specs/011-outposts/spec.md`](../specs/011-outposts/spec.md).
- **Why coherent**: Temporary vs permanent outposts driven by movement saga.

### 11. Communication reports

- **Scope**: `core/communication/`, report queries/commands, `apps/web/src/modules/communication/`.
- **Spec**: [`specs/012-communication-reports/spec.md`](../specs/012-communication-reports/spec.md).
- **Why coherent**: In-game messaging surface (list, read, unread count).

### 12. Location activity indicators

- **Scope**: `app/query/location/`, `web/handler/location/activity.ts`, `packages/api-client` location endpoints, `apps/web/src/modules/location/`.
- **Spec**: [`specs/013-location-activity/spec.md`](../specs/013-location-activity/spec.md).
- **Why coherent**: Cross-location “what is in progress” aggregation for city/outpost shells.

### 13. Requirements and pricing (cross-cutting rules)

- **Scope**: `core/requirement/`, `core/pricing/`, `apps/web/src/modules/requirement/`, `modules/cost/`.
- **Spec**: [`specs/014-requirements-pricing/spec.md`](../specs/014-requirements-pricing/spec.md).
- **Why coherent**: Shared gating and cost display consumed by building, technology, troop UIs.

### 14. Resources model

- **Scope**: `core/resources/`, resource stock adapters, energy helpers on web.
- **Spec**: [`specs/015-resources-model/spec.md`](../specs/015-resources-model/spec.md).
- **Why coherent**: Canonical resource types and stock mutations underpin city, movement, and buildings.

### 15. System-controlled Players

- **Scope**: `app/command/player/system/`, `adapter/job-queue/player/system-tick.ts`, `ensure-system`, `core/player/constant/system.ts`.
- **Spec**: [`specs/016-system-controlled-players/spec.md`](../specs/016-system-controlled-players/spec.md).
- **Why coherent**: Server-driven Players distinct from human session auth.

### 16. Real-time event fan-out (WebSocket)

- **Scope**: `app/event-bus.ts`, `core/events.ts`, `web/ws.ts` (event forwarding), per-module `ws-listener.ts` under `apps/web/src/modules/*`.
- **Spec**: [`specs/017-realtime-websocket/spec.md`](../specs/017-realtime-websocket/spec.md).
- **Why coherent**: Domain events → Player socket → React Query invalidation; depends on player session auth.

### 17. Application composition and background jobs

- **Scope**: `apps/server/src/index.ts`, `adapter/factory.ts`, `adapter/job-queue/register-workers.ts`, `adapter/job-queue/`, migrations entrypoint.
- **Spec**: [`specs/018-app-composition-jobs/spec.md`](../specs/018-app-composition-jobs/spec.md).
- **Why coherent**: Boot order, Factory wiring, pg-boss workers—foundation for timed game loops (can be specified after individual job semantics in slices 5–9).

### 18. Web application shell and routing

- **Scope**: `apps/web/src/App.tsx`, `modules/shared/root.tsx`, city/outpost roots, global styles—not individual feature pages.
- **Spec**: [`specs/019-web-shell-routing/spec.md`](../specs/019-web-shell-routing/spec.md).
- **Why coherent**: Navigation and layout wrapping authenticated modules; depends on player session auth.

**Out of scope for this inventory**: marketing site, `containers/` ops-only, CI workflow definitions.
