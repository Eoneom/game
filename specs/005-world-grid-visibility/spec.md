# Slice 005 — World grid and cell visibility

**Status**: As implemented on `main` (brownfield).

## Summary

The world is a fixed `100×100` integer grid of cells generated once at server startup (Perlin-based resource and solar coefficients). Players see a bounded viewport of cells via HTTP. **Terrain type** is always returned for every cell in the viewport. **Resource and solar coefficients** are returned only for cells the requesting player has **explored** (`explored_cell_ids`). The same response includes **all players’ cities and outposts** in the viewport (with owner `player_id` and `faction_code`) so the map shows a populated world. Distance for movement uses Manhattan distance scaled by `10000`.

**Depends on**: player session ([`002`](../002-player-session-auth/spec.md)). **Out of scope**: troop movement, city/outpost placement rules (see [`006`](../006-city-lifecycle-gathering/spec.md), [`010`](../010-troop-movement-combat/spec.md), [`011`](../011-outposts/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/world/cells` | yes | `worldGetCellsHandler` |

**Query parameters**: `min_x`, `max_x`, `min_y`, `max_y` (required integers); optional `detail` (`terrain` | `full`, default `full`).

| `detail` | Cell payload |
| --- | --- |
| `terrain` | `coordinates`, `type`, `explored` only (no `characteristic`) |
| `full` | Same as before: `characteristic` when `explored` |

| Outcome | HTTP | Body |
| --- | --- | --- |
| Missing or non-integer bound | **400** | `{ "status": "nok", "error_code": "world:invalid-bounds" }` |
| Bounds out of range, inverted min/max, or viewport side &gt; `MAX_VIEWPORT_SIDE` (20) | **200** via error middleware | `{ "status": "nok", "error_code": "world:invalid-bounds" }` |
| Success | **200** | `{ "status": "ok", "data": { "viewer", "cells", "settlements" } }` |

**`viewer`**: `{ player_id, faction_code }` for the authenticated player (map styling).

**`cells`**: each entry includes `coordinates` and `type` always; `explored` is `true` when the cell id is in the player’s exploration list. When explored, `characteristic` includes `resource_coefficient` (`plastic`, `mushroom`) and `solar_coefficient` (plasma is not exposed on this endpoint). When not explored, `characteristic` is omitted.

**`settlements`**: `{ cities: [...], outposts: [...] }` for every city/outpost whose cell lies in the bounds. Cities include `id`, `name`, `player_id`, `faction_code`, `coordinates`. Outposts include `id`, `player_id`, `faction_code`, `type` (`temporary` / `permanent`), `coordinates`.

Tests: `apps/server/src/web/handler/world/get-cells.spec.ts`, `apps/server/src/app/query/world/get-cells.spec.ts`.

## Domain rules (`core/world/`)

| Constant / rule | Value / behavior |
| --- | --- |
| `WORLD_SIZE` | `100` (coordinates `1..100`) |
| `MAX_VIEWPORT_SIDE` | `20` cells per axis in one request |
| `INITIAL_VIEWPORT_HALF_EXTENT` | `5` (server bootstrap / empire snapshot; not enforced on HTTP query) |
| `CITY_MAP_INITIAL_HALF_EXTENT` | `3` (web city/outpost world map open + recenter → 7×7 visible) |
| `WorldService.generate()` | One `CellEntity` per coordinate; mushroom/plastic Perlin + solar Perlin; plasma coefficient fixed at `1` in generation |
| `WorldService.getDistance` | `abs(dx) + abs(dy)`, multiplied by `10000` |
| `WorldError` | `world:already-exists`, `world:cell-not-found`, `world:cell-city-mismatch`, `world:cell-outpost-mismatch`, `world:exploration-not-found`, `world:invalid-bounds` |

World generation at boot: `generateWorld()` in `apps/server/src/index.ts`; duplicate world → `world:already-exists` (swallowed at startup). Tests: `apps/server/src/app/command/world/generate.spec.ts`, `apps/server/src/core/world/service.spec.ts`.

Exploration is per `player_id` (`ExplorationEntity`); updated by movement explore saga and signup bootstrap (see movement / signup specs).

## Web UI (`apps/web/src/modules/map/`)

- **Cache**: `cell-cache.ts` merges every `GET /world/cells` response; the map draws cached cells intersecting the logical viewport (`viewportBoundsAround(center, half_extent)`), so HTTP completion does not change pan/zoom framing.
- **Fetch**: `fetchBoundsAround` adds `PREFETCH_MARGIN_CELLS` (2) around the visible window, clamped to server `MAX_VIEWPORT_SIDE`. While navigating (pan/zoom), debounced `detail=terrain` (150ms); `detail=full` on pan release and cell select. Stale responses ignored via generation counter.
- **Pan**: `PAN_PIXEL_TO_CELL_SENSITIVITY` (0.4) damps cells-per-pixel; Konva group offset resets each drag move so terrain stays world-anchored without snapping when tiles arrive.
- **Open / recenter**: `CITY_MAP_INITIAL_HALF_EXTENT` (3). Wheel zoom toward cursor, zoom buttons, recenter to city/outpost home cell.
- Renders terrain on all visible cells; coefficients in the side panel when `explored` and present in cache (`cells.tsx`, `details/index.tsx`, `canvas.tsx`). Settlement markers for all players in view (`markers.tsx`, `legend-overlay.tsx`). Geometry in `geometry.ts` / `helper.ts` / `viewport.ts`.
- Routes under `/city/$cityId/world/...` and outpost world map routes ([`019`](../019-web-shell-routing/spec.md)).

## API client

`packages/api-client/src/endpoints/world/get-cells.ts` — request query types and response cell shape.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/world/{service,helper,perlin,error,constant/size}.ts`, `cell/entity.ts`, `exploration/` |
| Query | `apps/server/src/app/query/world/get-cells.ts` |
| HTTP | `apps/server/src/web/handler/world/get-cells.ts` |
| Web | `apps/web/src/modules/map/` |
