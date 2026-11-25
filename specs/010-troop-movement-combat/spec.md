# Slice 010 — Troop movement and combat outcomes

**Status**: As implemented on `main` (brownfield). PvP evidence updated after slice [`024`](../024-player-combat-pvp/spec.md) (O005).

## Summary

Players create **movements** between map coordinates with an action (`MovementAction`: `explore`, `base`, `transport`, `attack`). Troops are deducted from origin cell stacks; a pg-boss job finishes at arrival and runs a **saga** (`sagaFinishOneMovement`) that dispatches to explore/base/transport/attack finish handlers. Peaceful outcomes include exploration updates, temporary/permanent outposts, city settle side effects, resource transport, and **communication reports** ([`012`](../012-communication-reports/spec.md)); `rebase` exists as a report type only, not as a `MovementAction`.

**`attack`** ([`024`](../024-player-combat-pvp/spec.md)) requires a `combat_strategy`, at least one `combat`-role troop, no `scout`-role troop, and an enemy-faction target. On arrival `sagaFinishAttack` opens a **battle** (attacker strategy from the movement; defender strategy from the target garrison's `default_combat_strategy`, `balanced` when unset — see [`009`](../009-troops-stationary/spec.md#garrison-defense-strategy-024)). Up to five rounds run through `combat.round.advance`; outcomes (occupation, loot, temporary-outpost destruction, retreat) are applied and two battle reports are written.

**Depends on**: troops ([`009`](../009-troops-stationary/spec.md)), world ([`005`](../005-world-grid-visibility/spec.md)), outposts ([`011`](../011-outposts/spec.md)), cities ([`006`](../006-city-lifecycle-gathering/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/troop/movement` | yes | `troopListMovementHandler` |
| `POST` | `/troop/movement` | yes | `troopCreateMovementHandler` |
| `GET` | `/troop/movement/:movement_id` | yes | `troopGetMovementHandler` |
| `POST` | `/troop/movement/estimate` | yes | `troopEstimateMovementHandler` |

**Movement visibility**: a movement is listed while its `troop.movement.finish` job is pending. An arrived **attack** keeps its movement row until the battle ends but is hidden from `GET /troop/movement`. `GET /troop/movement/:movement_id` still returns it while the battle is `in_progress`, with `battle_id` set and `arrive_at` = battle start; otherwise `battle_id` is `null`. After the battle finishes the movement is deleted (`troop:movement:not-found`).

| `TroopError` (movement-related) | Meaning |
| --- | --- |
| `troop:movement:not-owner` | Movement owned by another player |
| `troop:movement:not-found` | Unknown or already finished movement |
| `troop:movement:action-not-implemented` | Unsupported action in saga |
| `troop:movement:transport-capacity-exceeded` | Transport payload too large |
| `troop:movement:transport-resources-required` | Transport without resources |
| `troop:movement:transport-resources-not-allowed` | Resources on non-transport action |

| `CombatError` (attack movements) | Meaning |
| --- | --- |
| `combat:same-faction-attack` | Target belongs to the attacker's faction |
| `combat:no-valid-target` | No enemy stack or settlement at the destination |
| `combat:combat-troop-required` | Army has no `combat`-role troop |
| `combat:scout-not-allowed-on-attack` | Army includes a `scout`-role troop |
| `combat:strategy-required` | `attack` without `combat_strategy` |
| `combat:battle-not-found` | Unknown battle id (round job / outcomes) |

Tests: `apps/server/src/web/handler/troop/movement/*.spec.ts`, `apps/server/src/app/command/troop/movement/*.spec.ts`, `apps/server/src/app/query/troop/movement/*.spec.ts`, `apps/server/src/app/saga/finish/*.spec.ts`, `apps/server/src/app/command/combat/*.spec.ts`.

## Background jobs

| Queue | Command |
| --- | --- |
| `troop.movement.finish` | `sagaFinishOneMovement` |
| `combat.round.advance` | `advanceCombatRound` (`{ battle_id, round }`; next round scheduled at `COMBAT_ROUND_INTERVAL_MS` = 0, i.e. rounds chain immediately) |

On success: `AppEvent.TroopMovementFinished`; if base saga created an outpost, also `AppEvent.OutpostCreated`. Missing movement at finish is logged and swallowed (`troop:movement:not-found`). When a battle ends, after the outcome transaction commits, `AppEvent.BattleFinished` is emitted once per participant with `{ player_id, report_id, perspective, winner }` ([`017`](../017-realtime-websocket/spec.md)).

## Saga routing

`MovementAction.EXPLORE` → `sagaFinishExplore`; `BASE` → `sagaFinishBase`; `TRANSPORT` → `sagaFinishTransport`; `ATTACK` → `sagaFinishAttack`; default → `MOVEMENT_ACTION_NOT_IMPLEMENTED`.

`TroopMovementGetActionQuery` resolves action for a movement id.

## Battle persistence

| Table | Content |
| --- | --- |
| `battle` | One row per attack movement (`movement_id` unique): participants, cell, target kind/id, strategies, `current_round`, `status`, `winner`, `state_json` (current stacks per side, attacker origin, cumulative losses) |
| `battle_round` | One row per resolved round (PK `battle_id, round`): attack/life pools per side and per-side losses (migration `00009`; rounds were previously in `state_json.round_summaries`) |

`BattleEntity.round_summaries` is loaded from `battle_round`; the repository inserts new rounds idempotently.

## Web UI

`apps/web/src/modules/movement/` — list, item links to movement detail routes under city/outpost ([`019`](../019-web-shell-routing/spec.md)). Create form supports `attack` with a combat strategy picker (`create/strategy`). Movement details show « Bataille en cours » when `battle_id` is set. Troop module `ws-listener` listens for `troop:movement-finished` and `battle:finished` (refreshes movement list and detail).

## API client

`packages/api-client/src/endpoints/troop/movement/` (`TroopGetMovementDataResponse.battle_id`).

## Evidence index

| Area | Paths |
| --- | --- |
| Commands | `apps/server/src/app/command/troop/movement/`, `apps/server/src/app/command/combat/{advance-round,apply-battle-outcomes}.ts` |
| Sagas | `apps/server/src/app/saga/finish/` (incl. `attack.ts`) |
| Queries | `apps/server/src/app/query/troop/movement/` |
| Combat core | `apps/server/src/core/combat/` (`combat-service.ts`, `entity/battle.ts`, `type/battle-stack.ts`) |
| Persistence | `apps/server/src/adapter/database/repository/battle.ts`, migrations `00006_player_combat_pvp.ts`, `00009_battle_round.ts` |
| Jobs | `apps/server/src/adapter/job-queue/troop/movement-finish.ts`, `apps/server/src/adapter/job-queue/combat/advance-round.ts` |
| HTTP | `apps/server/src/web/handler/troop/movement/` |
| Web | `apps/web/src/modules/movement/` |
