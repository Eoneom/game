# Slice 029 — City defenses

**Status**: Implemented on `main` (slice 029): `city_wall` (Enceinte), `core/defense/` (5 defense types), per-city fortification queue (`defense.build.progress`), `fortification` technology, defenses in the combat engine, `siege_assault` strategy, system AI defense policy, simulator inputs, web **Défense** tab, migration `00012_city_defenses`.

## Summary

Add **defenses**: fixed structures built **in quantity** inside a city, on a layer **separate from buildings**. They join the defender side of every battle on the city's cell ([`024`](../024-player-combat-pvp/spec.md)), are lost like units, and must be **rebuilt**.

The slice adds:

- the **Enceinte** (`city_wall`), a level-based structure that gives the city its **defense capacity** and speeds up construction;
- five **defense types**: Rempart, Tourelle, Champ de mines, Batterie plasma, Générateur de bouclier;
- a per-city **fortification queue**;
- the **Fortification** technology;
- a new attack strategy, **Assaut de siège**, available to everyone;
- a simple **system AI** policy for building defenses.

Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`024`](../024-player-combat-pvp/spec.md) (combat engine), [`026`](../026-plasma-economy/spec.md) (plasma prices), [`027`](../027-military-economy-technologies/spec.md) (technology modifiers in battle snapshot), [`028`](../028-command-center-shelter/spec.md) (queue pattern), [`007`](../007-buildings-upgrade-queue/spec.md), [`009`](../009-troops-stationary/spec.md), [`014`](../014-requirements-pricing/spec.md), [`016`](../016-system-controlled-players/spec.md), [`021`](../021-admin-operator-tools/spec.md).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Separate layer** | Own "Défense" tab, own capacity (defense points from the Enceinte), **outside** the city's 100 building levels. |
| **Quantity model** | Defenses are stacks (`code`, `count`) like troops, destroyed as whole units in combat, rebuilt by the player. |
| **Where** | **Cities only** (no outposts, no field). |
| **After attacker win** | All remaining defenses are **destroyed** (to revisit when occupation vs loot-only is clarified). |
| **Victory** | Only **armed** defenses (Tourelle, Batterie plasma) keep the defender in the fight. Rempart, mines and shields alone do not prevent an attacker win. |
| **Siege** | New strategy **`siege_assault`** (*Assaut de siège*), available to all, no unlock. No passive siege bonus outside the strategy. |
| **Upkeep** | Only the **Batterie plasma** consumes plasma, per round it fires. Shields have no upkeep. |
| **System AI** | Builds defenses with a simple policy; the Ash Liturgy builds fewer. |

## Vocabulary

Add to `CONTEXT.md`:

> **Defense**: A stack of a single fixed structure type owned by a Player, built in a city. It never moves and only fights when its city is attacked.
> _Avoid_: building, troop, tower

Defenses get their own domain (`core/defense/`) and table, distinct from troops.

## Enceinte (`city_wall`)

A `BuildingCode` (`CITY_WALL`, wire `city_wall`, FR **Enceinte**) shown in the **Défense** tab, not in the building list.

| Topic | Rule |
| --- | --- |
| Level cap | **Excluded** from `building_levels_used` and the 100-level cap. |
| Upgrade | Regular building upgrade queue ([`007`](../007-buildings-upgrade-queue/spec.md)). |
| Capacity | `defense_capacity = 20 × level` defense points. |
| Build speed | Defense build duration × `(1 − 1/10)^level` (same reduction shape as the cloning factory). |
| Energy | None. |
| Requirements | `architecture` 2. |
| Cost | Plastic 1500 / 1.7, mushroom 1000 / 1.7, duration 150 s / 1.7. |

## Defense catalogue

New enum `DefenseCode` in `core/defense/constant/code.ts`. Values are initial and must be tuned with the admin simulator.

| Enum | Wire | FR name | Points | Attack | Life | Armed | Special |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RAMPART` | `rampart` | **Rempart** | 1 | 0 | 60 | no | Takes losses **first**. |
| `TURRET` | `turret` | **Tourelle** | 2 | 25 | 20 | **yes** | — |
| `MINEFIELD` | `minefield` | **Champ de mines** | 1 | 40 | — | no | Fires in **round 1 only**, then the whole stack is consumed. Not in the life pool, cannot be targeted. |
| `PLASMA_BATTERY` | `plasma_battery` | **Batterie plasma** | 5 | 80 | 30 | **yes** | Each firing unit spends **5 plasma** per round from the city stock. |
| `SHIELD_GENERATOR` | `shield_generator` | **Générateur de bouclier** | 4 | 0 | 40 | no | Each surviving unit reduces the attacker's attack pool by **2 %**, capped at **30 %**. |

### Requirements

| Code | Buildings | Technologies |
| --- | --- | --- |
| `rampart` | `city_wall` 1 | — |
| `turret` | `city_wall` 2 | `fortification` 1 |
| `minefield` | `city_wall` 2 | — |
| `shield_generator` | `city_wall` 4 | `fortification` 2 |
| `plasma_battery` | `city_wall` 5, `central_inductor` 1 | `fortification` 3 |

### Costs (per unit)

| Code | Plastic | Mushroom | Plasma | Duration (s) |
| --- | --- | --- | --- | --- |
| `rampart` | 800 | 400 | — | 60 |
| `turret` | 1000 | 600 | — | 90 |
| `minefield` | 300 | 100 | — | 30 |
| `shield_generator` | 2000 | 1500 | 200 | 240 |
| `plasma_battery` | 1500 | 1000 | 300 | 180 |

`PricingService.getDefenseCost({ code, count, city_wall_level })`: resources × count; duration × count × Enceinte reduction; `GAME_TIME_SCALE` as for troops.

### Capacity rule

Building (or enqueueing) `count` units is rejected with **`defense:capacity-exceeded`** when `used_points + queued_points + count × points > defense_capacity`. `used_points` counts existing defenses; `queued_points` counts the active batch and waiting rows.

## Fortification technology

| Enum | Wire | FR name | Effect per level | Requirements | Cost (`base` / `multiplier`) |
| --- | --- | --- | --- | --- | --- |
| `FORTIFICATION` | `fortification` | **Fortification** | +3 % attack and life of defenses | `research_lab` 5, `central_inductor` 1 | Plastic 7000 / 1.7, mushroom 7000 / 1.7, plasma 400 / 1.7, duration 180 / 2 |

Branch **Arsenal** in the web grouping ([`027`](../027-military-economy-technologies/spec.md)). Snapshot at battle start as `defender_modifiers.fortification` (missing = 1).

## Fortification queue

Per city, same rules as the recruitment queue ([`028`](../028-command-center-shelter/spec.md)):

- 1 active batch + **3** waiting rows (`DEFENSE_BUILD_QUEUE_LIMIT` = 3) once `city_wall` ≥ 1.
- Pay on start; enqueue validation is loose (ownership, capacity); requirements and resources are checked at start; invalid row → drop + **`defense:queue-item-dropped`** toast, try next.
- Units appear progressively, like troop recruitment (`defense.build.progress` job, same scheduling helper as `troop.recruit.progress`).
- Cancel active: full refund of the remaining units (same as troop cancel). Cancel queued: free.
- City capture or destruction: active batch and queue rows are deleted.

Errors: `defense:queue-full`, `defense:queue-item-not-found`, `defense:capacity-exceeded`, `defense:already-in-progress` (no Enceinte level, batch running).

## Combat integration

### Snapshot

At battle start (`app/saga/finish/attack.ts`), when the target is a **city**, the defender snapshot adds the city's defense stacks. `BattleStack` gains `kind: 'troop' | 'defense'` and `code: TroopCode | DefenseCode`. Existing rows without `kind` are troops.

### Pools

| Defense | Attack pool | Life pool |
| --- | --- | --- |
| Rampart | 0 | `life × count × fortification` |
| Turret | `attack × count × fortification` | `life × count × fortification` |
| Minefield | Round 1: `attack × count × fortification`; later rounds: stack is gone | not counted |
| Per-round defenses ([`037`](../037-faction-bastion-order/spec.md)) | `attack_by_round[r] × count × fortification` | as their row type |
| Plasma battery | `attack × firing × fortification`, `firing = min(count, floor(city_plasma / 5))`; spends `5 × firing` plasma | `life × count × fortification` |
| Shield generator | 0 | `life × count × fortification` |

- Strategy multipliers and Arsenal modifiers ([`027`](../027-military-economy-technologies/spec.md)) do **not** apply to defenses; only Fortification does.
- **Shield**: after computing the attacker's attack pool, multiply it by `1 − min(0.30, 0.02 × surviving_shield_generators)`. With spore clouds ([`036`](../036-faction-symbiosis/spec.md)) and barbed wire ([`037`](../037-faction-bastion-order/spec.md)) the reductions add up, capped at **40 %** in total.
- **Exposure** (homogeneous army) ignores defense stacks when counting classes.
- Plasma spent by batteries is debited from the city stock during the round. Loot is computed on the remaining stock.

### Casualty order (defender)

| Attacker strategy | Order |
| --- | --- |
| Any except `siege_assault` | Rampart → combat troops (current focus rules) → turret → plasma battery → shield generator → carrier → civilian → scout |
| `siege_assault` | Rampart → shield generator → plasma battery → turret → combat troops → carrier → civilian → scout |

Within a defense type, whole units are removed as for troops. Barbed wire ([`037`](../037-faction-bastion-order/spec.md)) comes **before** ramparts in both orders.

### Victory

`resolveBattleWinner` counts **combat troops + armed defenses** (`turret`, `plasma_battery`) as the defender's presence. A defender left with only ramparts, shields or nothing loses as today.

### Outcomes

| Winner | Defenses |
| --- | --- |
| Attacker | All remaining defense rows of the city are **deleted** (also before ownership transfer on capture). |
| Defender or draw | Survivors stay. Losses are persisted. |

## `siege_assault` strategy

New `CombatStrategy` value `siege_assault`, FR **Assaut de siège**, available to everyone (attack creation and garrison default).

| Round | legionnaire | interceptor | war_machine | disruptor |
| --- | --- | --- | --- | --- |
| 1–5 | 0.85 / 0.95 | 0.85 / 0.95 | 1.25 / 1.00 | 0.85 / 0.95 |

(attack / life, flat on all rounds.) In addition, when the **attacker** uses `siege_assault`:

- defender **defense** life contributes at **75 %** to the defender life pool;
- defender casualties follow the siege order above.

As a garrison default it has no special effect beyond its multipliers.

## Battle reports

- Loss lines carry `kind` so the UI shows defenses with their own names and art.
- Round summaries add `defender_plasma_spent` and `shield_reduction` (0–0.30).
- Defender report shows "Défenses détruites" totals; attacker report shows defense losses inflicted.

## System players

| Area | Policy |
| --- | --- |
| Enceinte | Upgrade in every city once `cloning_factory` ≥ 4, low rank; capital first. |
| Target mix | Fill up to **50 %** of capacity (Ash Liturgy: **25 %**) with ramparts and turrets in a 1 : 1 point ratio; minefields when capacity is left and the city was attacked recently. |
| Plasma batteries, shields | Not built by the AI in this slice. |
| Attack scoring | `combat-policy.ts` simulates with the target's defenses included; may pick `siege_assault` when the target's defense points exceed its combat troops' life pool share (initial threshold: 30 %). |
| Observability | Admin card lists defense counts per city. |

## Admin combat simulator

Accepts defender defense stacks and a Fortification level; strategy list includes `siege_assault`. Optional city plasma input for batteries (default: unlimited).

## Web UI

| Surface | Change |
| --- | --- |
| City navigation | New **Défense** tab. |
| Défense tab | Enceinte card (level, upgrade, capacity used / total); list of defense types with stats, requirement state, cost via `Cost` (plasma included), build form (count) limited by capacity; fortification queue with cancel; toast on dropped rows. |
| Artwork | One image per defense type + Enceinte; placeholders acceptable for first merge if tracked in tasks. |
| Attack form / garrison strategy | `siege_assault` in strategy pickers. |
| Battle report | Defense losses, plasma spent, shield reduction. |
| Building list | `city_wall` hidden. |

## Persistence

Migration (next free number):

1. Table `defense`: `id`, `player_id`, `city_id`, `code`, `count`, unique `(city_id, code)`.
2. Table `defense_build_queue`: `id`, `player_id`, `city_id`, `defense_code`, `count`, `created_at`; index `(city_id, created_at)`.
3. Backfill `building` row `city_wall` level 0 per city; backfill `defense` rows at count 0 per city and code; backfill `technology` row `fortification` level 0 per player.

## Testing

| Area | Cases |
| --- | --- |
| Capacity | Build rejected past `20 × level` points including queued points. |
| Queue | Same matrix as the recruitment queue (028). |
| Pools | Rampart adds life only; minefield attacks round 1 then disappears; battery fires up to available plasma and debits it; shield caps at 30 %; Fortification scales defenses only. |
| Casualties | Ramparts die first; `siege_assault` order; 75 % defense life under siege. |
| Victory | Defender with turrets but no troops keeps fighting; ramparts-only defender loses. |
| Outcomes | Attacker win deletes all defenses; draw keeps survivors. |
| Reports | `kind` on loss lines; plasma spent; shield reduction. |
| System AI | Builds to 50 % / 25 % of capacity; includes defenses in attack simulation. |
| Migration | Backfills for buildings, defenses, technology. |

## Faction defenses ([`036`](../036-faction-symbiosis/spec.md))

`defense_faction: Partial<Record<DefenseCode, FactionCode>>` (`core/defense/constant/faction.ts`) lists faction-exclusive defenses; codes without an entry are common. `PUT /defense/build` rejects another faction's defense with `defense:not-in-faction-roster`, and `GET /city/:city_id/defense` lists only the common defenses plus the player's own (costs and requirements stay complete). Every city still gets a row per code at count 0.

| Code | Faction | Points / attack / life | Armed | Casualty tier | Special |
| --- | --- | --- | --- | --- | --- |
| `mycelium_wall` | `the_symbiosis` | 1 / 0 / 50 | no | with `rampart` (both orders) | Regrowth: on a defender win or draw, `floor(30 % × destroyed)` units are not removed from the city; the defender report lists them |
| `spore_cloud` | `the_symbiosis` | 2 / 12 / 10 | yes | with `turret` (both orders) | Each surviving unit lowers the attacker attack pool by 1 %, max 15 %; with shields max 40 % in total; round summaries carry `spore_reduction` |
| `field_artillery` ([`037`](../037-faction-bastion-order/spec.md)) | `the_bastion_order` | 4 / 60·50·25·20·20 / 35 | yes | with `turret` (both orders) | Per-round attack table `attack_by_round` (rounds 1–5) |
| `barbed_wire` ([`037`](../037-faction-bastion-order/spec.md)) | `the_bastion_order` | 1 / 0 / 15 | no | **first**, before `rampart` (both orders) | Each surviving unit lowers the attacker attack pool by 1 % in round 1 (max 10 %) and 0.5 % in round 2 (max 5 %), nothing afterwards; inside the 40 % combined cap after shields and spores; round summaries carry `barbed_wire_reduction` |

**Per-round attack** ([`037`](../037-faction-bastion-order/spec.md)): `defense_characteristics` takes an optional `attack_by_round` table (rounds 1–5; rounds past it use its last value) that replaces the flat `attack` in combat (`DefenseService.getAttackForRound`). The minefield is expressed as `[40, 0, 0, 0, 0]` (behaviour unchanged: it is still consumed after round 1); `GET /city/:city_id/defense` exposes the table as `attack_by_round`.

## Out of scope

- Faction-specific defenses (with the new factions: La Symbiose implemented in [`036`](../036-faction-symbiosis/spec.md) and L'Ordre du Bastion in [`037`](../037-faction-bastion-order/spec.md), see [Faction defenses](#faction-defenses-036); `039` later).
- Defenses on outposts.
- Repairing damaged units (whole-unit model only).
- Shield upkeep or energy-based shields.
- Espionage of defenses (slice `030`).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`024`](../024-player-combat-pvp/spec.md) | Defense stacks, victory rule, casualty order, `siege_assault`. |
| [`007`](../007-buildings-upgrade-queue/spec.md) | `city_wall` excluded from the level cap. |
| [`008`](../008-technology-research/spec.md) / [`014`](../014-requirements-pricing/spec.md) | `fortification`, defense requirements and costs. |
| [`016`](../016-system-controlled-players/spec.md) | Defense policy. |
| [`021`](../021-admin-operator-tools/spec.md) | Simulator inputs. |
| `CONTEXT.md` | **Defense** term. |

## Implementation notes

- **Casualty mechanics**: the engine has no per-unit damage; each side loses `loss_budget = max(1, floor(attack_pool / max(1, life_pool)))` **whole units** per round ([`024`](../024-player-combat-pvp/spec.md), [`027`](../027-military-economy-technologies/spec.md)). Defenses take part as units: their life raises the defender life pool (fewer units lost), their attack raises the defender attack pool, and the budget is spent in the casualty order of this spec (tiers: rampart → combat troops (dominant-class focus kept) → turret → plasma battery → shield generator → carrier → civilian → scout; `siege_assault` swaps in rampart → shield → battery → turret → combat). Minefields are not candidates. Barbed wire ([`037`](../037-faction-bastion-order/spec.md)) gets its own tier before the ramparts in both orders. Without defenses the order and pools are exactly the former ones.
- **Minefields**: consumed at the end of the round they fired in (round 1); the consumed units are added to that round's `defender_losses` (`kind: 'defense'`), so reports count them and the post-battle decrement removes them from the city.
- **Shield**: the reduction uses the shield generators alive at the start of the round; `attacker_attack_pool` in the round summary is the reduced pool (the one that converts into defender losses), `shield_reduction` carries the share.
- **Exposure**: the 0.85 multiplier applies to the troop part of the life pool only; defense life is added after it (unchanged behaviour without defenses).
- **Plasma batteries**: `advanceCombatRound` reads the target city's stored stock (as of its last gather) only when the defender has batteries, passes `plasma` to the engine and debits `defender_plasma_spent` from the stock in the same command; loot then reads the remaining stock. `battle_round` gains `defender_plasma_spent` / `shield_reduction` columns (migration `00012`). The admin simulator and the system AI simulation assume unlimited plasma unless `defender_city_plasma` is given.
- **`kind` wire**: defense stacks and loss lines carry `kind: 'defense'`; troop stacks and lines keep their previous shape (no `kind`, missing = troop) so stored battles, reports and existing tests are unchanged. `report.troops` (`report_troop` rows) keeps troop lines only; defense losses live in `casualties_defender` (both perspectives) and the web derives « Défenses détruites » / « Défenses ennemies détruites » from it.
- **Fortification snapshot**: `defender_modifiers.fortification` is snapshotted for every battle (harmless where no defense fights). The report modifiers line shows it (« +9 % fortification »).
- **Outcomes**: an attacker win on a city deletes its `defense` rows (`defense.deleteByCity`), its fortification queue rows, and cancels its `defense.build.progress` job, before the ownership transfer. On a defender win or draw, each defense loss line is subtracted from the city rows (`removeCount`, never below 0) instead of overwriting counts, so units finished during the battle are kept. Rows are recreated on demand: `defense.addCount` upserts on `(city_id, code)`.
- **Fortification queue**: capacity is checked when a batch is requested (start or enqueue), counting existing points, the active batch's remaining units and every waiting row; it is not re-checked when a queued row starts (it was already counted). Without an Enceinte the capacity is 0, so `defense:capacity-exceeded` comes first and `defense:already-in-progress` is practically unreachable. The progress job is keyed by city and carries `defense_code` (no row id); it uses `nextTroopRecruitProgressAt` and `TroopService.progressRecruitment` and does nothing once the city has another owner. Cancel keeps built units and refunds the remaining ones in full. New cities get one row per type at count 0 (`DefenseService.init` in bootstrap and settle).
- **API**: `GET /city/:city_id/defense` (Enceinte level, `capacity { total, used, queued }`, defenses with stats / per-unit cost / requirement, `ongoing_build`, `build_queue`, `build_queue_limit`), `PUT /defense/build` (`{ city_id, defense_code, count }`), `PUT /defense/cancel`, `PUT /defense/queue/cancel` (`{ city_id, queue_item_id }`). WebSocket: `defense:build-updated` (refresh) and `defense:queue-item-dropped` (toast).
- **Level cap**: `building.getTotalLevels` excludes `city_wall`, and `startBuildingUpgrade` skips the cap check for it, so the Enceinte can be built in a full city.
- **System AI**: no new tick category — the `recruit` action calls `tryBuildSystemDefenses` after troop recruitment (its observability payload adds `defense_builds`). Each type of the rampart / turret mix aims at half the target; turrets wait for `fortification` 1 (ramparts stay at their half meanwhile). "Attacked recently" = the city was a battle target in the last 6 hours (`battle.countByTargetSince`); minefields are built in batches of up to 10 then. One batch spends at most half the city stock. `fortification` was appended to the Arsenal research priority so turrets become available. The siege threshold reads "defense points > 30 % × combat troop life pool" (any defense point when the city has no combat troops); `siege_assault` is simulated first and kept only if it wins.
- **Web navigation**: the **Défense** tab is `/city/$cityId/base/defense`, reached from a new « Défense » chip in the activity strip (how the building, research and recruitment tabs are reached); the chip shows the running batch. The Enceinte card opens the regular building details (upgrade, requirement, cost) without the building-level line.

## Follow-ups

- **Artwork**: no dedicated images yet. `apps/web/src/modules/defense/image.ts` maps each defense to an existing picture, `building/image.ts` maps `city_wall` → plastic warehouse art and `technology/image.ts` maps `fortification` → assault behemoth art; replace them when `/defenses/<code>.png`, `/buildings/city_wall.png` and `/technologies/fortification.png` exist.
- **Balance**: defense stats and costs, the AI fill ratios, the 6-hour "attacked recently" window and the 30 % siege threshold need tuning with the admin simulator and the observability screen.
- **System AI and full cities**: `tryUpgrade` only starts an upgrade when the city is under its building level cap, so it does not yet start an Enceinte level in a full city (the server allows it).
- **Battery plasma**: batteries read the stored stock, not a stock gathered up to the round time; gathering first would let them use plasma produced since the last gather pulse.

## Evidence index

| Area | Paths |
| --- | --- |
| Domain | `apps/server/src/core/defense/constant/code.ts`, `characteristic.ts`, `capacity.ts`, `build-queue.ts`, `order.ts`, `apps/server/src/core/defense/entity.ts`, `build-queue-entity.ts`, `service.ts` (+ `service.spec.ts`), `error.ts` |
| Enceinte / Fortification | `apps/server/src/core/building/constant/code.ts`, `order.ts`, `apps/server/src/adapter/database/repository/building.ts` (`getTotalLevels`), `apps/server/src/app/command/building/start-upgrade.ts` (+ `upgrade.spec.ts`), `apps/server/src/core/technology/constant/code.ts`, `order.ts`, `bonus.ts`, `apps/server/src/core/technology/service.ts` (`getFortificationMultiplier`), `apps/server/src/app/service.ts` (`getFortificationMultiplier`, `getDefenseRequirementLevels`) |
| Pricing / requirements | `apps/server/src/core/pricing/constant/defense.ts`, `building.ts`, `technology.ts`, `apps/server/src/core/pricing/service.ts` (`getDefenseCost`, + `service.spec.ts`), `apps/server/src/core/requirement/constant/defense.ts`, `building.ts`, `technology.ts`, `apps/server/src/core/requirement/service.ts` |
| Combat | `apps/server/src/core/combat/combat-service.ts` (+ `defense-combat.spec.ts`), `troop-combat.ts` (`countBattlePresence`), `constant/strategy.ts`, `value/combat-strategy.ts`, `type/battle-stack.ts`, `apps/server/src/app/saga/finish/attack.ts` (+ `attack-defenses.spec.ts`), `apps/server/src/app/command/combat/advance-round.ts` (+ `advance-round-defenses.spec.ts`), `apply-battle-outcomes.ts` (+ `.spec.ts`, `city defenses`), `simulate.ts`, `apps/server/src/app/command/communication/report/create-battle.ts` (+ `create-battle-defenses.spec.ts`), `apps/server/src/adapter/database/repository/battle.ts` |
| Queue / jobs | `apps/server/src/app/command/defense/build.ts`, `start-build.ts`, `progress-build.ts`, `cancel.ts`, `cancel-queued.ts` (+ their `.spec.ts`), `apps/server/src/app/query/defense/list.ts` (+ `list.spec.ts`), `apps/server/src/adapter/job-queue/defense/build.ts`, `job-queue.ts`, `register-workers.ts`, `apps/server/src/app/port/job-queue.ts`, `apps/server/src/app/port/repository/defense.ts`, `defense-build-queue.ts`, `apps/server/src/adapter/database/repository/defense.ts`, `defense-build-queue.ts`, `apps/server/src/web/handler/defense/` (+ `list.spec.ts`), `apps/server/src/web/router.ts`, `ws.ts`, `apps/server/src/app/event-bus.ts`, `apps/server/src/core/events.ts`, `apps/server/src/app/command/player/bootstrap.ts`, `apps/server/src/app/command/city/settle.ts` (+ `settle.spec.ts`, `auth/signup.spec.ts`) |
| System AI | `apps/server/src/app/command/player/system/defenses.ts` (+ `defenses.spec.ts`), `combat-policy.ts` (+ `combat-policy-defenses.spec.ts`), `storage.ts` (+ `storage-city-wall.spec.ts`), `actions.ts`, `technologies.ts` (+ `.spec.ts`), `apps/server/src/core/player/system/ai-profile.ts` (`defense_fill_ratio`), `apps/server/src/app/query/admin/system-player-stats.ts` |
| Admin simulator | `apps/server/src/web/handler/admin/combat-simulator/post.ts`, `parse-defenses.ts` (+ `post-defenses.spec.ts`), `apps/web/src/modules/admin/combat-simulator/page.tsx` |
| API | `packages/api-client/src/endpoints/defense/`, `admin/combat-simulator.ts`, `admin/system-player-stats.ts`, `packages/api-client/src/types/report-battle.ts`, `packages/api-client/src/error/request.ts`, `packages/api-client/src/index.ts` (`DefenseCode`, `DefenseError`, `DEFENSE_BUILD_QUEUE_LIMIT`) |
| Migration | `apps/server/src/adapter/database/migrations/00012_city_defenses.ts`, `apps/server/src/adapter/database/types.ts` (`Defense`, `DefenseBuildQueue`, `battle_round` columns). Verified locally: 3 cities → 3 `city_wall` rows at level 0 and 15 `defense` rows at count 0; 3 players → 3 `fortification` rows at level 0 |
| Web | `apps/web/src/modules/defense/` (`page.tsx`, `city-wall/`, `queue/`, `list/`, `details/`, `hooks.ts`, `ws-listener.ts`, `capacity.ts`, `translations.ts`, `image.ts`, + `defense.test.ts`), `apps/web/src/routes/city/$cityId/base/defense.tsx`, `apps/web/src/ui/activity/index.tsx`, `apps/web/src/modules/building/layer.ts`, `building/list/index.tsx`, `building/details/index.tsx`, `building/details/upgrade/index.tsx`, `building/translations.ts`, `building/image.ts`, `apps/web/src/modules/technology/branch.ts`, `translations.ts`, `image.ts`, `apps/web/src/modules/movement/translations.ts`, `apps/web/src/modules/communication/report/details.tsx`, `translations.ts` (+ `defense-translations.test.ts`), `apps/web/src/modules/admin/system-player-observability/stats-panel.tsx`, `apps/web/src/helpers/error-translations.ts`, `apps/web/src/modules/auth/hooks.ts` |
