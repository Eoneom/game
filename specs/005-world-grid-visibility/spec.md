# Slice 005 — World grid and cell visibility

**Status**: As implemented on `main` (brownfield).

## Summary

The world is a fixed `100×100` integer grid of cells generated once at server startup (Perlin-based resource and solar coefficients). Players see a bounded viewport of cells via HTTP; **exploration** determines whether cell **characteristics** (type, coefficients) are returned or omitted. Distance for movement uses Manhattan distance scaled by `10000`.

**Depends on**: player session ([`002`](../002-player-session-auth/spec.md)). **Out of scope**: troop movement, city/outpost placement rules (see [`006`](../006-city-lifecycle-gathering/spec.md), [`010`](../010-troop-movement-combat/spec.md), [`011`](../011-outposts/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/world/cells` | yes | `worldGetCellsHandler` |

**Query parameters** (all required integers): `min_x`, `max_x`, `min_y`, `max_y`.

| Outcome | HTTP | Body |
| --- | --- | --- |
| Missing or non-integer bound | **400** | `{ "status": "nok", "error_code": "world:invalid-bounds" }` |
| Bounds out of range, inverted min/max, or viewport side &gt; `MAX_VIEWPORT_SIDE` (20) | **200** via error middleware | `{ "status": "nok", "error_code": "world:invalid-bounds" }` |
| Success | **200** | `{ "status": "ok", "data": { "cells": [...] } }` |

Each cell in the response includes `coordinates` always; `characteristic` is present only when the cell id is in the player’s `explored_cell_ids` (otherwise omitted / `undefined` on wire). Explored cells expose `type`, `resource_coefficient` (`plastic`, `mushroom`), and `solar_coefficient` (plasma is not exposed on this endpoint).

Tests: `apps/server/src/web/handler/world/get-cells.spec.ts`, `apps/server/src/app/query/world/get-cells.spec.ts`.

## Domain rules (`core/world/`)

| Constant / rule | Value / behavior |
| --- | --- |
| `WORLD_SIZE` | `100` (coordinates `1..100`) |
| `MAX_VIEWPORT_SIDE` | `20` cells per axis in one request |
| `INITIAL_VIEWPORT_HALF_EXTENT` | `5` (used in bootstrap / web, not enforced on server query) |
| `WorldService.generate()` | One `CellEntity` per coordinate; mushroom/plastic Perlin + solar Perlin; plasma coefficient fixed at `1` in generation |
| `WorldService.getDistance` | `abs(dx) + abs(dy)`, multiplied by `10000` |
| `WorldError` | `world:already-exists`, `world:cell-not-found`, `world:cell-city-mismatch`, `world:cell-outpost-mismatch`, `world:exploration-not-found`, `world:invalid-bounds` |

World generation at boot: `generateWorld()` in `apps/server/src/index.ts`; duplicate world → `world:already-exists` (swallowed at startup). Tests: `apps/server/src/app/command/world/generate.spec.ts`, `apps/server/src/core/world/service.spec.ts`.

Exploration is per `player_id` (`ExplorationEntity`); updated by movement explore saga and signup bootstrap (see movement / signup specs).

## Web UI (`apps/web/src/modules/map/`)

- Fetches cells via `modules/map/api/cells.ts` and `hook/world.ts` with viewport bounds from map pan/zoom.
- Renders explored vs unexplored cells (`cells.tsx`, `canvas.tsx`); geometry helpers in `geometry.ts` / `helper.ts`.
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
