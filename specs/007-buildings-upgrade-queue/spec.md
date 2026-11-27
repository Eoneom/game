# Slice 007 — Buildings and upgrade queue

**Status**: As implemented on `main` (brownfield).

## Summary

Each city owns one row per `BuildingCode`. On bootstrap (`BuildingService.init`), `mushroom_farm`, `recycling_plant`, and `solar_panel` start at **level 1**; all other codes start at **level 0**. Players **upgrade** buildings (resource cost + duration), with at most one active pg-boss finish job per city and a **queued** list of pending upgrades. Upgrades affect earnings, energy, and warehouse capacity via `BuildingService`. Pricing uses `PricingService.getBuildingLevelCost` (architecture technology reduces duration). Completion runs `finishBuildingUpgrade` and emits `building:upgrade-finished`.

**Depends on**: city ownership ([`006`](../006-city-lifecycle-gathering/spec.md)), requirements/pricing ([`014`](../014-requirements-pricing/spec.md)), resources ([`015`](../015-resources-model/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/city/:city_id/building` | yes | `buildingListHandler` |
| `GET` | `/city/:city_id/building/:building_code` | yes | `buildingGetHandler` |
| `PUT` | `/building/upgrade` | yes | `buildingUpgradeHandler` |
| `PUT` | `/building/cancel` | yes | `buildingCancelHandler` (in-progress) |
| `PUT` | `/building/queue/cancel` | yes | `buildingCancelQueuedHandler` |

Missing `city_id` or `building_code` on upgrade → **400** + `RequestError` (`city_id:not-found`, `building_code:not-found`). Domain failures → `BuildingError` / `CityError` / `RequirementError` via middleware.

| `BuildingError` | Meaning |
| --- | --- |
| `building:not-found` | Unknown building |
| `building:already-in-progress` | Active upgrade job exists |
| `building:not-in-progress` | Cancel when nothing running |
| `building:queue-full` | Queue length cap |
| `building:queue-item-not-found` | Unknown queue id |

**List entries** ([`043`](../043-catalogue-card-grids/spec.md)): each entry of `GET /city/:city_id/building` carries `upgrade_cost` (`{ plastic, mushroom, plasma, duration }` of level + 1, same inputs and values as `GET /city/:city_id/building/:building_code`) and `requirement`; `upgrade_queue` rows carry `duration_seconds`, `start_at` and `finish_at` (the mapper used to drop them).

Tests: `apps/server/src/web/handler/building/*.spec.ts`, `apps/server/src/app/command/building/*.spec.ts`, `apps/server/src/core/building/service.spec.ts`.

## Background jobs

| Queue | Handler command |
| --- | --- |
| `building.upgrade.finish` | `finishBuildingUpgrade` (uses job `startAfter` as `upgraded_at`) |

Scheduling/cancel: `adapter/job-queue/building/finish-upgrade.ts`.

## Domain highlights

- `BuildingService.init({ city_id })` creates all codes; `getBuildingInitialLevel` sets mushroom farm, recycling plant, and solar panel to level 1 (`core/building/constant/initial-level.ts`).
- Solar panel level 1 `base` energy is **80** so supply covers mushroom + recycling consumption (20+20 each) at the minimum cell `solar_coefficient` (**0.5**).
- Production buildings (`MUSHROOM_FARM`, `RECYCLING_PLANT`, `CENTRAL_INDUCTOR`, `WATER_PURIFIER`) earnings scale with cell coefficients (fixed 1 for plasma and water) and `gameTimeScale`.
- Energy consumption/supply helpers for UI warnings (`getEnergyConsumption`, `getProductionEnergyRatio`, etc.).
- Display order: `building_order` constant.
- Slice [`028`](../028-command-center-shelter/spec.md) adds `command_center` (non-production energy consumer, `architecture` 2; each level raises the player movement cap and level ≥ 1 unlocks a recruitment queue in the city) and `underground_shelter` (no energy; shelters a fixed amount of each resource from loot, `BuildingService.getShelteredResources`). Both start at level 0 and use this upgrade queue; existing cities got level-0 rows in migration `00011_command_center_shelter`.
- Slice [`029`](../029-city-defenses/spec.md) adds `city_wall` (**Enceinte**, no energy, `architecture` 2): it uses this upgrade queue but is **excluded** from the city's building level cap (`building.getTotalLevels` skips it, so it is not in `building_levels_used`, and `startBuildingUpgrade` lets it start in a full city). It gives `20 × level` defense points and shortens defense build times. The web building list hides it (shown in the **Défense** tab). Existing cities got a level-0 row in migration `00012_city_defenses`.
- Slice [`035`](../035-faction-exchange/spec.md) (part 1) adds `water_purifier` (**Purificateur d'eau**, production building: 0.05 water/s ×1.15 per level, energy 40 ×1.25, `architecture` 3, no Économie technology bonus) and `trading_post` (**Comptoir d'échange**, no energy, `architecture` 2; it will gate the faction exchange orders). Both start at level 0, use this upgrade queue and count toward the building level cap; system players never build them. Existing cities got level-0 rows in migration `00017_water`.

## Web UI

`apps/web/src/modules/building/` — list, details, upgrade UI, metadata (production, consumption, warehouse), `ws-listener` on `building:upgrade-finished` and `building:queue-item-dropped` (toast). Since [`043`](../043-catalogue-card-grids/spec.md) the list is a card grid grouped by **family** (`modules/building/family.ts`: Production, Stockage, Militaire, Spécial) with the next cost and a state badge per card, and the selection lives in `?code=`.

## API client

`packages/api-client/src/endpoints/building/`.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/building/` |
| Commands | `apps/server/src/app/command/building/` |
| Queries | `apps/server/src/app/query/building/` |
| Jobs | `apps/server/src/adapter/job-queue/building/` |
| HTTP | `apps/server/src/web/handler/building/` |
