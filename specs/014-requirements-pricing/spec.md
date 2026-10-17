# Slice 014 — Requirements and pricing (cross-cutting)

**Status**: As implemented on `main` (brownfield).

## Summary

**Requirements** gate building upgrades, technology levels, and troop recruitment based on current building/technology levels. **Pricing** computes resource costs and durations (with level scaling and building/technology reductions). Commands call `RequirementService` and `PricingService`; web shows costs via `modules/cost` and `modules/requirement`.

**Out of scope**: persisting prices (all tables live in code constants).

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
| `PricingService.getBuildingLevelCost` | Plastic/mushroom + duration; `ARCHITECTURE_REDUCTION_PER_LEVEL` |
| `PricingService.getBuildingUpgradeRefund` | Partial refund on cancel |
| `PricingService.getTechnologyLevelCost` | Research lab duration reduction |
| `PricingService.getTroopCost` | Per-count cost; cloning factory + replication catalyst reductions |
| `scaleGameDurationSeconds` | Applies `gameTimeScale` from `shared/game-time-scale` |

Constants: `constant/building.ts`, `constant/technology.ts`, `constant/troop.ts`; values in `value/level.ts`, `value/count.ts`.

Tests: `apps/server/src/core/pricing/service.spec.ts`; requirement checks exercised in building/technology/troop command specs.

## Web UI

- `apps/web/src/modules/requirement/` — requirement display helpers.
- `apps/web/src/modules/cost/` — cost display components used by building/technology/troop UIs.

## API client

Requirement/pricing types are mostly server-internal; client surfaces resulting costs on entity DTOs where returned by list/get endpoints.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/requirement/`, `apps/server/src/core/pricing/` |
| Consumers | building/technology/troop commands, `LocationActivityQuery` |
| Web | `apps/web/src/modules/requirement/`, `apps/web/src/modules/cost/` |
