# Slice 006 — City lifecycle and passive gathering

**Status**: As implemented on `main` (brownfield).

## Summary

Players own **cities** anchored to world cells. Signup creates the first city; additional cities are founded via **settle** (settler troop on an explored cell). **Passive gathering** accrues plastic/mushroom/plasma into per-cell resource stock on a recurring pg-boss job, capped by warehouse capacity. Successful gather emits `city:resources-gathered` on the app event bus (WebSocket fan-out in [`017`](../017-realtime-websocket/spec.md)).

**Depends on**: world grid ([`005`](../005-world-grid-visibility/spec.md)), resources ([`015`](../015-resources-model/spec.md)), buildings for earnings/capacity ([`007`](../007-buildings-upgrade-queue/spec.md)). **Out of scope**: building upgrades, troop recruitment (other slices).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/city` | yes | `cityListHandler` |
| `GET` | `/city/:city_id` | yes | `cityGetHandler` |
| `POST` | `/city` | yes | `citySettleHandler` |

Handler validation uses `RequestError` for missing ids/names where applicable (`city_id:not-found`, etc.).

**Settle** (`POST /city`): body includes `name`, `cell_id` (and related fields per api-client). Command-level errors (ownership, limits, settler, outpost conflicts) surface as `CityError` via error middleware → HTTP **200** + `status: nok`.

| `CityError` | When (from `core/city/error.ts` + tests) |
| --- | --- |
| `city:already-exists` | Cell already has a city |
| `city:not-found` | Unknown city |
| `city:not-enough-resources` | Insufficient stock for an action requiring payment |
| `city:not-enough-space` | Building level cap on main cell |
| `city:not-owner` | Player does not own city |
| `city:limit-reached` | `CITY_COUNT_LIMIT` exceeded |
| `city:no-settler-available` | No settler stack on target cell |
| `city:cannot-settle-on-permanent-outpost` | Permanent outpost blocks settle |

Tests: `apps/server/src/web/handler/city/{list,get,settle}.spec.ts`, `apps/server/src/app/command/city/settle.spec.ts`, `apps/server/src/app/command/city/gather.spec.ts`, `apps/server/src/app/query/city/*.spec.ts`.

## Background jobs

| Queue | Worker | Behavior |
| --- | --- | --- |
| `city.resources.gather` | `progressGatherAllCities` | For each city, runs `cityGather`; reschedules self on `CITY_RESOURCES_GATHER_INTERVAL_MS` |

Boot: `index.ts` calls `ensureCityResourcesGatherScheduled`. Worker registration: `adapter/job-queue/register-workers.ts`.

`cityGather` loads city, cell, resource stock; computes earnings via `AppService.getCityEarningsBySecond`; applies `ResourcesService.gatherResourceStock`; persists stock; emits `AppEvent.CityResourcesGathered` when stock changes.

## Domain rules

| Rule | Source |
| --- | --- |
| City count limit | `CityService.getCountLimit()` → `CITY_COUNT_LIMIT` |
| Main cell max building levels | `CityService.getMaximumBuildingLevels()` → `MAIN_CITY_CELL_BUILDING_COUNT` |
| New city entity | `CityService.settle` / `CityEntity.initCity` |
| Starting stock on first city cell | `ResourcesService.firstCityCanonicalResourceStockState` |

## Web UI

`apps/web/src/modules/city/` — city page, hooks, `ws-listener` for gather events; `city/root.tsx` for city-scoped layout. World map (`apps/web/src/modules/map/`) lists every city in the viewport via `GET /world/cells` `settlements.cities` (name label; faction-colored marker).

## API client

`packages/api-client` endpoints under `endpoints/city/`.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/city/` |
| Commands | `apps/server/src/app/command/city/{gather,settle,progress-gather-all}.ts` |
| Queries | `apps/server/src/app/query/city/` |
| Jobs | `apps/server/src/adapter/job-queue/city/gather.ts` |
| HTTP | `apps/server/src/web/handler/city/` |
