# Slice 026 — Plasma economy

**Status**: Implemented on `main` (slice 026): optional plasma in pricing tables, plasma debit / refund, 25 % plasma loot, plasma in web costs. No content was plasma-priced in this slice; the Arsenal technologies of [`027`](../027-military-economy-technologies/spec.md) are the first plasma consumer.

## Summary

Turn **plasma** into a spendable resource. Today the **central inductor** produces plasma into each city's resource stock (unlimited storage, [`015`](../015-resources-model/spec.md)), but every price returns `plasma: 0` ([`014`](../014-requirements-pricing/spec.md)), so it only accumulates.

This slice delivers the **engine only**: pricing tables can carry a plasma cost, purchases debit it, cancels refund it, battles loot it at a reduced rate, and the web shows it wherever a cost is displayed. **No existing building, technology or troop gets a plasma price in this slice** — plasma consumers arrive with later slices (military technologies `027`, city defenses `029`, elite units with the new factions). Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: resources ([`015`](../015-resources-model/spec.md)), requirements & pricing ([`014`](../014-requirements-pricing/spec.md)), buildings ([`007`](../007-buildings-upgrade-queue/spec.md)), technology ([`008`](../008-technology-research/spec.md)), troops ([`009`](../009-troops-stationary/spec.md)), PvP combat ([`024`](../024-player-combat-pvp/spec.md)), system players ([`016`](../016-system-controlled-players/spec.md)).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Role of plasma** | Advanced resource for top-tier content: advanced technologies, heavy defenses, elite units. |
| **Existing content** | **Unchanged** — no current `BuildingCode`, `TechnologyCode` or `TroopCode` costs plasma after this slice. |
| **Storage** | **Per city**, in the city cell's resource stock (as today). Unlimited capacity (no warehouse). Plasma can already be carried by `transport` movements between owned locations. |
| **Production** | Unchanged: `central_inductor` earnings (`base` 0.1/s, ×1.15 per level, unlocked at `architecture` 5). Rebalance after plasma consumers exist. |
| **Refunds** | Plasma follows the **same refund rule** as plastic and mushroom for each cancel path (building 50 %, technology 50 %, troop recruitment as today). |
| **Loot** | Plasma is lootable at **25 %** of the defender's stock (plastic and mushroom stay at 50 %). |
| **Bourse tax** | None (the future faction exchange has no plasma tax). |

## Pricing model

### Tables

Extend the pricing value types (`apps/server/src/core/pricing/value/`) with an **optional** plasma entry:

| Type | Today | After |
| --- | --- | --- |
| `LevelCosts` (buildings, technologies) | `plastic`, `mushroom`, `duration` | + `plasma?: LevelCost` |
| `CountCosts` (troops) | `plastic`, `mushroom`, `duration` | + `plasma?: number` (per unit) |

Absent `plasma` means a plasma cost of **0** at every level / count. Existing tables are not edited.

### `PricingService`

| Method | Plasma behavior |
| --- | --- |
| `getBuildingLevelCost` | `plasma = computeLevelResourceCost(plasma, level)` when defined, else `0`. Same curve as other resources (`ceil(base × multiplier^(level−1))`). Architecture reduction applies to **duration only** (unchanged). |
| `getTechnologyLevelCost` | Same as buildings. |
| `getTroopCost` | `plasma = unit_plasma × count` when defined, else `0`. |
| `getBuildingUpgradeRefund` | `plasma = round(cost.plasma / 2)` (same as plastic/mushroom). |
| `getTechnologyResearchRefund` | `plasma = round(cost.plasma / 2)`. |
| Troop cancel | Refund the full troop cost resource, plasma included (current troop cancel behavior). |

No other pricing rule changes: plasma has **no** level reduction, and `GAME_TIME_SCALE` keeps affecting durations only (as for other resource costs).

### Purchase and queues

`ResourcesService.purchaseResourceStock` already checks and debits plasma and throws `city:not-enough-resources` when short. Building upgrades, technology research (including the FIFO queue, [`008`](../008-technology-research/spec.md)) and troop recruitment debit plasma at the **same moment** they debit plastic and mushroom today. No new error code.

## Loot

`lootFromStock` in `apps/server/src/app/command/combat/apply-battle-outcomes.ts` caps each resource by a per-resource ratio:

| Resource | Lootable share of defender stock |
| --- | --- |
| plastic | 50 % (unchanged) |
| mushroom | 50 % (unchanged) |
| plasma | **25 %** |

Order and capacity rules are unchanged: resources are taken in the order plastic → mushroom → plasma, each `min(floor(stock × ratio), remaining carrier capacity)`. The ratios live in a named constant (e.g. `combat_loot_ratio`) in `core/combat/constant/`.

Since slice [`035`](../035-faction-exchange/spec.md), **water** is looted last (plastic → mushroom → plasma → water), also at **25 %**.

City **capture** (ownership transfer on attacker win, [`024`](../024-player-combat-pvp/spec.md)) is unaffected: the stock goes with the city.

Since slice [`028`](../028-command-center-shelter/spec.md), the target city's *underground shelter* protects a fixed amount per resource first: each ratio applies to `max(0, stock − sheltered)` (city targets only; outposts and field stacks are unsheltered). The defender report records the sheltered amounts (`sheltered`).

## System players

The system planner already includes plasma in affordability checks (`canAfford` in `command/player/system/actions.ts`, `maxAffordableRecruitCount` in `troops.ts`). No behavior change is required while no content costs plasma. Prioritizing the central inductor when plasma-priced content appears belongs to the slices that introduce that content.

## Web UI

| Surface | Change |
| --- | --- |
| `modules/cost/index.tsx` (`Cost`) | Accept `plasma` (default `0`). When `plasma > 0`, render it with `IconPlasma`, and flag it as short when it exceeds the city's plasma stock (same style as plastic / mushroom). Hidden when `0`, so current screens look identical. |
| Building, technology, troop details | Pass `plasma` from the API cost to `Cost`. |
| Build and research queues | Show plasma in queued item costs when non-zero. *As implemented:* queued items display no cost at all (they are paid when dequeued, not when queued, and `upgrade_queue` / `research_queue` entries carry only timing), so there is nothing to change; the cost is shown in the details panel via `Cost`. |
| Battle report details | Already formats plasma in loot (`communication/report/details.tsx`); no change beyond verifying the 25 % amount displays. |
| Header resources | Already shows plasma stock and earnings; no change. |

API responses already carry `plasma` in every `Resource` (`packages/api-client/src/endpoints/shared/resource.ts`). *As implemented:* the entity cost objects were not `Resource`s and omitted plasma, so `plasma: number` was added (additive) to building `upgrade_cost`, technology `research_cost` and troop `cost` (`packages/api-client/src/endpoints/{building,technology,troop}/get.ts`, mapped in `apps/server/src/web/handler/{building,technology,troop}/get.ts`). The web `hasEnoughResources` helper also checks plasma so action buttons stay disabled when plasma is short.

## Testing

| Area | Cases |
| --- | --- |
| `PricingService` | Building / technology level cost with a `plasma` curve; without one returns `0`; troop cost multiplies plasma by count; refunds halve plasma. Use a test-only cost table or injected fixture since no real code is plasma-priced. |
| Purchase | Upgrade / research / recruit fails with `city:not-enough-resources` when plasma is short and debits plasma when enough. |
| Loot | Defender with 1000 plasma and ample carrier capacity loses 250 plasma (not 500); capacity exhausted by plastic/mushroom yields 0 plasma. |
| Web `Cost` | Plasma hidden at 0; shown and flagged short when above stock. |

## Out of scope

- Assigning plasma prices to any content (slices `027`, `029`, new factions `036` / `037`).
- Plasma **upkeep** (per-combat or per-hour consumption by defenses) — slice `029`.
- Underground shelter loot protection — implemented in slice [`028`](../028-command-center-shelter/spec.md).
- Central inductor production or unlock rebalance.
- Plasma in outposts (outposts have no inductor and do not produce plasma).
- Cell-dependent plasma coefficients (all cells stay at `plasma: 1` until the map rework).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`014`](../014-requirements-pricing/spec.md) | Optional plasma in cost tables and refunds. |
| [`015`](../015-resources-model/spec.md) | Plasma is spendable; loot ratio table. |
| [`024`](../024-player-combat-pvp/spec.md) | Loot row: plasma 25 %, others 50 %. |

## Evidence index

| Area | Paths |
| --- | --- |
| Pricing types | `apps/server/src/core/pricing/value/level.ts`, `apps/server/src/core/pricing/value/count.ts` |
| Pricing service | `apps/server/src/core/pricing/service.ts`, `apps/server/src/core/pricing/service.spec.ts` (`PricingService plasma costs`, fixture mutates the cost tables per test) |
| Purchase | `apps/server/src/app/command/building/upgrade.spec.ts`, `apps/server/src/app/command/technology/research.spec.ts` (incl. queued item dropped on short plasma), `apps/server/src/app/command/troop/recruit.spec.ts` |
| Loot | `apps/server/src/core/combat/constant/loot.ts` (`combat_loot_ratio`), `apps/server/src/app/command/combat/apply-battle-outcomes.ts`, `apps/server/src/app/command/combat/apply-battle-outcomes.spec.ts` |
| API cost DTOs | `packages/api-client/src/endpoints/building/get.ts`, `technology/get.ts`, `troop/get.ts`; `apps/server/src/web/handler/building/get.ts`, `technology/get.ts`, `troop/get.ts` (+ `get.spec.ts`) |
| Web cost | `apps/web/src/modules/cost/index.tsx`, `apps/web/src/modules/cost/index.test.tsx`, `apps/web/src/modules/troop/details/index.tsx` (building / technology details spread the API cost into `Cost`), `apps/web/src/modules/city/helper.ts` (`hasEnoughResources`) |
