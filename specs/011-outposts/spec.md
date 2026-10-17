# Slice 011 — Outposts

**Status**: As implemented on `main` (brownfield).

## Summary

**Outposts** are player-owned map locations on cells (`OutpostType` temporary vs permanent). Created via movement/base saga; permanent conversion via API. Temporary outposts can be removed when superseded; permanent outposts gather resources on a dedicated job. Warehouse capacity scales with logistics technology via `OutpostService.getWarehousesCapacity`.

**Depends on**: movement ([`010`](../010-troop-movement-combat/spec.md)), resources ([`015`](../015-resources-model/spec.md)), world cells ([`005`](../005-world-grid-visibility/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/outpost` | yes | `outpostListHandler` |
| `GET` | `/outpost/:outpost_id` | yes | `outpostGetHandler` |
| `PUT` | `/outpost/permanent` | yes | `outpostSetPermanentHandler` |

Missing `outpost_id` where required → **400** + `outpost_id:not-found` (`RequestError`).

| `OutpostError` | Meaning |
| --- | --- |
| `outpost:not-found` | Unknown outpost |
| `outpost:not-owner` | Wrong player |
| `outpost:limit-reached` | `OUTPOST_COUNT_LIMIT` |

Tests: `apps/server/src/web/handler/outpost/*.spec.ts`, `apps/server/src/app/command/outpost/*.spec.ts`, `apps/server/src/core/outpost/service.spec.ts`.

## Background jobs

| Queue | Command |
| --- | --- |
| `outpost.resources.gather` | `progressGatherAllPermanentOutposts` |

Boot: `ensureOutpostResourcesGatherScheduled` in `index.ts`. Gather success emits `outpost:resources-gathered`; outpost deletion emits `outpost:deleted` (see event bus).

## Domain

- `OutpostService.shouldBuildTemporaryOutpost` when neither city nor outpost exists on cell.
- `OutpostService.isLimitReached` uses `OUTPOST_COUNT_LIMIT`.

## Web UI

`apps/web/src/modules/outpost/` — page, hooks, `ws-listener` for created/deleted/gather events.

## API client

`packages/api-client/src/endpoints/outpost/`.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/outpost/` |
| Commands | `apps/server/src/app/command/outpost/` |
| Queries | `apps/server/src/app/query/outpost/` |
| Jobs | `apps/server/src/adapter/job-queue/outpost/gather.ts` |
| HTTP | `apps/server/src/web/handler/outpost/` |
