# Slice 028 — Command center and underground shelter

**Status**: Planned.

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

Constant `underground_shelter_capacity` in `core/building/constant/`.

### Loot formula (replaces the 026 per-resource cap for cities)

For each resource `r`, in order plastic → mushroom → plasma:

```
lootable_r = floor(max(0, stock_r − sheltered_r) × loot_ratio_r)
taken_r    = min(lootable_r, remaining_carrier_capacity)
```

- `loot_ratio` = 50 % plastic, 50 % mushroom, 25 % plasma ([`026`](../026-plasma-economy/spec.md)).
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
| Movements | Show "Mouvements X / Y" (from `/troop/movement/capacity`) on the movement list and create screens. Disable send with a message when full. Map `troop:movement:limit-reached` to French copy. |
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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Buildings | `core/building/constant/code.ts`, `order.ts`, `energy.ts`, `shelter-capacity.ts`; `core/requirement/constant/building.ts`; `core/pricing/constant/building.ts` |
| Movement cap | `core/troop/constant/movement-limit.ts`, `app/command/troop/movement/create.ts`, `rebase.ts`, `web/handler/troop/movement/capacity.ts` |
| Recruitment queue | `app/command/troop/recruit.ts`, `progress-recruit.ts`, `cancel.ts`, queue repository, `web/handler/troop/queue/cancel.ts` |
| Loot | `app/command/combat/apply-battle-outcomes.ts` |
| System AI | `app/command/player/system/actions.ts`, `storage.ts`, `query/player/system/empire-snapshot.ts` |
| Web | `modules/building/*`, `modules/movement/*`, `modules/troop/*`, `modules/communication/report/details.tsx` |
