# Slice 009 — Troops (stationary stacks)

**Status**: As implemented on `main` (brownfield). PvP evidence updated after slice [`024`](../024-player-combat-pvp/spec.md) (O005).

## Summary

**Troop stacks** (`TroopEntity`) sit on a `cell_id`, belong to a `player_id`, have a `TroopCode` and `count`, and may reference an active `movement_id`. Players **recruit** (batched job `troop.recruit.progress`), **cancel** recruitment, and **list/get** troops by city or outpost. Faction determines which troop codes exist at bootstrap (`TroopService.codesForFaction`). Movement creation is [`010`](../010-troop-movement-combat/spec.md). **Recruit** gates and costs use [`014`](../014-requirements-pricing/spec.md) (`TroopRequirement`, `PricingService.getTroopCost`); **combat** `TroopCode`s (four per faction, one per `CombatTroopClass`; see [Combat roles](#combat-roles), [`024`](../024-player-combat-pvp/spec.md) and [`025`](../025-lawless-human-faction/spec.md)) include `life_capacity`, `combat_troop_class`, `troop_faction`, per-code recruit rows, and web art on `main`.

**Depends on**: city/outpost location, requirements/pricing ([`014`](../014-requirements-pricing/spec.md)), faction ([`004`](../004-faction-domain/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/city/:city_id/troop` | yes | `troopListCityHandler` |
| `GET` | `/outpost/:outpost_id/troop` | yes | `troopListOutpostHandler` |
| `GET` | `/troop/:troop_id` | yes | `troopGetHandler` |
| `PUT` | `/troop/recruit` | yes | `troopRecruitHandler` |
| `PUT` | `/troop/cancel` | yes | `troopCancelHandler` |
| `PUT` | `/troop/queue/cancel` | yes | `troopCancelQueuedHandler` (waiting batch, slice [`028`](../028-command-center-shelter/spec.md)) |

| `TroopError` (stationary-related) | Meaning |
| --- | --- |
| `troop:not-found` | Unknown troop |
| `troop:already-in-progress` | Recruitment already running for city |
| `troop:not-in-progress` | Cancel when idle |
| `troop:not-enough-troops` | Insufficient count for an operation |
| `troop:not-owner` | Wrong player |
| `troop:not-in-faction-roster` | Code not allowed for faction |
| `troop:queue-full` | Recruitment queue already holds `TROOP_RECRUIT_QUEUE_LIMIT` (3) waiting batches |
| `troop:queue-item-not-found` | Unknown waiting batch id |

**Recruitment queue** ([`028`](../028-command-center-shelter/spec.md)): a city with `command_center` ≥ 1 keeps up to 3 waiting batches (`troop_recruit_queue`) behind the active one. `recruitTroop` starts a batch when none is pending, otherwise enqueues (ownership + roster only; requirements and resources are checked and paid at start). At level 0 a running batch still fails with `troop:already-in-progress`. When a batch finishes (`progressTroopRecruitment`) or is cancelled, `processTroopRecruitQueue` starts the oldest row; rows that fail their checks are dropped with `troop:queue-item-dropped` (WebSocket + toast). City capture deletes the city's rows. `GET /city/:city_id/troop` returns `recruit_queue` and `recruit_queue_limit`.

Recruitment progress emits `troop:recruitment-updated` (WebSocket [`017`](../017-realtime-websocket/spec.md)).

Tests: `apps/server/src/web/handler/troop/{recruit,cancel,get,list/*}.spec.ts`, `apps/server/src/app/command/troop/{recruit,cancel,progress-recruit}.spec.ts`, `apps/server/src/core/troop/service.spec.ts`.

## Combat roles

Every `TroopCode` has a `combat_role` (`core/troop/constant/characteristic.ts`); combat-role codes also have a `combat_troop_class`:

| Faction | `legionnaire` class | `interceptor` class | `war_machine` class | `disruptor` class |
| --- | --- | --- | --- | --- |
| `the_confederation` | `legionnaire` | `interceptor` | `assault_behemoth` | `shock_trooper` |
| `the_technological_singularity` | `prime_unit` | `striker_drone` | `war_machine` | `disruptor` |
| `the_ash_liturgy` | `penitent_horde` | `wraith_lancer` | `cinder_titan` | `hemorrhage_cultist` |
| `the_symbiosis` ([`036`](../036-faction-symbiosis/spec.md)) | `root_warden` | `spore_swarm` | `fungal_colossus` | `toxic_howler` |

Other roles: **scout** (`explorer`, `seeker`, `ash_emissary`, `drifting_spore`), **carrier** (`light_transporter`, `hauler`, `bone_cart`, `mycelial_porter`), **civilian** (settlers and gatherers, incl. `pyre_pilgrim`, `spore_acolyte`, `scrap_lector`, `seed_bearer`, `symbiont_grower`, `decomposer`). Role decides battle pools and whether a stack may join an attack ([`010`](../010-troop-movement-combat/spec.md)).

## Garrison defense strategy (024)

Troops stationed on a city or outpost defend with that location's **`default_combat_strategy`** (`city` / `outpost` column; `null` → `balanced` via `resolveDefaultCombatStrategy`). The owner sets it:

| Method | Path | Auth | Handler | Body |
| --- | --- | --- | --- | --- |
| `PUT` | `/city/:city_id/combat-strategy` | yes | `citySetCombatStrategyHandler` | `{ combat_strategy }` |
| `PUT` | `/outpost/:outpost_id/combat-strategy` | yes | `outpostSetCombatStrategyHandler` | `{ combat_strategy }` |

Unknown or missing strategy → 400 `combat_strategy:not-found`; another player's location → `city:not-owner` / `outpost:not-owner`. `GET /city/:city_id` and `GET /outpost/:outpost_id` return the effective `default_combat_strategy`. The strategy is read when a battle starts (`sagaFinishAttack`), so changing it mid-battle does not affect that battle. System players never set it, so their garrisons defend `balanced`.

Web: « Défense de la garnison » panel (`troop/garrison-strategy`) on the city troop page and the outpost page.

Tests: `apps/server/src/app/command/{city,outpost}/set-combat-strategy.spec.ts`, `apps/server/src/web/handler/{city,outpost}/set-combat-strategy.spec.ts`, `apps/web/src/modules/outpost/page.test.tsx`.

## Background jobs

| Queue | Command |
| --- | --- |
| `troop.recruit.progress` | `progressTroopRecruitment` (stately queue) |

## Domain

- `TroopService.init` / `codesForFaction` at player bootstrap.
- Costs: `PricingService.getTroopCost` (cloning factory + replication catalyst reduce duration).
- Requirements: `RequirementService.checkTroopRequirement`. **Combat** codes ([`024`](../024-player-combat-pvp/spec.md)): **`cloning_factory`** + **`replication_catalyst`** only (no `architecture` / `photovoltaic_optimization` gates).

## Web UI

`apps/web/src/modules/troop/` — details, recruit form, garrison defense strategy panel (not movement list; see movement module).

## API client

`packages/api-client/src/endpoints/troop/`.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/troop/` |
| Commands | `apps/server/src/app/command/troop/` (except `movement/`) |
| Queries | `apps/server/src/app/query/troop/` (except movement) |
| Jobs | `apps/server/src/adapter/job-queue/troop/recruit-progress.ts` |
| HTTP | `apps/server/src/web/handler/troop/` (except `movement/`) |
| Combat (024) | `characteristic.ts` combat stats and roles; `TroopRequirement` + `troop_costs` rows |
| Garrison strategy (024) | `app/command/{city,outpost}/set-combat-strategy.ts`, `web/handler/{city,outpost}/set-combat-strategy.ts`, `core/combat/value/combat-strategy.ts`, `apps/web/src/modules/troop/garrison-strategy/` |
