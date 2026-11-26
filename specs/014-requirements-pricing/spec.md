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
| `RequirementService.checkRequirement` | Shared evaluator on `RequirementValue` |

| `RequirementError` | Meaning |
| --- | --- |
| `requirement:building-not-fulfilled` | Missing building level |
| `requirement:technology-not-fulfilled` | Missing technology level |

Constants: `constant/building.ts`, `constant/technology.ts`, `constant/troop.ts`.

## Domain — pricing (`core/pricing/`)

| API | Role |
| --- | --- |
| `PricingService.getBuildingLevelCost` | Plastic/mushroom/plasma + duration; `ARCHITECTURE_REDUCTION_PER_LEVEL` (duration only) |
| `PricingService.getBuildingUpgradeRefund` | Partial refund on cancel: `round(cost / 2)` per resource, plasma included |
| `PricingService.getTechnologyResearchRefund` | Partial refund on research cancel: `round(cost / 2)` per resource, plasma included |
| `PricingService.getTechnologyLevelCost` | Plastic/mushroom/plasma; research lab duration reduction |
| `PricingService.getTroopCost` | Per-count cost (plasma = per-unit plasma × count); cloning factory + replication catalyst reductions (duration only). Troop cancel refunds the full remaining cost, plasma included |
| `scaleGameDurationSeconds` | Applies `gameTimeScale` from `shared/game-time-scale` |

Constants: `constant/building.ts`, `constant/technology.ts`, `constant/troop.ts`; values in `value/level.ts`, `value/count.ts`.

**Plasma** ([`026`](../026-plasma-economy/spec.md)): `LevelCosts.plasma?: LevelCost` (same `ceil(base × multiplier^(level−1))` curve, no level reduction) and `CountCosts.plasma?: number` (per unit). Absent means a plasma cost of `0`; no current building, technology or troop sets one. Purchases debit plasma with plastic and mushroom and fail with `city:not-enough-resources` when short.

Tests: `apps/server/src/core/pricing/service.spec.ts`; requirement checks exercised in building/technology/troop command specs.

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
