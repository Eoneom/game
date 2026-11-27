# Slice 005 — World grid and cell visibility

**Status**: As implemented on `main` (brownfield).

## Summary

The world is a fixed `100×100` integer grid of cells generated once at server startup (Perlin-based resource and solar coefficients). Players see a bounded viewport of cells via HTTP. **Terrain type** is always returned for every cell in the viewport. **Resource and solar coefficients** are returned only for cells the requesting player has **explored** (`explored_cell_ids`). The same response includes **all players’ cities and outposts** in the viewport (with owner `player_id` and `faction_code`) so the map shows a populated world. Distance for movement uses Manhattan distance scaled by `10000`.

**Depends on**: player session ([`002`](../002-player-session-auth/spec.md)). **Out of scope**: troop movement, city/outpost placement rules (see [`006`](../006-city-lifecycle-gathering/spec.md), [`010`](../010-troop-movement-combat/spec.md), [`011`](../011-outposts/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/world/cells` | yes | `worldGetCellsHandler` |
| `GET` | `/world/terrain` | yes | `worldTerrainHandler` — whole-world terrain string (slice [`044`](../044-world-map-revamp/spec.md)) |
| `GET` | `/world/exploration` | yes | `worldExplorationHandler` — the viewer's explored cells with coefficients (044) |
| `GET` | `/world/markers` | yes | `worldMarkersHandler` — settlements in bounds (side ≤ `MAX_MARKER_VIEWPORT_SIDE` 100) with relation and size (044) |

**Query parameters**: `min_x`, `max_x`, `min_y`, `max_y` (required integers); optional `detail` (`terrain` | `full`, default `full`).

| `detail` | Cell payload |
| --- | --- |
| `terrain` | `coordinates`, `type` (no `characteristic`; `explored` false until a `full` fetch); **`settlements`** in bounds (all players’ cities/outposts). Skips exploration DB read. |
| `full` | Same as before: `characteristic` when `explored`; full `settlements` in bounds |

| Outcome | HTTP | Body |
| --- | --- | --- |
| Missing or non-integer bound | **400** | `{ "status": "nok", "error_code": "world:invalid-bounds" }` |
| Bounds out of range, inverted min/max, or viewport side &gt; `MAX_VIEWPORT_SIDE` (20) | **200** via error middleware | `{ "status": "nok", "error_code": "world:invalid-bounds" }` |
| Success | **200** | `{ "status": "ok", "data": { "viewer", "cells", "settlements" } }` |

**`viewer`**: `{ player_id, faction_code }` for the authenticated player (map styling).

**`cells`**: each entry includes `coordinates` and `type` always; `explored` is `true` when the cell id is in the player’s exploration list. When explored, `characteristic` includes `resource_coefficient` (`plastic`, `mushroom`) and `solar_coefficient` (plasma is not exposed on this endpoint). When not explored, `characteristic` is omitted.

**`settlements`**: `{ cities: [...], outposts: [...] }` for every city/outpost whose cell lies in the bounds. Cities include `id`, `name`, `player_id`, `faction_code`, `coordinates`. Outposts include `id`, `player_id`, `faction_code`, `type` (`temporary` / `permanent`), `coordinates`.

The handler marks explored cells with a `Set` of the explored ids (slice 044; it used to scan the list for each cell). `GET /world/cells` keeps its shape; since slice 044 the web map no longer pages terrain through it (only the send wizard's one-cell destination read, `movement/api/destination.ts`, uses it).

Tests: `apps/server/src/web/handler/world/get-cells.spec.ts`, `apps/server/src/app/query/world/get-cells.spec.ts`.

### Map reads (slice [`044`](../044-world-map-revamp/spec.md))

| Endpoint | Response | Notes |
| --- | --- | --- |
| `GET /world/terrain` | `{ size, terrain }`: `size × size` chars row-major from (1, 1), `f` forest, `r` ruins, `l` lake | `Cache-Control: private, max-age=86400`; the grid is read once and kept in memory (`app/query/world/world-cells.ts`, `WorldCellCache`). Terrain is not secret (every viewport already exposed it). |
| `GET /world/exploration` | `{ cells: [x, y, plastic, mushroom, solar][] }`, coefficients rounded to 2 decimals | Explored cells only (same rule as `characteristic` above). |
| `GET /world/markers?min_x&max_x&min_y&max_y` | `{ viewer: { player_id, faction_code, alliance_id }, cities, outposts }`; each settlement carries `owner_name`, `alliance_tag`, `relation` (`mine` > `ally` > `system` > `faction` > `enemy`, `WorldMarkerService.getRelation`), cities a `size` 1–4 from their total building levels (`CITY_SIZE_LEVEL_THRESHOLDS` 20 / 50 / 80) | Bounds validated like `/world/cells` (`assertWorldBounds`) with a max side of 100. Grouped reads only: `city.listInBounds`, `outpost.listInBounds`, `player.listByIds`, `alliance.listTagsByPlayerIds` (viewer included, for its `alliance_id`), `building.sumLevelsByCityIds`. |

## Domain rules (`core/world/`)

| Constant / rule | Value / behavior |
| --- | --- |
| `WORLD_SIZE` | `100` (coordinates `1..100`) |
| `MAX_VIEWPORT_SIDE` | `20` cells per axis in one request |
| `INITIAL_VIEWPORT_HALF_EXTENT` | `5` (server bootstrap / empire snapshot; not enforced on HTTP query) |
| `MAX_MARKER_VIEWPORT_SIDE` | `100` cells per axis for `GET /world/markers` (slice 044) |
| `CITY_SIZE_LEVEL_THRESHOLDS` | `[20, 50, 80]` (`core/world/constant/marker.ts`, map size hint, slice 044) |
| `WorldService.generate()` | One `CellEntity` per coordinate; mushroom/plastic Perlin + solar Perlin; plasma coefficient fixed at `1` in generation |
| `WorldService.getDistance` | `abs(dx) + abs(dy)`, multiplied by `10000` |
| `WorldError` | `world:already-exists`, `world:cell-not-found`, `world:cell-city-mismatch`, `world:cell-outpost-mismatch`, `world:exploration-not-found`, `world:invalid-bounds` |

World generation at boot: `generateWorld()` in `apps/server/src/index.ts`; duplicate world → `world:already-exists` (swallowed at startup). Tests: `apps/server/src/app/command/world/generate.spec.ts`, `apps/server/src/core/world/service.spec.ts`.

Exploration is per `player_id` (`ExplorationEntity`); updated by movement explore saga and signup bootstrap (see movement / signup specs).

## Web UI (`apps/web/src/modules/map/`)

Rebuilt by slice [`044`](../044-world-map-revamp/spec.md): full-workspace map with 6 zoom levels (7 → 41 rows, `MAP_ZOOM_ROWS`), a minimap, « Aller à » / « Mes emplacements », relation-coloured markers, movement arrows, cell actions opening the send wizard, and the « Bonus de terrain » / « Cibles et menaces » overlays. Terrain comes once from `GET /world/terrain`, exploration from `GET /world/exploration`, markers from `GET /world/markers` (visible range padded by 50 %, debounced 150 ms). The former cell cache, fetch scheduler, `/world/cells` paging and `CITY_MAP_INITIAL_HALF_EXTENT` are removed; the default zoom on open and « Recentrer » is level 3 (15 rows). Routes under `/city/$cityId/world/map` and `/outpost/$outpostId/world/map` ([`019`](../019-web-shell-routing/spec.md)) take `?x=&y=&zoom=&layers=`.

## API client

`packages/api-client/src/endpoints/world/get-cells.ts` — request query types and response cell shape. Slice 044: `endpoints/world/{terrain,exploration,markers}.ts` and `client.world.getTerrain` / `getExploration` / `getMarkers`.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/world/{service,helper,perlin,error,constant/size}.ts`, `cell/entity.ts`, `exploration/` |
| Query | `apps/server/src/app/query/world/get-cells.ts`; slice 044: `app/query/world/{world-cells,bounds,terrain,exploration,markers,settlements}.ts` (+ `map-queries.spec.ts`), `core/world/{marker,constant/marker}.ts` |
| HTTP | `apps/server/src/web/handler/world/get-cells.ts`; slice 044: `web/handler/world/{terrain,exploration,markers,query-number}.ts` (+ `map-handlers.spec.ts`) |
| Web | `apps/web/src/modules/map/` |
