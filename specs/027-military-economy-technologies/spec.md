# Slice 027 — Military and economy technologies

**Status**: Planned.

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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Codes and order | `core/technology/constant/code.ts`, `order.ts` |
| Requirements and costs | `core/requirement/constant/technology.ts`, `core/pricing/constant/technology.ts` |
| Combat | `core/combat/combat-service.ts`, `saga/finish/attack.ts` |
| Speed | `core/troop/service.ts` (`getMovementDuration`), movement create / estimate / battle outcomes |
| Production | `core/building/service.ts`, `core/troop/service.ts`, `app/service.ts` breakdowns |
| Migration | `adapter/database/migrations/00010_military_economy_technologies.ts` |
| Web | `modules/technology/*`, `modules/communication/report/details.tsx`, `modules/admin/combat-simulator` |
