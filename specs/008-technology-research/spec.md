# Slice 008 — Technology research (including queue)

**Status**: As implemented on `main` (brownfield). Merges former slices **008** (research) and **023** (research queue).

## Summary

Per-player **technologies** (levels per `TechnologyCode`) are researched from a city’s research lab. Starting research deducts resources, enforces requirements, and schedules `technology.research.finish`. When research is already active, further requests **enqueue** (see [Research queue](#research-queue) below). Cancel in-progress research refunds 50% and advances the queue. Finish increments level and emits `technology:research-finished`.

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

## Research queue

Player-wide **FIFO research queue** mirroring the city building upgrade queue ([`007`](../007-buildings-upgrade-queue/spec.md)): one active `technology.research.finish` job per player, up to **3** waiting rows, pay on start, cancel active with **50% refund**, cancel queued for free. No `technology:already-in-progress` when queue has room — **enqueue** instead.

When a **queued** building or research row is **dropped** at start, notify the player (toast via WebSocket).

### Decisions

| Topic | Decision |
| --- | --- |
| Scope | **Per player** (technologies are account-wide) |
| Capacity | **3** waiting slots + 1 active (`RESEARCH_QUEUE_LIMIT` = `BUILDING_UPGRADE_QUEUE_LIMIT`) |
| Payment | **On start** only (queue rows are free) |
| Row data | `technology_code` + **`city_id`** (stock + research lab level at start) |
| Cancel active | **50% refund** to that job’s city stock (align buildings) |
| Cancel queued | Remove row, no refund |
| Order | **FIFO** by `created_at`, no reorder |
| Queue contents | Duplicates allowed; invalid at start → **drop + try next** |
| Enqueue validation | **Loose** (ownership, capacity, technology exists); full checks at **start** |
| UI | Queued rows show **city name** + tech → target level |
| Drop notification | **Toast per dropped** queued item (research **and** buildings) |
| System AI | **Enqueue** when research running; respect pending queue in policy (like buildings) |

### Data model

Table `technology_research_queue` (mirror `building_upgrade_queue`): `id`, `player_id`, `city_id`, `technology_code`, `created_at`. Index: `(player_id, created_at)`.

### Queue commands

| Command | Behaviour |
| --- | --- |
| `researchTechnology` | If no pending job → `startTechnologyResearch`; else `enqueueTechnologyResearch` |
| `startTechnologyResearch` | Pay, schedule job |
| `enqueueTechnologyResearch` | Insert queue row (loose checks) |
| `processTechnologyResearchQueue` | After finish/cancel: pop head, try start; on skippable failure **emit drop event** and continue |
| `cancelTechnologyResearch` | Cancel job + **50% refund** + `processTechnologyResearchQueue` |
| `cancelQueuedTechnologyResearch` | Delete queue row by id |

### Queue HTTP / queries

| Method | Path | Notes |
| --- | --- | --- |
| `PUT` | `/technology/research` | Starts or enqueues |
| `PUT` | `/technology/cancel` | Active cancel + refund |
| `PUT` | `/technology/queue/cancel` | `queue_item_id` |

`TechnologyListQuery` adds `research_queue`: `{ id, technology_code, city_id, city_name? }[]` FIFO.

### Queue WebSocket

| Event | When |
| --- | --- |
| `technology:research-finished` | Existing |
| `technology:queue-item-dropped` | Queued research removed at start |
| `building:queue-item-dropped` | Queued building removed at start |

### Queue web UI

`apps/web/src/modules/technology/list/` — depth `n/3`, active research, queued items with city name and cancel; mirror building queue panel.

### Queue errors

| Code | Meaning |
| --- | --- |
| `technology:queue-full` | Queue cap |
| `technology:queue-item-not-found` | Cancel unknown id |

Queue tests mirror `apps/server/src/app/command/technology/` and building queue specs. Depends also on [`014`](../014-requirements-pricing/spec.md), [`016`](../016-system-controlled-players/spec.md).
