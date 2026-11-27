# Slice 010 — Troop movement and combat outcomes

**Status**: As implemented on `main` (brownfield). PvP evidence updated after slice [`024`](../024-player-combat-pvp/spec.md) (O005).

## Summary

Players create **movements** between map coordinates with an action (`MovementAction`: `explore`, `base`, `transport`, `attack`, `spy` — slice [`030`](../030-intelligence/spec.md), `reinforce` — slice [`033`](../033-alliances/spec.md)). Troops are deducted from origin cell stacks; a pg-boss job finishes at arrival and runs a **saga** (`sagaFinishOneMovement`) that dispatches to explore/base/transport/attack finish handlers. Peaceful outcomes include exploration updates, temporary/permanent outposts, city settle side effects, resource transport, and **communication reports** ([`012`](../012-communication-reports/spec.md)); `rebase` exists as a report type only, not as a `MovementAction`.

**`attack`** ([`024`](../024-player-combat-pvp/spec.md)) requires a `combat_strategy`, at least one `combat`-role troop, no `scout`-role troop, and an enemy-faction target. On arrival `sagaFinishAttack` opens a **battle** (attacker strategy from the movement; defender strategy from the target garrison's `default_combat_strategy`, `balanced` when unset — see [`009`](../009-troops-stationary/spec.md#garrison-defense-strategy-024)). Up to five rounds run through `combat.round.advance`; outcomes (occupation, loot, temporary-outpost destruction, retreat) are applied and two battle reports are written.

**Movement duration**: `TroopService.getMovementDuration` uses the **slowest** unit in the movement. Since slice [`027`](../027-military-economy-technologies/spec.md), a `combat`-role unit's speed is multiplied by `1 + 0.04 × tactical_propulsion` (owner's level); carriers, civilians and scouts are unchanged, so a mixed movement keeps the slower speed. The level is read when the movement is created (`createTroopMovement`, `POST /troop/movement/estimate`, return trips via `createReturnBaseTrip`); research finished later does not change a movement under way. Battle retreats are instantaneous placement on the origin cell ([`024`](../024-player-combat-pvp/spec.md)), so no duration applies.

**Depends on**: troops ([`009`](../009-troops-stationary/spec.md)), world ([`005`](../005-world-grid-visibility/spec.md)), outposts ([`011`](../011-outposts/spec.md)), cities ([`006`](../006-city-lifecycle-gathering/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/troop/movement` | yes | `troopListMovementHandler` |
| `POST` | `/troop/movement` | yes | `troopCreateMovementHandler` |
| `GET` | `/troop/movement/capacity` | yes | `troopMovementCapacityHandler` → `{ used, limit }` (slice [`028`](../028-command-center-shelter/spec.md)) |
| `GET` | `/troop/movement/incoming` | yes | `troopListIncomingMovementHandler` → incoming attacks filtered by the live `detection` level (slice [`030`](../030-intelligence/spec.md)) |
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
| `troop:movement:limit-reached` | Player already owns `movement_limit` movements (slice [`028`](../028-command-center-shelter/spec.md)) |
| `troop:movement:foreign-origin` | From another player's city, only a `base` recall to one of the player's own cities or outposts is allowed (slice [`033`](../033-alliances/spec.md)) |

**Transport cargo**: movement resources are plastic, mushroom, plasma and water (slice [`035`](../035-faction-exchange/spec.md), `movement.water`). Load = Σ amount × `resource_transport_weight` (plastic 1, mushroom 1, plasma 100, water 2) against the carriers' `transport_capacity`. Request bodies that omit `water` count it as 0 (`getResourcesFromBody`). On arrival, cities take every unit of plasma and water (no cap); outposts store no water, so it stays in the cargo and returns with the carriers (the estimate flags `destination_capacity_exceeded`). The exchange's `exchange` action and reserved carriers arrive with part 2 of slice 035.

**Movement cap** ([`028`](../028-command-center-shelter/spec.md)): `movement_limit = 5 + Σ command_center level` over the player's cities; every `movement` row of the player counts (`movement.countByPlayer`). `createTroopMovement` (every action) rejects at the cap; a rebase (`rebaseTroopMovement`) runs the same check but excludes the inbound movement it replaces, so it is only blocked when the player is over the cap (after losing a city). Automatic return trips (`createReturnBaseTrip` from explore / transport) and battle retreats are never checked. Losing a city lowers the limit without cancelling movements under way.

| `CombatError` (attack movements) | Meaning |
| --- | --- |
| `combat:same-faction-attack` | Target belongs to the attacker's faction |
| `combat:no-valid-target` | No enemy stack or settlement at the destination |
| `combat:combat-troop-required` | Army has no `combat`-role troop |
| `combat:scout-not-allowed-on-attack` | Army includes a `scout`-role troop |
| `combat:strategy-required` | `attack` without `combat_strategy` |
| `combat:battle-not-found` | Unknown battle id (round job / outcomes) |

**`spy`** (slice [`030`](../030-intelligence/spec.md)): `espionage` ≥ 1, `scout`-role troops only, and an enemy-faction target resolved like an attack (`resolveSpyTarget` wraps `resolveAttackTarget`); same-faction targets keep `combat:same-faction-attack`, the movement cap applies, no `combat_strategy`. On arrival `sagaFinishSpy` rolls `p_success = clamp(0.50 + 0.15 × gap + 0.02 × (scouts − 1), 0.05, 0.95)` (`gap = espionage − target detection`, read at arrival): success writes a `spy` report, marks the cell explored and sends the scouts home with an automatic `base` movement (like `explore`); failure deletes the scouts and the movement and also writes a `spy_detected` report for the target; a vanished or same-faction target ends the mission without a roll and the scouts return. Spy movements are never announced to the target.

| `IntelError` (spy movements) | Meaning |
| --- | --- |
| `intel:espionage-required` | Player has no `espionage` level |
| `intel:scout-only` | Selection is empty or includes a non-`scout` troop |
| `intel:no-valid-target` | No enemy stack or settlement at the destination |

**`reinforce`** (slice [`033`](../033-alliances/spec.md)): the destination must be a city owned by another member of the player's alliance (`alliance:invalid-reinforce-target`; outposts, own cities and non-members are rejected), with `combat`-role troops only, at least one (`alliance:combat-troops-only`); the movement cap applies. On arrival `sagaFinishReinforce` re-checks the target: the troops are merged into the owner's own stacks on the host cell (rows keep the owner's `player_id`) and the host gets a `reinforcement` report and `reinforcement:arrived`; otherwise they come home with an automatic `base` movement (no cap check). **Recall**: stationed troops leave only through their owner's `base` movement from the host cell to one of the owner's cities or outposts (counts toward the cap, emits `reinforcement:recalled` to the host); every other action from another player's city is `troop:movement:foreign-origin`. Leaving, being kicked from or dissolving the alliance sends the troops between the former allies home automatically (closest city, no cap check). `GET /troop/reinforcement?city_id=` lists the allied troops stationed in one of the caller's cities; `GET /troop/reinforcement/abroad` lists the caller's troops stationed in allied cities.

**Incoming attacks** ([`030`](../030-intelligence/spec.md)): `GET /troop/movement/incoming` lists other players' `attack` movements whose destination cell holds one of the player's cities, outposts or stationary troops (`movement.listIncomingAttacks`), while their finish job is pending. Fields follow the player's `detection` level read on each call: none at 0 (`[]`), target and `arrive_at` at 1, `attacker` at 2, `unit_count` (nearest 10) at 3, `troops` from 4; the strategy is never sent. Creating an attack emits `movement:incoming` to the defender when their `detection` ≥ 1.

Tests: `apps/server/src/web/handler/troop/movement/*.spec.ts`, `apps/server/src/app/command/troop/movement/*.spec.ts`, `apps/server/src/app/query/troop/movement/*.spec.ts`, `apps/server/src/app/saga/finish/*.spec.ts`, `apps/server/src/app/command/combat/*.spec.ts`.

## Background jobs

| Queue | Command |
| --- | --- |
| `troop.movement.finish` | `sagaFinishOneMovement` |
| `combat.round.advance` | `advanceCombatRound` (`{ battle_id, round }`; next round scheduled at `COMBAT_ROUND_INTERVAL_MS` = 0, i.e. rounds chain immediately) |

On success: `AppEvent.TroopMovementFinished`; if base saga created an outpost, also `AppEvent.OutpostCreated`. Missing movement at finish is logged and swallowed (`troop:movement:not-found`). When a battle ends, after the outcome transaction commits, `AppEvent.BattleFinished` is emitted once per participant with `{ player_id, report_id, perspective, winner }` ([`017`](../017-realtime-websocket/spec.md)).

## Saga routing

`MovementAction.EXPLORE` → `sagaFinishExplore`; `BASE` → `sagaFinishBase`; `TRANSPORT` → `sagaFinishTransport`; `ATTACK` → `sagaFinishAttack`; `SPY` → `sagaFinishSpy` (slice [`030`](../030-intelligence/spec.md)); `REINFORCE` → `sagaFinishReinforce` (slice [`033`](../033-alliances/spec.md)); default → `MOVEMENT_ACTION_NOT_IMPLEMENTED`.

`TroopMovementGetActionQuery` resolves action for a movement id.

## Battle persistence

| Table | Content |
| --- | --- |
| `battle` | One row per attack movement (`movement_id` unique): participants, cell, target kind/id, strategies, `current_round`, `status`, `winner`, `state_json` (current stacks per side, attacker origin, cumulative losses) |
| `battle_round` | One row per resolved round (PK `battle_id, round`): attack/life pools per side and per-side losses (migration `00009`; rounds were previously in `state_json.round_summaries`) |

`BattleEntity.round_summaries` is loaded from `battle_round`; the repository inserts new rounds idempotently.

## Web UI

`apps/web/src/modules/movement/` — list, item links to movement detail routes under city/outpost ([`019`](../019-web-shell-routing/spec.md)). Create form supports `attack` with a combat strategy picker (`create/strategy`). Movement details show « Bataille en cours » when `battle_id` is set. Slice [`030`](../030-intelligence/spec.md): « Espionner » action (scouts only, destination not same-faction) with an odds preview, and an « Attaques entrantes » section (`movement/incoming/`) fed by `GET /troop/movement/incoming`. Troop module `ws-listener` listens for `troop:movement-finished` and `battle:finished` (refreshes movement list and detail).

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
