# Slice 008 — Technology research (including queue)

**Status**: As implemented on `main` (brownfield). Merges former slices **008** (research) and **023** (research queue).

## Summary

Per-player **technologies** (levels per `TechnologyCode`) are researched from a city’s research lab. Starting research deducts resources, enforces requirements, and schedules `technology.research.finish`. When research is already active, further requests **enqueue** (see [Research queue](#research-queue) below). Cancel in-progress research refunds 50% and advances the queue. Finish increments level and emits `technology:research-finished`.

**Depends on**: city/buildings ([`006`](../006-city-lifecycle-gathering/spec.md), [`007`](../007-buildings-upgrade-queue/spec.md)), requirements/pricing ([`014`](../014-requirements-pricing/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/technology[?city_id=]` | yes | `technologyListHandler` |
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

**List entries** ([`043`](../043-catalogue-card-grids/spec.md)): every entry carries `requirement` (level-scaled requirement of level + 1, as the details query); with `?city_id=` entries also carry `research_cost` (level + 1 priced with that city's research lab, same values as `GET /city/:city_id/technology/:technology_code`) and a city of another player answers `city:not-owner`.

Tests: `apps/server/src/web/handler/technology/*.spec.ts`, `apps/server/src/app/command/technology/*.spec.ts`, `apps/server/src/app/query/technology/*.spec.ts`.

## Background jobs

| Queue | Command |
| --- | --- |
| `technology.research.finish` | `finishTechnologyResearch` |

Job adapter: `adapter/job-queue/technology/finish-research.ts`.

Duration/cost: `PricingService.getTechnologyLevelCost` (research lab level reduces duration; `RESEARCH_LABEL_REDUCTION_PER_LEVEL` in constants).

## Web UI

`apps/web/src/modules/technology/` — page, list items, `ws-listener` for research finish. The list is grouped by branch (**Fondations**, **Arsenal**, **Économie**) via the web constant `technology_branch` (`modules/technology/branch.ts`); plasma costs render through `Cost` ([`026`](../026-plasma-economy/spec.md)). Since [`043`](../043-catalogue-card-grids/spec.md) the list is a card grid (`ui/catalogue/`) fed by `useListTechnologies({ cityId })` (query key `['technologies', cityId]`), with the selection in `?code=`.

## API client

`packages/api-client/src/endpoints/technology/`.

## Technology catalog (v1)

| `TechnologyCode` | Research lab | Technology prereqs | Effect (per level) |
| --- | --- | --- | --- |
| `architecture` | 1 | — | Building unlocks; −10% build time |
| `replication_catalyst` | 5 | — | +10% troop recruit speed |
| `outpost_logistics` | 3 | — | +40% outpost warehouse capacity |
| `outpost_expansion` | 4 | `outpost_logistics` 1 | +5 max outposts (base 15; L1 → 20, L2 → 25, …) |
| `photovoltaic_optimization` | 6 | — | +15% solar panel energy |

The table above is the **Fondations** branch. Slice [`027`](../027-military-economy-technologies/spec.md) adds two branches (7 codes, linear bonus `1 + per_level × level`, no cap):

| Branch | `TechnologyCode` | Buildings | Technology prereqs | Effect (per level) |
| --- | --- | --- | --- | --- |
| Arsenal | `ballistic_alloys` | `research_lab` 5, `central_inductor` 1 | — | +3% attack (`combat` role) |
| Arsenal | `organic_plating` | `research_lab` 5, `central_inductor` 1 | — | +3% life (`combat` role) |
| Arsenal | `tactical_propulsion` | `research_lab` 6, `central_inductor` 2 | — | +4% speed (`combat` role) |
| Économie | `advanced_recycling` | `research_lab` 3 | — | +5% plastic production |
| Économie | `agronomy` | `research_lab` 3 | — | +5% mushroom production |
| Économie | `storage_compression` | `research_lab` 4 | `architecture` 3 | +10% city warehouse capacity |
| Économie | `plasma_containment` | `research_lab` 5, `central_inductor` 3 | — | +5% plasma production |

Arsenal costs plasma from level 1; Économie costs plastic and mushroom only. Per-level bonuses: `technology_bonus_per_level` (`core/technology/constant/bonus.ts`); migration `00010_military_economy_technologies` backfills existing players.

Slice [`029`](../029-city-defenses/spec.md) adds **Fortification** (`fortification`, branch Arsenal): `research_lab` 5, `central_inductor` 1; +3 % attack and life of city defenses per level (snapshotted at battle start as `defender_modifiers.fortification`); costs plastic 7000 / 1.7, mushroom 7000 / 1.7, plasma 400 / 1.7, duration 180 / 2. It unlocks turrets (1), shield generators (2) and plasma batteries (3). Migration `00012_city_defenses` backfills existing players at level 0.

Slice [`030`](../030-intelligence/spec.md) adds the **Renseignement** branch: **Espionnage** (`espionage`) and **Détection** (`detection`), both `research_lab` 3, no technology prerequisite, plastic 3000 / 1.7, mushroom 3000 / 1.7, duration 120 / 2, no plasma, no level cap. Espionnage unlocks the `spy` movement action ([`010`](../010-troop-movement-combat/spec.md)); Détection reveals incoming attacks (`GET /troop/movement/incoming`); the gap between the two drives spy odds and report detail. Migration `00013_intelligence` backfills existing players at level 0.

Costs/durations: `technology_costs` in `apps/server/src/core/pricing/constant/technology.ts` (`outpost_expansion` mirrors `outpost_logistics`). Bootstrap (`TechnologyService.init`) creates every code at level 0; migration `00008_outpost_expansion_technology` backfills existing players.

French UI: `apps/web/src/modules/technology/translations.ts` — **Expansion des avant-postes**, effect **+5 avant-postes max par niveau (base 15)**.

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
