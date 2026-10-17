# Slice 007 — Buildings and upgrade queue

**Status**: As implemented on `main` (brownfield).

## Summary

Each city owns one row per `BuildingCode` (level `0` initially). Players **upgrade** buildings (resource cost + duration), with at most one active pg-boss finish job per city and a **queued** list of pending upgrades. Upgrades affect earnings, energy, and warehouse capacity via `BuildingService`. Pricing uses `PricingService.getBuildingLevelCost` (architecture technology reduces duration). Completion runs `finishBuildingUpgrade` and emits `building:upgrade-finished`.

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

Tests: `apps/server/src/web/handler/building/*.spec.ts`, `apps/server/src/app/command/building/*.spec.ts`, `apps/server/src/core/building/service.spec.ts`.

## Background jobs

| Queue | Handler command |
| --- | --- |
| `building.upgrade.finish` | `finishBuildingUpgrade` (uses job `startAfter` as `upgraded_at`) |

Scheduling/cancel: `adapter/job-queue/building/finish-upgrade.ts`.

## Domain highlights

- `BuildingService.init({ city_id })` creates all codes at level 0.
- Production buildings (`MUSHROOM_FARM`, `RECYCLING_PLANT`, `CENTRAL_INDUCTOR`) earnings scale with cell coefficients and `gameTimeScale`.
- Energy consumption/supply helpers for UI warnings (`getEnergyConsumption`, `getProductionEnergyRatio`, etc.).
- Display order: `building_order` constant.

## Web UI

`apps/web/src/modules/building/` — list, details, upgrade UI, metadata (production, consumption, warehouse), `ws-listener` on `building:upgrade-finished`.

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
