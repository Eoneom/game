# Research — 024 Player combat (PvP) (Phase 0)

**Date**: 2026-10-17  
**Spec**: [`spec.md`](./spec.md)  
**Plan**: [`plan.md`](./plan.md)

Brownfield inventory of movement sagas, jobs, and reports on `main`, plus gaps for `attack`, battle entity, and five-round combat jobs.

## Movement lifecycle (today)

### HTTP surface

Documented in [`010-troop-movement-combat/spec.md`](../010-troop-movement-combat/spec.md):

| Method | Path | Handler |
| --- | --- | --- |
| `POST` | `/troop/movement` | `apps/server/src/web/handler/troop/movement/create.ts` → `createTroopMovement` |
| `POST` | `/troop/movement/estimate` | `estimate.ts` → `TroopMovementEstimateQuery` |
| `GET` | `/troop/movement/:movement_id` | `get.ts` |

api-client request shape (`packages/api-client/src/endpoints/troop/movement/create.ts`): `origin`, `destination`, `action`, `troops[]`, optional `resources` — **no** `combat_strategy` yet.

### Domain actions

`MovementAction` is explore / base / transport only:

```1:5:apps/server/src/core/troop/constant/movement-action.ts
export enum MovementAction {
  EXPLORE = 'explore',
  BASE = 'base',
  TRANSPORT = 'transport'
}
```

`MovementEntity` (`apps/server/src/core/troop/movement/entity.ts`) stores `player_id`, `action`, coordinates, embedded resource payload — no battle link.

Postgres `movement` table (`00001_initial.ts`): `action` text, origin/destination ints, resource columns; no strategy column (attack will need `combat_strategy` column or battle row keyed by `movement_id`).

### Create command flow

`apps/server/src/app/command/troop/movement/create.ts`:

- Validates transport rules via `TroopService.assertTransportResources`.
- Loads origin cell troops; `TroopService.splitTroops` + `TroopService.createMovement` + `assignToMovement`.
- Schedules finish via `job_queue.scheduleTroopMovementFinish` (port).
- **No faction hostility check**; **no combat troop rules**.

Troop eligibility today uses `TroopRole` (scout, founder, carrier, …) in `apps/server/src/core/troop/constant/role.ts` — spec’s `combat_role` (`combat` | `carrier` | `civilian` | `scout`) is a **new** characteristic dimension to add alongside or mapped from existing roles for movement rules.

### Finish saga routing

`apps/server/src/app/saga/finish/movement.ts` loads action via `TroopMovementGetActionQuery` and dispatches:

| Action | Saga |
| --- | --- |
| `explore` | `sagaFinishExplore` |
| `base` | `sagaFinishBase` |
| `transport` | `sagaFinishTransport` |
| default | `TroopError.MOVEMENT_ACTION_NOT_IMPLEMENTED` |

On success (peaceful paths): `AppEvent.TroopMovementFinished` (`troop:movement-finished`). Outpost creation also emits `OutpostCreated`.

**Gap**: `ATTACK` branch → `sagaFinishAttack` → start battle (no peaceful report at arrival).

### pg-boss job

| Queue | File | Worker |
| --- | --- | --- |
| `troop.movement.finish` | `apps/server/src/adapter/job-queue/troop/finish-movement.ts` | `register-workers.ts` → `sagaFinishOneMovement` |

Job data: `{ player_id, movement_id }`; `singletonKey: movement_id`. Scheduling from `TroopService.createMovement` path inside create command.

**Gap**: second queue e.g. `combat.round.advance` with `{ battle_id, round }` and `startAfter: now + COMBAT_ROUND_INTERVAL_MS` (not registered in `register-workers.ts` today).

## Reports (today)

### Types and factory

`ReportType`: exploration, base, rebase, transport — **no battle** (`apps/server/src/core/communication/value/report-type.ts`).

Peaceful finishes call `ReportFactory.generateUnread` with movement context:

- `sagaFinishExplore` → `ReportType.EXPLORATION`
- `sagaFinishBase` → `ReportType.BASE` (and rebase reports elsewhere)
- `sagaFinishTransport` → `ReportType.TRANSPORT`

Factory (`apps/server/src/core/communication/report/factory.ts`) builds `ReportEntity` from movement origin/destination and troop lines — **no** extended metadata table.

### Persistence & queries

- Table `report` in `00001_initial.ts` + troop line storage via repository (`apps/server/src/adapter/database/repository/report.ts`).
- `CommunicationGetReportQuery` (`apps/server/src/app/query/communication/report/get.ts`) returns `ReportEntity` only — no join.

api-client `CommunicationGetReportDataResponse` (`packages/api-client/src/endpoints/communication/report/get.ts`) mirrors flat fields — **no** `battle` block.

### Web realtime coupling

`apps/web/src/modules/troop/ws-listener.ts` on `TroopMovementFinished` invalidates movements, **report unread count**, and location activity. PvP battle reports arrive **after** movement finish (possibly minutes later) — spec requires separate `battle:finished` listener (e.g. `apps/web/src/modules/communication/ws-listener.ts`).

## Troops & factions (today)

- `TroopCode` — 10 economy/scout codes only (`apps/server/src/core/troop/constant/code.ts`).
- `troop_characteristics` — `speed`, `transport_capacity` only (`characteristic.ts`).
- `troop_faction` maps each code to confederation or singularity (`faction.ts`).
- `TroopService.codesForFaction` used at signup/recruit — must include new combat codes per faction.
- Recruit requirements: `apps/server/src/core/requirement/constant/troop.ts`; pricing: `apps/server/src/core/pricing/constant/troop.ts` — no combat rows yet.

## System players (today)

- `tickSystemPlayers` (`apps/server/src/app/command/player/system/tick.ts`) runs `systemTickActions` from `actions.ts` — explore, base, settle, upgrade, research, recruit, transport; **no attack**.
- Troop policy in `troops.ts` uses `TroopRole` counts — **no** `war_machine` / `disruptor` recruitment.

## WebSocket events (today)

`AppEvent` (`apps/server/src/core/events.ts`): no `BattleFinished`. api-client re-exports events from `@server-core/events` (`packages/api-client/src/events.ts`).

## Gaps summary (024 scope)

| Area | Today | Needed for 024 |
| --- | --- | --- |
| Movement action | 3 peaceful values | `attack` + `combat_strategy` on create |
| Saga finish | 3 handlers | `sagaFinishAttack` + battle start |
| Jobs | `troop.movement.finish` only | `combat.round.advance` (×5 max) + finish battle command |
| Combat domain | None | `core/combat/` service + battle repository |
| Troop stats | speed/capacity | attack, defense, life, classes, combat roles |
| Reports | 4 types at movement finish | `battle` at battle end + `report_battle` metadata |
| WS | `troop:movement-finished` | `battle:finished` per player |
| System AI | Economy/expansion | Combat recruit + attack tick |
| Garrison strategy | N/A | Optional `default_combat_strategy` on city/outpost |

## Related specs to update after implementation

| Slice | Update |
| --- | --- |
| [`009`](../009-troops-stationary/spec.md) | Combat troops, characteristics, recruit gates |
| [`010`](../010-troop-movement-combat/spec.md) | `attack` routing, jobs, errors |
| [`012`](../012-communication-reports/spec.md) | `battle` type, metadata, WS |
| [`016`](../016-system-controlled-players/spec.md) | Alpha combat recruit + attack |
