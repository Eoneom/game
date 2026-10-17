# Slice 010 — Troop movement and combat outcomes

**Status**: As implemented on `main` (brownfield).

## Summary

Players create **movements** between map coordinates with an action (`MovementAction`: explore, base, transport, rebase). Troops are deducted from origin cell stacks; a pg-boss job finishes at arrival and runs a **saga** (`sagaFinishOneMovement`) that dispatches to explore/base/transport finish handlers. Outcomes include exploration updates, temporary/permanent outposts, city settle side effects, resource transport, and **communication reports** ([`012`](../012-communication-reports/spec.md)). There is no separate real-time battle resolver on `main` today—peaceful outcomes are encoded in saga + report generation. Planned **`attack`** action (with `combat_strategy`), five-round simultaneous battles, and battle sagas: [`024`](../024-player-combat-pvp/spec.md).

**Depends on**: troops ([`009`](../009-troops-stationary/spec.md)), world ([`005`](../005-world-grid-visibility/spec.md)), outposts ([`011`](../011-outposts/spec.md)), cities ([`006`](../006-city-lifecycle-gathering/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/troop/movement` | yes | `troopListMovementHandler` |
| `POST` | `/troop/movement` | yes | `troopCreateMovementHandler` |
| `GET` | `/troop/movement/:movement_id` | yes | `troopGetMovementHandler` |
| `POST` | `/troop/movement/estimate` | yes | `troopEstimateMovementHandler` |

| `TroopError` (movement-related) | Meaning |
| --- | --- |
| `troop:movement:not-owner` | Movement owned by another player |
| `troop:movement:not-found` | Unknown or already finished movement |
| `troop:movement:action-not-implemented` | Unsupported action in saga |
| `troop:movement:transport-capacity-exceeded` | Transport payload too large |
| `troop:movement:transport-resources-required` | Transport without resources |
| `troop:movement:transport-resources-not-allowed` | Resources on non-transport action |

Tests: `apps/server/src/web/handler/troop/movement/*.spec.ts`, `apps/server/src/app/command/troop/movement/*.spec.ts`, `apps/server/src/app/saga/finish/*.spec.ts`.

## Background jobs

| Queue | Command |
| --- | --- |
| `troop.movement.finish` | `sagaFinishOneMovement` |

On success: `AppEvent.TroopMovementFinished`; if base saga created an outpost, also `AppEvent.OutpostCreated`. Missing movement at finish is logged and swallowed (`troop:movement:not-found`).

## Saga routing

`MovementAction.EXPLORE` → `sagaFinishExplore`; `BASE` → `sagaFinishBase`; `TRANSPORT` → `sagaFinishTransport`; default → `MOVEMENT_ACTION_NOT_IMPLEMENTED`.

`TroopMovementGetActionQuery` resolves action for a movement id.

## Web UI

`apps/web/src/modules/movement/` — list, item links to movement detail routes under city/outpost ([`019`](../019-web-shell-routing/spec.md)). Troop module `ws-listener` listens for `troop:movement-finished`.

## API client

`packages/api-client/src/endpoints/troop/movement/`.

## Evidence index

| Area | Paths |
| --- | --- |
| Commands | `apps/server/src/app/command/troop/movement/` |
| Sagas | `apps/server/src/app/saga/finish/` |
| Queries | `apps/server/src/app/query/troop/movement/` |
| Jobs | `apps/server/src/adapter/job-queue/troop/movement-finish.ts` |
| HTTP | `apps/server/src/web/handler/troop/movement/` |
| Web | `apps/web/src/modules/movement/` |
