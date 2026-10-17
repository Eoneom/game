# Slice 023 — Technology research queue

**Status**: As implemented on `main` (brownfield).

## Summary

Extend player-wide technology research with a **FIFO research queue** mirroring the city building upgrade queue ([`007`](../007-buildings-upgrade-queue/spec.md)): one active `technology.research.finish` job per player, up to **3** waiting rows, pay on start, cancel active with **50% refund**, cancel queued for free. Update [`008`](../008-technology-research/spec.md) behaviour (no more `technology:already-in-progress` when queue has room — enqueue instead).

Also: when a **queued** building or research row is **dropped** at start, notify the player (toast via WebSocket); today drops are silent.

## Decisions (interview)

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

## Data model

New table `technology_research_queue` (mirror `building_upgrade_queue`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `player_id` | uuid | FK player |
| `city_id` | uuid | Paying city / lab |
| `technology_code` | text | Enum `TechnologyCode` |
| `created_at` | timestamptz | FIFO |

Index: `(player_id, created_at)`.

## Commands

| Command | Behaviour |
| --- | --- |
| `researchTechnology` | If no pending job → `startTechnologyResearch`; else `enqueueTechnologyResearch` |
| `startTechnologyResearch` | Current `researchTechnology` body (pay, schedule job) |
| `enqueueTechnologyResearch` | Insert queue row (loose checks) |
| `processTechnologyResearchQueue` | After finish/cancel/stuck recovery: while queue non-empty, pop head, try start; on skippable failure **emit drop event** and continue |
| `cancelTechnology` | Cancel job + **50% refund** (new `PricingService.getTechnologyResearchRefund`) + `processTechnologyResearchQueue` |
| `cancelQueuedTechnologyResearch` | Delete queue row by id |

Skippable start errors: align building queue (`NOT_ENOUGH_RESOURCES`, requirement errors, invalid city/lab, etc.).

## HTTP

| Method | Path | Notes |
| --- | --- | --- |
| `PUT` | `/technology/research` | Unchanged body; starts or enqueues |
| `PUT` | `/technology/cancel` | Active cancel + refund |
| `PUT` | `/technology/queue/cancel` | `queue_item_id` (mirror `/building/queue/cancel`) |

## Queries

`TechnologyListQuery` returns:

- `technologies` (unchanged)
- `research_queue`: `{ id, technology_code, city_id, city_name? }[]` ordered FIFO

Project target level at display: `technology.level + 1` (+ offset for position in queue if same code queued multiple times — mirror `projectUpgradeQueueLevels` for buildings).

## WebSocket

| Event | When |
| --- | --- |
| `technology:research-finished` | Existing |
| `technology:queue-item-dropped` | Queued research removed at start (payload: `technology_code`, `city_id`, `error_code`) |
| `building:queue-item-dropped` | Queued building removed at start (payload: `building_code`, `city_id`, `error_code`) |

Web client: toast translated `error_code` (or dedicated drop message).

## Web UI

`apps/web/src/modules/technology/list/` — mirror building list queue panel:

- Depth `n/3`
- Active research (existing)
- Queued items with thumb, tech name, **city name**, target level, cancel per row
- Enqueue affordance when active + queue not full (mirror building upgrade button)

## API client

Extend `packages/api-client` technology endpoints + types.

## System player

- `tryResearch`: allow enqueue when `hasPendingTechnologyResearch` OR queue not full; skip tech already in queue or researching (extend `pending-upgrades` pattern for research queue).
- Do not return null solely because research is in progress if queue has capacity.

## Errors

| Code | Meaning |
| --- | --- |
| `technology:queue-full` | Queue cap |
| `technology:queue-item-not-found` | Cancel unknown id |
| Remove or repurpose `technology:already-in-progress` | Replaced by enqueue when queue allows |

## Tests

Mirror coverage in `apps/server/src/app/command/technology/` and `building/start-upgrade` queue tests; handler specs; web hooks optional.

## Depends on

[`007`](../007-buildings-upgrade-queue/spec.md), [`008`](../008-technology-research/spec.md), [`014`](../014-requirements-pricing/spec.md), [`016`](../016-system-controlled-players/spec.md).
