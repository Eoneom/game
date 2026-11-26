# Slice 027 — Military and economy technologies

**Status**: Implemented on `main` (slice 027): 7 Arsenal / Économie technologies with plasma-priced Arsenal, combat modifiers snapshotted per battle, propulsion in movement durations, production and city warehouse bonuses, system AI research order, simulator inputs, branch-grouped web list. Artwork uses placeholders (see [Follow-ups](#follow-ups)).

## Summary

Extend the technology tree ([`008`](../008-technology-research/spec.md)) from 5 to **12** technologies, grouped in branches:

- **Arsenal** — flat combat bonuses for `combat`-role troops: attack, life, speed.
- **Économie** — production bonuses (plastic, mushroom, plasma) and city warehouse capacity.

Arsenal is the **first plasma consumer** ([`026`](../026-plasma-economy/spec.md)). Économie costs plastic and mushroom only. Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`026`](../026-plasma-economy/spec.md) (plasma prices), [`008`](../008-technology-research/spec.md), [`014`](../014-requirements-pricing/spec.md), [`024`](../024-player-combat-pvp/spec.md), [`010`](../010-troop-movement-combat/spec.md) (movement duration), [`006`](../006-city-lifecycle-gathering/spec.md) / [`011`](../011-outposts/spec.md) (production), [`016`](../016-system-controlled-players/spec.md) (system AI), [`021`](../021-admin-operator-tools/spec.md) (combat simulator).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Bonus size** | Moderate, **linear**, **no level cap**: +3 % attack or life, +4 % speed, +5 % production, +10 % warehouse capacity per level. Exponential costs are the brake. |
| **Plasma** | **Arsenal** costs plasma from level 1. **Économie** costs plastic and mushroom only. |
| **Production scope** | Plastic and mushroom bonuses apply to **all** of the player's production: city buildings **and** troop earnings (cultivators / salvagers in cities and outposts). |
| **Warehouse scope** | Compression applies to **city** warehouses only (outpost capacity stays on `outpost_logistics`). |
| **Combat scope** | Arsenal bonuses apply to **`combat`-role troops only**; carriers, civilians and scouts are unchanged. |
| **Doctrines** | **Out of scope** — no new combat strategies in this slice. |
| **Elite units** | *Armes à plasma* and elite units are **out of scope** — a dedicated slice, with or after the new factions. |

## Technology catalogue

Existing technologies form the **Fondations** branch (no change): `architecture`, `replication_catalyst`, `outpost_logistics`, `outpost_expansion`, `photovoltaic_optimization`.

### New codes

| Branch | Enum member | Wire code | FR name (UI) | Effect per level |
| --- | --- | --- | --- | --- |
| Arsenal | `BALLISTIC_ALLOYS` | `ballistic_alloys` | **Alliages balistiques** | +3 % attack (`combat` role) |
| Arsenal | `ORGANIC_PLATING` | `organic_plating` | **Blindage organique** | +3 % life (`combat` role) |
| Arsenal | `TACTICAL_PROPULSION` | `tactical_propulsion` | **Propulsion tactique** | +4 % speed (`combat` role) |
| Économie | `ADVANCED_RECYCLING` | `advanced_recycling` | **Recyclage avancé** | +5 % plastic production |
| Économie | `AGRONOMY` | `agronomy` | **Agronomie** | +5 % mushroom production |
| Économie | `STORAGE_COMPRESSION` | `storage_compression` | **Compression** | +10 % city warehouse capacity |
| Économie | `PLASMA_CONTAINMENT` | `plasma_containment` | **Confinement plasma** | +5 % plasma production |

French descriptions are written at implementation in `apps/web/src/modules/technology/translations.ts`.

### Requirements ([`014`](../014-requirements-pricing/spec.md))

Building levels are checked in the city where research starts (current rule).

| Code | Buildings | Technologies |
| --- | --- | --- |
| `ballistic_alloys` | `research_lab` 5, `central_inductor` 1 | — |
| `organic_plating` | `research_lab` 5, `central_inductor` 1 | — |
| `tactical_propulsion` | `research_lab` 6, `central_inductor` 2 | — |
| `advanced_recycling` | `research_lab` 3 | — |
| `agronomy` | `research_lab` 3 | — |
| `storage_compression` | `research_lab` 4 | `architecture` 3 |
| `plasma_containment` | `research_lab` 5, `central_inductor` 3 | — |

### Costs (initial values, `base` / `multiplier`)

| Code | Plastic | Mushroom | Plasma | Duration (s) |
| --- | --- | --- | --- | --- |
| `ballistic_alloys` | 8000 / 1.7 | 6000 / 1.7 | 500 / 1.7 | 180 / 2 |
| `organic_plating` | 6000 / 1.7 | 8000 / 1.7 | 500 / 1.7 | 180 / 2 |
| `tactical_propulsion` | 10000 / 1.8 | 8000 / 1.8 | 800 / 1.8 | 240 / 2 |
| `advanced_recycling` | 4000 / 1.6 | 3000 / 1.6 | — | 90 / 2 |
| `agronomy` | 3000 / 1.6 | 4000 / 1.6 | — | 90 / 2 |
| `storage_compression` | 5000 / 1.7 | 5000 / 1.7 | — | 120 / 2 |
| `plasma_containment` | 8000 / 1.6 | 8000 / 1.6 | — | 150 / 2 |

Reference: at `central_inductor` 1 (0.1 plasma/s), 500 plasma takes about 1 h 25 min. Balance after playtests.

## Effects

All bonuses are **linear multipliers**: `1 + per_level × level`.

### Combat (Arsenal)

| Modifier | Formula | Applied to |
| --- | --- | --- |
| `attack` | `1 + 0.03 × ballistic_alloys` | `attack_capacity` of every `combat`-role stack, on top of strategy multipliers |
| `life` | `1 + 0.03 × organic_plating` | `life_capacity` of every `combat`-role stack, on top of strategy multipliers, **both** in the life pool and in the life-per-unit used to convert damage into whole-unit casualties |

- **Snapshot**: at battle start (`saga/finish/attack.ts`), each side's modifiers are read from the **owner's** technology levels and stored in `state_json` (`attacker_modifiers`, `defender_modifiers`: `{ attack, life }`). Rounds use the snapshot, never live levels. A missing field (battle started before deploy) means `{ attack: 1, life: 1 }`. No migration needed.
- **Exposure** (homogeneous army penalty) applies after the modifiers, unchanged.
- Future reinforcements from allies (slice `033`) will need per-stack modifiers; this slice assumes one owner per side.

### Speed (Arsenal)

- Effective speed of a `combat`-role unit = `speed × (1 + 0.04 × tactical_propulsion)` for its owner.
- Movement duration still uses the **slowest** unit in the movement, so carriers or civilians in an attack keep it slow.
- Applies to every duration computed for that player's troops: create, estimate, and retreat/return movements created by battle outcomes. The level is read when the movement is created; later research does not change a movement already under way.

### Production (Économie)

| Resource | Multiplier | Sources |
| --- | --- | --- |
| plastic | `1 + 0.05 × advanced_recycling` | `recycling_plant` earnings, salvager troop earnings (cities and outposts) |
| mushroom | `1 + 0.05 × agronomy` | `mushroom_farm` earnings, cultivator troop earnings (cities and outposts) |
| plasma | `1 + 0.05 × plasma_containment` | `central_inductor` earnings |

The multiplier applies to the per-second rate **before** rounding, after cell coefficients and `GAME_TIME_SCALE`. The city and outpost production breakdowns (header earnings per minute) include the bonus. The breakdown exposes the technology multiplier so the UI can show it next to the cell bonus.

### Warehouses (Économie)

City `plastic_warehouse` and `mushroom_warehouse` capacity × `1 + 0.10 × storage_compression`. Plasma storage stays unlimited.

## System players

- Append to `SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY`, after the current entries: `agronomy`, `advanced_recycling`, `storage_compression`, `plasma_containment`, `ballistic_alloys`, `organic_plating`, `tactical_propulsion`.
- The Ash Liturgy aggressive profile ([`025`](../025-lawless-human-faction/spec.md)) moves the three Arsenal codes ahead of Économie.
- The central inductor rank in `storage.ts` may need a bump so plasma is available for Arsenal research. Validate with the observability screen.

## Admin combat simulator

`POST /admin/combat-simulator` accepts optional per-side technology levels (`ballistic_alloys`, `organic_plating`; default `0`). The page adds two numeric inputs per side.

## Web UI

| Surface | Change |
| --- | --- |
| Technology list | Group by branch (**Fondations**, **Arsenal**, **Économie**) using a web constant `technology_branch`. Show plasma cost via `Cost` ([`026`](../026-plasma-economy/spec.md)). |
| Technology artwork | One image per new code (`technology/image.ts`); placeholder acceptable for first merge if tracked in tasks. |
| Battle report details | Show each side's attack / life modifiers (e.g. "+9 % attaque, +6 % vie") when not 1. |
| Production breakdown (header / city) | Show the technology production bonus. |

## Persistence

- Migration `00010_military_economy_technologies.ts`: backfill one `technology` row at level 0 per player for each of the 7 new codes (same pattern as `00008_outpost_expansion_technology.ts`).
- No schema change: modifiers live in `battle.state_json`.

## Testing

| Area | Cases |
| --- | --- |
| Pricing | New tables return plasma for Arsenal, 0 for Économie. |
| Combat | Attack/life modifiers scale pools; life modifier changes casualties; snapshot is used even if levels change mid-battle; missing snapshot = 1. |
| Speed | Propulsion shortens combat-only movements; a carrier in the movement keeps the slower speed; retreat uses the bonus. |
| Production | City building and outpost troop earnings include the multiplier; plasma containment boosts inductor; compression scales city warehouses only. |
| Migration | Existing players get 7 new rows at level 0. |
| System AI | Priority order includes new codes; Ash Liturgy profile puts Arsenal first. |

## Out of scope

- Doctrines and new combat strategies (*Flanc mobile*, *Guerre d'usure*) — later, if needed.
- *Armes à plasma* and elite units (dedicated slice).
- *Assaut de siège* strategy and Fortification branch (slice `029`).
- Renseignement branch: espionage, detection (slice `030`).
- Cartography (waits for the map rework).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`008`](../008-technology-research/spec.md) | New codes and branches. |
| [`014`](../014-requirements-pricing/spec.md) | Requirements and costs of new codes. |
| [`024`](../024-player-combat-pvp/spec.md) | Technology modifiers in pools and casualties. |
| [`010`](../010-troop-movement-combat/spec.md) | Propulsion in movement duration. |
| [`016`](../016-system-controlled-players/spec.md) | Research priority. |
| [`021`](../021-admin-operator-tools/spec.md) | Simulator technology inputs. |

## Implementation notes

- **Casualties**: the engine has no separate per-unit life in the casualty formula — `loss_budget = max(1, floor(attack_pool / life_pool))` ([`024`](../024-player-combat-pvp/spec.md)). The life modifier scales `life_pool`, which is what converts damage into whole-unit casualties, so it lowers losses as specified.
- **Retreat**: battle retreats place surviving attackers on the origin cell instantly (no movement), so propulsion has nothing to shorten there. It applies to every movement that does have a duration: create, estimate, and return trips (`createReturnBaseTrip`: explore, transport, rebase).
- **Troop earnings**: only outposts have troop earnings (cities produce through buildings only), so the plastic / mushroom bonus covers city buildings and outpost salvagers / cultivators.
- **Building details** (`GET /building`) apply the same production and compression bonuses to `current_production` / `next_production` and `current_capacity` / `next_capacity`, and the system AI warehouse projection (`projectWarehousesCapacity`) applies compression, so they match the city readouts.
- **Missing technology rows** count as level 0 when reading bonuses (`AppService.getTechnologyLevels`).
- **Report modifiers**: `report_battle` is unchanged; `CommunicationGetReportQuery` adds `attacker_modifiers` / `defender_modifiers` from `battle.state_json` (neutral when absent).
- **Central inductor rank** (`system/storage.ts`): unchanged. It already ranks 2 once core production is satisfied (same tier as warehouses, before core production at 4), and Arsenal requires only inductor 1–2, so system players reach plasma before Arsenal research becomes eligible. Not yet validated on the observability screen.
- **Admin simulator wire**: `attacker_technology_levels` / `defender_technology_levels` (`{ ballistic_alloys?, organic_plating? }`); invalid level → `technology_level:not-found`.

## Follow-ups

- **Artwork**: no dedicated images yet. `technology/image.ts` maps the 7 codes to existing pictures (Arsenal → combat troop portraits, Économie → matching building art) until `/technologies/<code>.png` exists; remove each placeholder entry when its image lands.
- **Balance**: validate costs and the system AI (central inductor rank, Arsenal timing) on the observability screen after playtests.

## Evidence index

| Area | Paths |
| --- | --- |
| Codes and order | `apps/server/src/core/technology/constant/code.ts`, `order.ts`, `bonus.ts` (`technology_bonus_per_level`), `apps/server/src/core/technology/service.ts` (`getBonusMultiplier`, `getCombatModifiers`, `getProductionMultipliers`) |
| Requirements and costs | `apps/server/src/core/requirement/constant/technology.ts`, `apps/server/src/core/pricing/constant/technology.ts`, `apps/server/src/core/pricing/service.spec.ts` (`military and economy technologies`) |
| Combat | `apps/server/src/core/combat/combat-service.ts` (+ `.spec.ts`, `technology modifiers`), `apps/server/src/core/combat/type/battle-stack.ts` (`CombatModifiers`, `state_json` snapshot), `apps/server/src/app/saga/finish/attack.ts` (+ `.spec.ts`), `apps/server/src/app/command/combat/advance-round.ts` (+ `.spec.ts`), `apps/server/src/app/query/communication/report/get.ts` (+ `.spec.ts`) |
| Speed | `apps/server/src/core/troop/service.ts` (`getMovementDuration`, `getEffectiveSpeed`, + `.spec.ts`), `apps/server/src/app/command/troop/movement/create.ts`, `shared.ts` (`createReturnBaseTrip`), `apps/server/src/app/query/troop/movement/estimate.ts` (+ `estimate.spec.ts`, `rebase.spec.ts`) |
| Production and warehouses | `apps/server/src/core/building/service.ts`, `apps/server/src/core/troop/service.ts` (`technology_multiplier`), `apps/server/src/app/service.ts` (breakdowns expose `technology_production_multiplier`; `getCityWarehousesCapacity` applies `storage_compression`), `apps/server/src/app/service.spec.ts`, `apps/server/src/core/building/service.spec.ts`, `apps/server/src/app/query/building/get.ts` (+ `.spec.ts`, building details current / next production and capacity), `apps/server/src/app/command/player/system/pending-upgrades.ts` (+ `.spec.ts`, system AI projected capacity) |
| API | `packages/api-client/src/endpoints/city/get.ts`, `outpost/get.ts` (`technology_production_multiplier`), `packages/api-client/src/types/report-battle.ts` (modifiers), `packages/api-client/src/endpoints/admin/combat-simulator.ts`, `packages/api-client/src/error/request.ts` |
| Migration | `apps/server/src/adapter/database/migrations/00010_military_economy_technologies.ts` (verified locally: existing player gets the 7 rows at level 0, existing rows untouched) |
| System AI | `apps/server/src/app/command/player/system/technologies.ts` (+ `.spec.ts`), `apps/server/src/core/player/system/ai-profile.ts` (`research_arsenal_first`, + `.spec.ts`), `apps/server/src/app/command/player/system/actions.ts` (`tryResearch`) |
| Admin simulator | `apps/server/src/web/handler/admin/combat-simulator/post.ts` (+ `.spec.ts`), `apps/web/src/modules/admin/combat-simulator/page.tsx` |
| Web | `apps/web/src/modules/technology/branch.ts` (+ `branch.test.ts`), `translations.ts`, `image.ts`, `list/index.tsx`, `apps/web/src/ui/list/index.tsx` (groups), `apps/web/src/modules/communication/report/details.tsx`, `translations.ts` (`formatCombatModifiers`, + test), `apps/web/src/ui/production-terrain-readout.tsx` (+ test), `apps/web/src/modules/city/page.tsx`, `apps/web/src/modules/outpost/page.tsx` |
