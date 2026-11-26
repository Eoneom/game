# Slice 029 — City defenses

**Status**: Planned.

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
| Plasma battery | `attack × firing × fortification`, `firing = min(count, floor(city_plasma / 5))`; spends `5 × firing` plasma | `life × count × fortification` |
| Shield generator | 0 | `life × count × fortification` |

- Strategy multipliers and Arsenal modifiers ([`027`](../027-military-economy-technologies/spec.md)) do **not** apply to defenses; only Fortification does.
- **Shield**: after computing the attacker's attack pool, multiply it by `1 − min(0.30, 0.02 × surviving_shield_generators)`.
- **Exposure** (homogeneous army) ignores defense stacks when counting classes.
- Plasma spent by batteries is debited from the city stock during the round. Loot is computed on the remaining stock.

### Casualty order (defender)

| Attacker strategy | Order |
| --- | --- |
| Any except `siege_assault` | Rampart → combat troops (current focus rules) → turret → plasma battery → shield generator → carrier → civilian → scout |
| `siege_assault` | Rampart → shield generator → plasma battery → turret → combat troops → carrier → civilian → scout |

Within a defense type, whole units are removed as for troops.

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

## Out of scope

- Faction-specific defenses (with the new factions, slices `036` / `037`).
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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Domain | `core/defense/` (code, characteristics, service, entity, errors) |
| Pricing / requirements | `core/pricing/constant/defense.ts`, `core/requirement/constant/defense.ts` |
| Combat | `core/combat/combat-service.ts`, `core/combat/constant/strategy.ts`, `core/combat/type/battle-stack.ts`, `app/saga/finish/attack.ts`, `app/command/combat/apply-battle-outcomes.ts` |
| Queue / jobs | `app/command/defense/`, `adapter/job-queue/defense/` |
| System AI | `app/command/player/system/defenses.ts`, `combat-policy.ts` |
| Web | `modules/defense/`, city shell tab, `modules/communication/report/details.tsx`, `modules/admin/combat-simulator` |
