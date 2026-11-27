# Slice 014 — Requirements and pricing (cross-cutting)

**Status**: As implemented on `main` (brownfield).

## Summary

**Requirements** gate building upgrades, technology levels, and troop recruitment based on current building/technology levels. **Pricing** computes resource costs and durations (with level scaling and building/technology reductions). Commands call `RequirementService` and `PricingService`; web shows costs via `modules/cost` and `modules/requirement`.

**Out of scope**: persisting prices (all tables live in code constants).

**Pacing**: gather interval and early-game timing targets — [`022`](../022-timing-and-resources/spec.md).

## Domain — requirements (`core/requirement/`)

| API | Role |
| --- | --- |
| `RequirementService.checkBuildingRequirement` | Uses `BuildingRequirement` map |
| `RequirementService.checkTechnologyRequirement` | Uses `TechnologyRequirement` + research-lab offset |
| `RequirementService.checkTroopRequirement` | Uses `TroopRequirement` map |
| `RequirementService.checkDefenseRequirement` | Uses `DefenseRequirement` map ([`029`](../029-city-defenses/spec.md); buildings checked in the defense's city) |
| `RequirementService.checkRequirement` | Shared evaluator on `RequirementValue` |

| `RequirementError` | Meaning |
| --- | --- |
| `requirement:building-not-fulfilled` | Missing building level |
| `requirement:technology-not-fulfilled` | Missing technology level |

Constants: `constant/building.ts`, `constant/technology.ts`, `constant/troop.ts`, `constant/defense.ts`.

## Domain — pricing (`core/pricing/`)

| API | Role |
| --- | --- |
| `PricingService.getBuildingLevelCost` | Plastic/mushroom/plasma + duration; `ARCHITECTURE_REDUCTION_PER_LEVEL` (duration only) |
| `PricingService.getBuildingUpgradeRefund` | Partial refund on cancel: `round(cost / 2)` per resource, plasma included |
| `PricingService.getTechnologyResearchRefund` | Partial refund on research cancel: `round(cost / 2)` per resource, plasma included |
| `PricingService.getTechnologyLevelCost` | Plastic/mushroom/plasma; research lab duration reduction |
| `PricingService.getTroopCost` | Per-count cost (plasma = per-unit plasma × count); cloning factory + replication catalyst reductions (duration only). Troop cancel refunds the full remaining cost, plasma included |
| `PricingService.getDefenseCost` | Per-count defense cost ([`029`](../029-city-defenses/spec.md)): resources × count (plasma for shield generators and plasma batteries); duration × count × `(1 − 1/10)^city_wall_level`, game time scaled like troops. Fortification cancel refunds the full remaining cost |
| `scaleGameDurationSeconds` | Applies `gameTimeScale` from `shared/game-time-scale` |

Constants: `constant/building.ts`, `constant/technology.ts`, `constant/troop.ts`; values in `value/level.ts`, `value/count.ts`.

**Plasma** ([`026`](../026-plasma-economy/spec.md)): `LevelCosts.plasma?: LevelCost` (same `ceil(base × multiplier^(level−1))` curve, no level reduction) and `CountCosts.plasma?: number` (per unit). Absent means a plasma cost of `0`. The Arsenal technologies of slice [`027`](../027-military-economy-technologies/spec.md) are the first to set one. Purchases debit plasma with plastic and mushroom and fail with `city:not-enough-resources` when short.

**Slice 027 technologies** ([`027`](../027-military-economy-technologies/spec.md)) — requirements (`constant/technology.ts` in `core/requirement/`; buildings checked in the research city) and costs (`base` / `multiplier`):

| Code | Buildings | Technologies | Plastic | Mushroom | Plasma | Duration (s) |
| --- | --- | --- | --- | --- | --- | --- |
| `ballistic_alloys` | `research_lab` 5, `central_inductor` 1 | — | 8000 / 1.7 | 6000 / 1.7 | 500 / 1.7 | 180 / 2 |
| `organic_plating` | `research_lab` 5, `central_inductor` 1 | — | 6000 / 1.7 | 8000 / 1.7 | 500 / 1.7 | 180 / 2 |
| `tactical_propulsion` | `research_lab` 6, `central_inductor` 2 | — | 10000 / 1.8 | 8000 / 1.8 | 800 / 1.8 | 240 / 2 |
| `advanced_recycling` | `research_lab` 3 | — | 4000 / 1.6 | 3000 / 1.6 | — | 90 / 2 |
| `agronomy` | `research_lab` 3 | — | 3000 / 1.6 | 4000 / 1.6 | — | 90 / 2 |
| `storage_compression` | `research_lab` 4 | `architecture` 3 | 5000 / 1.7 | 5000 / 1.7 | — | 120 / 2 |
| `plasma_containment` | `research_lab` 5, `central_inductor` 3 | — | 8000 / 1.6 | 8000 / 1.6 | — | 150 / 2 |

**Slice 029 defenses** ([`029`](../029-city-defenses/spec.md)): `city_wall` (`architecture` 2; plastic 1500 / 1.7, mushroom 1000 / 1.7, duration 150 / 1.7), `fortification` (see [`008`](../008-technology-research/spec.md)), and per-unit defense requirements and costs (`core/requirement/constant/defense.ts`, `core/pricing/constant/defense.ts`):

| Code | Buildings | Technologies | Plastic | Mushroom | Plasma | Duration (s) |
| --- | --- | --- | --- | --- | --- | --- |
| `rampart` | `city_wall` 1 | — | 800 | 400 | — | 60 |
| `turret` | `city_wall` 2 | `fortification` 1 | 1000 | 600 | — | 90 |
| `minefield` | `city_wall` 2 | — | 300 | 100 | — | 30 |
| `shield_generator` | `city_wall` 4 | `fortification` 2 | 2000 | 1500 | 200 | 240 |
| `plasma_battery` | `city_wall` 5, `central_inductor` 1 | `fortification` 3 | 1500 | 1000 | 300 | 180 |

Tests: `apps/server/src/core/pricing/service.spec.ts`; requirement checks exercised in building/technology/troop/defense command specs.

## Web UI

- `apps/web/src/modules/requirement/` — requirement display helpers.
- `apps/web/src/modules/cost/` — cost display components used by building/technology/troop UIs. Plasma is shown (with `IconPlasma`, flagged short vs city stock) only when non-zero.

## API client

Requirement/pricing types are mostly server-internal; client surfaces resulting costs on entity DTOs where returned by list/get endpoints (`upgrade_cost`, `research_cost`, troop `cost`: `plastic`, `mushroom`, `plasma`, `duration`).

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/requirement/`, `apps/server/src/core/pricing/` |
| Consumers | building/technology/troop commands, `LocationActivityQuery` |
| Web | `apps/web/src/modules/requirement/`, `apps/web/src/modules/cost/` |
