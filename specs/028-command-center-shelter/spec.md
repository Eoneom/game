# Slice 028 — Command center and underground shelter

**Status**: Implemented on `main` (slice 028): `command_center` and `underground_shelter` buildings, player-wide movement cap (`GET /troop/movement/capacity`), per-city recruitment queue, sheltered loot, system AI movement budget, migration `00011_command_center_shelter`.

## Summary

Two new city buildings ([`007`](../007-buildings-upgrade-queue/spec.md)):

- **Centre de commandement** (`command_center`) — introduces a **player-wide cap on simultaneous troop movements**, raised by every command center level in every city, and unlocks a **troop recruitment queue** in its city.
- **Abri souterrain** (`underground_shelter`) — shelters a **fixed amount** of each resource from **loot** ([`024`](../024-player-combat-pvp/spec.md), [`026`](../026-plasma-economy/spec.md)).

System players are **subject to the movement cap**, so the AI planner learns to budget movements and build command centers. Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`007`](../007-buildings-upgrade-queue/spec.md), [`009`](../009-troops-stationary/spec.md) (recruitment), [`010`](../010-troop-movement-combat/spec.md) (movements), [`014`](../014-requirements-pricing/spec.md), [`016`](../016-system-controlled-players/spec.md), [`024`](../024-player-combat-pvp/spec.md), [`026`](../026-plasma-economy/spec.md) (loot ratios).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Movement cap** | `5 + Σ command_center level over all the player's cities`. |
| **What counts** | Every movement row owned by the player (all actions: `explore`, `base`, `transport`, `attack`). |
| **System players** | **Subject to the cap** — the planner is adapted. |
| **Recruitment queue** | A city with `command_center` ≥ 1 gets **3 waiting slots** (fixed; higher levels only raise the movement cap). Level 0 keeps today's behavior: one batch at a time, no queue. |
| **Shelter** | Each level shelters a **fixed amount** of plastic, mushroom and plasma. Loot ratios (50 % / 50 % / 25 %) apply to the **unsheltered** remainder only. |

## Buildings

### Catalogue

| Enum member | Wire code | FR name (UI) | Energy consumption |
| --- | --- | --- | --- |
| `COMMAND_CENTER` | `command_center` | **Centre de commandement** | `base` 30, `multiplier` 1.2 |
| `UNDERGROUND_SHELTER` | `underground_shelter` | **Abri souterrain** | none |

Both start at level 0, count toward the city's building level cap (`MAIN_CITY_CELL_BUILDING_COUNT` = 100), and use the regular upgrade queue. French descriptions and artwork at implementation; placeholder art is acceptable for the first merge if tracked in tasks.

### Requirements ([`014`](../014-requirements-pricing/spec.md))

| Code | Buildings | Technologies |
| --- | --- | --- |
| `command_center` | — | `architecture` 2 |
| `underground_shelter` | — | — |

### Costs (initial values, `base` / `multiplier`)

| Code | Plastic | Mushroom | Plasma | Duration (s) |
| --- | --- | --- | --- | --- |
| `command_center` | 2000 / 1.8 | 1500 / 1.8 | — | 180 / 1.7 |
| `underground_shelter` | 600 / 1.7 | 600 / 1.7 | — | 60 / 1.6 |

## Movement cap

### Rule

```
movement_limit(player) = MOVEMENT_BASE_LIMIT + Σ_city level(command_center)
MOVEMENT_BASE_LIMIT = 5
```

`movement_count(player)` = number of `movement` rows with that `player_id`.

### Where it is enforced

| Path | Check |
| --- | --- |
| `POST /troop/movement` (`createMovement`, every action) | Reject with **`troop:movement:limit-reached`** when `movement_count ≥ movement_limit`. |
| Rebase (`command/troop/movement/rebase.ts`) | Same check. |
| Automatic movements: return trips (`movement/shared.ts`, explore/transport return), attack retreat | **Never blocked.** They replace the inbound movement, so the count does not grow. |

- The check runs inside the same command as the insert. The repository adds `movement.countByPlayer({ player_id })`.
- Losing a city lowers the limit. Movements already under way continue; the player simply cannot create new ones until the count drops below the new limit.

### API

`GET /troop/movement/capacity` → `{ used: number, limit: number }`. Shared type in `packages/api-client`.

## Recruitment queue

Mirrors the building upgrade queue ([`007`](../007-buildings-upgrade-queue/spec.md)) and the research queue ([`008`](../008-technology-research/spec.md)), **per city**.

| Topic | Rule |
| --- | --- |
| Capacity | 1 active batch + **3** waiting rows when the city's `command_center` ≥ 1; 1 active + 0 waiting at level 0. Constant `TROOP_RECRUIT_QUEUE_LIMIT` = 3. |
| Enqueue | `recruitTroop` starts the batch when no recruitment is pending (today's path); otherwise **enqueues** if there is room, else fails with **`troop:queue-full`**. At level 0 the current `troop:already-in-progress` error stays. |
| Enqueue validation | **Loose**: ownership, roster, capacity. Requirements and resources are checked at **start**. |
| Payment | **On start** only (queued rows are free). |
| Start next | When a batch finishes or the active batch is cancelled, pop the oldest row and start it. If it fails its checks (requirement or resources), **drop** it, emit **`troop:queue-item-dropped`** (toast), and try the next one. |
| Cancel queued | `PUT /troop/queue/cancel` with the queue row id: remove it, no refund. Unknown id → **`troop:queue-item-not-found`**. |
| Cancel active | Unchanged (current troop cancel refund), then start the next row. |
| City capture | Queue rows of the captured city are deleted. |

Table `troop_recruit_queue`: `id`, `player_id`, `city_id`, `troop_code`, `count`, `created_at`. Index `(city_id, created_at)`.

## Underground shelter

### Sheltered amount

For `level ≥ 1`: `sheltered_r = ceil(base_r × multiplier_r^(level − 1))`; level 0 shelters nothing.

| Resource | `base` | `multiplier` |
| --- | --- | --- |
| plastic | 2000 | 1.6 |
| mushroom | 1500 | 1.6 |
| plasma | 200 | 1.6 |
| water | 100 | 1.6 (slice [`035`](../035-faction-exchange/spec.md)) |

Constant `underground_shelter_capacity` in `core/building/constant/`.

### Loot formula (replaces the 026 per-resource cap for cities)

For each resource `r`, in order plastic → mushroom → plasma → water (water since [`035`](../035-faction-exchange/spec.md)):

```
lootable_r = floor(max(0, stock_r − sheltered_r) × loot_ratio_r)
taken_r    = min(lootable_r, remaining_carrier_capacity)
```

- `loot_ratio` = 50 % plastic, 50 % mushroom, 25 % plasma ([`026`](../026-plasma-economy/spec.md)), 25 % water ([`035`](../035-faction-exchange/spec.md)).
- Applies to **city** targets only. Outposts and field stacks have no shelter (`sheltered_r = 0`).
- City **capture** is unaffected: the whole stock goes with the city.
- Battle report metadata gains `sheltered: Resource` (defender perspective). The defender report shows "Protégé par l'abri" when non-zero.

## System players

The planner ([`016`](../016-system-controlled-players/spec.md)) must respect the cap.

| Area | Change |
| --- | --- |
| Empire snapshot | Add `movement_used` and `movement_limit`. |
| Movement budget | Categories that create movements (`explore`, `base`, `deploy-outpost`, `transport`, `attack`) consume one slot each. When no slot is left, they are skipped for the tick (skippable error, not a failure). |
| Priority when slots are scarce | `attack` (Ash Liturgy profile) and `transport` from outposts above the pressure threshold first, then `base` / `deploy-outpost`, then `explore`. |
| Building rank | Raise `command_center` rank when `movement_used ≥ movement_limit − 1` for several ticks; otherwise normal rank. |
| Shelter | Low rank; build once `central_inductor` exists (to protect plasma). |
| Recruitment queue | Optional: the AI may enqueue like research. Not required in this slice. |
| Observability | Admin card shows `movements used / limit`. |

## Web UI

| Surface | Change |
| --- | --- |
| Building list / details | Two new buildings. Command center details: "+N mouvements" (this city), total cap, "File de recrutement : 3" when ≥ 1. Shelter details: sheltered plastic / mushroom / plasma at current and next level. |
| Movements | Show "Mouvements X / Y" (from `/troop/movement/capacity`) on the movement list and create screens. Disable send with a message when full. Map `troop:movement:limit-reached` to French copy. Since [`045`](../045-movements-revamp/spec.md) the readout is a meter in the movements page header (danger + « Limite atteinte » hint when full; tooltip: convoys never count) and in the send wizard recap; the summary step disables « Envoyer » with the blocking warning. |
| Recruitment | Show the city's queue (waiting rows, cancel button) under the active batch; recruit button enqueues when a batch is running and the queue has room. Toast on `troop:queue-item-dropped`. |
| Battle report | Defender: sheltered amounts. |

## Persistence

Migration (next free number after `027`):

1. Backfill one `building` row at level 0 per city for `command_center` and `underground_shelter`.
2. Create `troop_recruit_queue`.

## Testing

| Area | Cases |
| --- | --- |
| Cap | Limit = 5 with no center; sums levels across two cities; create and rebase rejected at the limit; automatic return / retreat never blocked; losing a city does not cancel movements. |
| Recruitment queue | Level 0 keeps `troop:already-in-progress`; level 1 enqueues up to 3, then `troop:queue-full`; payment on start; dropped row emits event and next row starts; cancel queued is free; capture clears rows. |
| Shelter | Level 0 = current loot; level 1 shelters 2000 plastic so a 3000 stock loses at most 500; plasma 25 % of the unsheltered part; outposts unaffected; report metadata. |
| System AI | Movement categories skipped when budget is 0; command center rank rises under saturation; snapshot fields present. |
| Migration | Existing cities get both rows at level 0. |

## Out of scope

- Movement cap bonuses from technologies or alliances.
- Shelter on outposts.
- Empire overview of movements (slice `031`).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`007`](../007-buildings-upgrade-queue/spec.md) | New building codes. |
| [`009`](../009-troops-stationary/spec.md) | Recruitment queue. |
| [`010`](../010-troop-movement-combat/spec.md) | Movement cap. |
| [`016`](../016-system-controlled-players/spec.md) | Movement budget, command center rank. |
| [`024`](../024-player-combat-pvp/spec.md) / [`026`](../026-plasma-economy/spec.md) | Shelter in loot formula. |

## Implementation notes

- **Rebase check**: a rebase replaces its inbound movement in the same command, so `rebaseTroopMovement` calls `AppService.assertMovementCapacity({ replaced_movement_count: 1 })`: it is only rejected when the player is already **over** the cap (after losing a city). A plain `count ≥ limit` check would strand troops whenever a player at the cap hits the outpost limit.
- **Recruitment queue API**: queued rows are returned by `GET /city/:city_id/troop` (`recruit_queue`: `{ id, troop_code, count }[]`, `recruit_queue_limit`: 3 once the city's command center is built, else 0), like the building queue on `GET /city/:city_id/building`. `PUT /troop/queue/cancel` takes `{ city_id, queue_item_id }` (same shape as `/building/queue/cancel`); a row of another city is `troop:queue-item-not-found`.
- **Queue flow** (`app/command/troop/start-recruit.ts`): `startTroopRecruitment` holds the former recruit logic (requirements, price, purchase, scheduling). `processTroopRecruitQueue` pops rows oldest first; resource and requirement failures drop the row and emit `troop:queue-item-dropped` (`{ city_id, troop_code, error_code }`). It runs when a batch completes (`progressTroopRecruitment`), after `cancelTroop`, and from `recruitTroop` when no batch is pending (unsticks rows left by a failed job, same as buildings). Enqueue checks ownership (`city:not-owner`) and roster; at level 0 the error stays `troop:already-in-progress`.
- **Sheltered report amounts**: `sheltered` is what was actually protected, `min(stock, shelter capacity)` per resource, and is only filled when carriers tried to loot a city (attacker win with carriers); attacker reports always carry zeros. It is stored in a new `report_battle.sheltered_json` column (default zeros), added by the same migration.
- **Energy**: `command_center` is a non-production consumer (like the labs), so it lowers the production energy ratio only through the shared supply.
- **Building details**: command center metadata adds `current_movement_bonus` / `next_movement_bonus` (its level), `movement_limit` (player cap) and `recruit_queue_limit`; shelter metadata is `current_sheltered` / `next_sheltered`. Shelter amounts round up after trimming float noise (`2000 × 1.6² = 5120`, not 5121).
- **System AI**: movement slots are checked per action from the tick snapshot plus `tick_context.movements_created` (the replan loop recollects the snapshot after each committed action). Scarce-slot priority reorders movement intents only among their own plan positions; structural prepends keep their place. "Several ticks" = `SYSTEM_COMMAND_CENTER_SATURATION_TICKS` (3), counted in system player memory (`movement_saturated_ticks`). Normal command center rank is the default (2); prioritized rank is 0. The shelter ranks 5 and is skipped until `central_inductor` ≥ 1. The AI does not enqueue recruitment.
- **Admin**: the stats snapshot gains `movement_used` / `movement_limit`; the card shows "Mouvements en cours (n) — used / limit utilisés".

## Follow-ups

- **Artwork**: no dedicated images yet. `apps/web/src/modules/building/image.ts` maps `command_center` → research lab art and `underground_shelter` → mushroom warehouse art until `/buildings/<code>.png` exists; remove each placeholder entry when its image lands.
- **Balance**: costs, shelter amounts and the AI saturation threshold need a playtest on the observability screen.

## Evidence index

| Area | Paths |
| --- | --- |
| Buildings | `apps/server/src/core/building/constant/code.ts`, `order.ts`, `energy.ts`, `shelter-capacity.ts`, `apps/server/src/core/building/helper.ts`, `apps/server/src/core/building/service.ts` (`getShelteredResources`, `getRecruitQueueLimit`, + `service.spec.ts`), `apps/server/src/core/requirement/constant/building.ts`, `apps/server/src/core/pricing/constant/building.ts`, `apps/server/src/app/service.ts` (command center energy), `apps/server/src/app/query/building/get.ts` (+ `get.spec.ts`) |
| Movement cap | `apps/server/src/core/troop/constant/movement-limit.ts`, `apps/server/src/core/troop/service.ts` (`getMovementLimit`, `assertMovementCapacity`, + `service.spec.ts`), `apps/server/src/app/service.ts` (`getMovementCapacity`, `assertMovementCapacity`, + `service.spec.ts`), `apps/server/src/app/command/troop/movement/create.ts` (+ `create.spec.ts`), `rebase.ts` (+ `rebase.spec.ts`), `finish/explore.spec.ts` (return trip never blocked), `apps/server/src/adapter/database/repository/movement.ts` (`countByPlayer`), `building.ts` (`getTotalLevelForPlayer`), `apps/server/src/app/query/troop/movement/capacity.ts`, `apps/server/src/web/handler/troop/movement/capacity.ts` (+ `capacity.spec.ts`) |
| Recruitment queue | `apps/server/src/core/troop/constant/recruit-queue.ts`, `apps/server/src/core/troop/recruit-queue-entity.ts`, `apps/server/src/app/port/repository/troop-recruit-queue.ts`, `apps/server/src/adapter/database/repository/troop-recruit-queue.ts`, `apps/server/src/app/command/troop/recruit.ts`, `start-recruit.ts`, `progress-recruit.ts`, `cancel.ts`, `cancel-queued.ts` (+ their `.spec.ts`), `apps/server/src/app/query/troop/list.ts` (+ `list.spec.ts`), `apps/server/src/web/handler/troop/cancel-queued.ts`, `list/mapper.ts` (+ specs), `apps/server/src/web/ws.ts`, `apps/server/src/app/event-bus.ts` |
| Loot | `apps/server/src/app/command/combat/apply-battle-outcomes.ts` (+ `.spec.ts`, `underground shelter`, capture clears the queue), `apps/server/src/app/command/communication/report/create-battle.ts` (+ `.spec.ts`), `apps/server/src/core/combat/type/report-battle-metadata.ts`, `apps/server/src/adapter/database/repository/report.ts`, `report-battle.ts` |
| System AI | `apps/server/src/core/player/system/movement-budget.ts` (+ `.spec.ts`), `empire-snapshot.ts`, `memory.ts`, `planner.ts`, `apps/server/src/app/command/player/system/actions.ts` (+ `actions.spec.ts`, `movement budget`), `storage.ts` (+ `storage.spec.ts`), `tick.ts` (+ `tick.spec.ts`), `memory.ts`, `skippable-error.ts`, `apps/server/src/app/query/player/system/empire-snapshot.ts` (+ `empire-snapshot-viewport-cache.spec.ts`), `system-tick-context.ts`, `apps/server/src/adapter/database/repository/system-player-memory.ts`, `apps/server/src/app/query/admin/system-player-stats.ts` |
| API | `packages/api-client/src/endpoints/troop/movement/capacity.ts`, `troop/cancel-queued.ts`, `troop/list/shared.ts` (`recruit_queue`), `troop/index.ts`, `building/get.ts` (`CommandCenterBuilding`, `ShelterBuilding`), `admin/system-player-stats.ts`, `packages/api-client/src/types/report-battle.ts` (`sheltered`), `packages/api-client/src/index.ts` (`TROOP_RECRUIT_QUEUE_LIMIT`) |
| Migration | `apps/server/src/adapter/database/migrations/00011_command_center_shelter.ts`, `apps/server/src/adapter/database/types.ts` (`TroopRecruitQueue`, `report_battle.sheltered_json`) |
| Web | `apps/web/src/modules/building/translations.ts`, `image.ts`, `details/index.tsx`, `details/metadata/index.tsx`, `details/metadata/command-center/index.tsx`, `details/metadata/shelter/index.tsx`, `apps/web/src/modules/movement/capacity/index.tsx` (+ `index.test.tsx`), `movement/list/index.tsx`, `movement/create/index.tsx`, `movement/create/warning/index.tsx` (+ test), `apps/web/src/modules/troop/hooks.ts`, `troop/list/in-progress/index.tsx`, `troop/details/recruit/index.tsx`, `troop/ws-listener.ts`, `apps/web/src/helpers/error-translations.ts`, `apps/web/src/modules/communication/report/details.tsx`, `apps/web/src/modules/admin/system-player-observability/stats-panel.tsx`, `ws-listener.ts` |
