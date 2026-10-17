# Slice 008 — Technology research

**Status**: As implemented on `main` (brownfield).

## Summary

Per-player **technologies** (levels per `TechnologyCode`) are researched from a city’s research lab. Starting research deducts resources, enforces requirements, and schedules `technology.research.finish`. When research is already active, further requests **enqueue** (see [`023`](../023-technology-research-queue/spec.md)). Cancel in-progress research refunds 50% and advances the queue. Finish increments level and emits `technology:research-finished`.

**Depends on**: city/buildings ([`006`](../006-city-lifecycle-gathering/spec.md), [`007`](../007-buildings-upgrade-queue/spec.md)), requirements/pricing ([`014`](../014-requirements-pricing/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/technology` | yes | `technologyListHandler` |
| `GET` | `/city/:city_id/technology/:technology_code` | yes | `technologyGetHandler` |
| `PUT` | `/technology/research` | yes | `technologyResearchHandler` |
| `PUT` | `/technology/cancel` | yes | `technologyCancelHandler` |
| `PUT` | `/technology/queue/cancel` | yes | `technologyCancelQueuedHandler` |

| `TechnologyError` | Meaning |
| --- | --- |
| `technology:not-found` | Unknown technology |
| `technology:not-in-progress` | Cancel when idle |
| `technology:queue-full` | Queue length cap |
| `technology:queue-item-not-found` | Unknown queue id |

Tests: `apps/server/src/web/handler/technology/*.spec.ts`, `apps/server/src/app/command/technology/*.spec.ts`, `apps/server/src/app/query/technology/*.spec.ts`.

## Background jobs

| Queue | Command |
| --- | --- |
| `technology.research.finish` | `finishTechnologyResearch` |

Job adapter: `adapter/job-queue/technology/finish-research.ts`.

Duration/cost: `PricingService.getTechnologyLevelCost` (research lab level reduces duration; `RESEARCH_LABEL_REDUCTION_PER_LEVEL` in constants).

## Web UI

`apps/web/src/modules/technology/` — page, list items, `ws-listener` for research finish.

## API client

`packages/api-client/src/endpoints/technology/`.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/technology/` |
| Commands | `apps/server/src/app/command/technology/` |
| Queries | `apps/server/src/app/query/technology/` |
| Jobs | `apps/server/src/adapter/job-queue/technology/` |
| HTTP | `apps/server/src/web/handler/technology/` |
