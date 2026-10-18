# Slice 022 — Timing and resource pacing

**Status**: As implemented on `main` (brownfield).

## Summary

Global **timing harmonization** for cities and outposts: one ruleset per location (no empire-size multiplier). **Passive gather** stays on a fixed **5s real-time** pulse; pacing is tuned through **pricing tables** ([`014`](../014-requirements-pricing/spec.md)) and, only where unlocks fight pacing, **requirements** ([`014`](../014-requirements-pricing/spec.md)). Resource accrual and caps remain as in [`015`](../015-resources-model/spec.md). Building upgrades and queues are unchanged in shape ([`007`](../007-buildings-upgrade-queue/spec.md)); city gather jobs unchanged ([`006`](../006-city-lifecycle-gathering/spec.md)).

`GAME_TIME_SCALE` still scales durations and earnings via `scaleGameDurationSeconds` and `BuildingService.getEarningsBySecond` — behavior unchanged.

## Design principles

| Principle | Rule |
| --- | --- |
| No empire multiplier | Every city/outpost uses the same gather interval and pricing; founding more cities does not slow pulses. |
| Gather pulse fixed | `CITY_RESOURCES_GATHER_INTERVAL_MS` = **5000** (and matching outpost gather cadence). Do not rebalance by changing gather architecture or interval constants. |
| Balance levers | `core/pricing/constant/*` (cost + duration `base` / `multiplier`), `GAME_PRICING_SPEED` in `core/pricing/constant/pace.ts` (global cost + duration pace before `scaleGameDurationSeconds`), plus minimal `core/requirement/*` tweaks. |
| Early hook | First **meaningful** building upgrade (starter city, typical first production or warehouse path) completes in **~22–23s real time** at `GAME_TIME_SCALE=1` and `GAME_PRICING_SPEED=2`, affordable from signup stock. |
| Mid / late | Steeper **level multipliers** on duration and resource costs; no new mechanics. |
| Earnings | Production rates stay in `core/building/constant/earnings.ts`; scaled by cell coefficients and `gameTimeScale` as today. |

## Milestones (`GAME_TIME_SCALE=1`, starter city)

Assumptions: coefficient **1.0** on main resources, mushroom farm / recycling plant / solar panel already at **level 1** after signup (other buildings at **0**), signup stock (`STARTING_PLASTIC` / `STARTING_MUSHROOM`), no architecture/research reductions. First **player-driven** upgrade is typically **1→2** on production, warehouses, or solar.

| Milestone | Target (real time) | How verified |
| --- | --- | --- |
| Gather tick | **5s** | `apps/server/src/app/scheduling/intervals.ts` |
| First building **0→1** (warehouse path) or **1→2** (pre-built production/solar) | **~22–23s** build duration | `PricingService.getBuildingLevelCost` level 1 (warehouses) or level 2 (starter production/solar) → `duration` ≈ 23 at `GAME_PRICING_SPEED=2` for the first meaningful upgrade after signup |
| Early cadence | **~2 meaningful builds/minute** after hook | Level-2+ costs/durations rise via multipliers; second upgrade often **~30–48s** after the first finishes when paying from production (path-dependent) |
| Mid / late | Slower than early | Higher levels use sharpened `multiplier` on `duration` and resources in `building_costs` (and parallel tables for tech/troops where listed below) |

### Canonical first-upgrade paths

| Building | Level | Plastic | Mushroom | Duration (s) |
| --- | --- | ---: | ---: | ---: |
| `RECYCLING_PLANT` | 1 | 100 | 50 | 23 |
| `MUSHROOM_FARM` | 1 | 50 | 100 | 23 |
| `PLASTIC_WAREHOUSE` | 1 | 125 | 125 | 23 |
| `SOLAR_PANEL` | 1 | 50 | 100 | 23 |

Values above are after `GAME_PRICING_SPEED=2` (`PRICING_PACE_MULTIPLIER=0.5`) in `PricingService`, before `scaleGameDurationSeconds`.

At production **level 1**, plastic earnings ≈ **1.8/s** per unit coefficient (`building_earnings` base), so each **5s** gather adds ≈ **9** plastic before warehouse cap — used to pace upgrades after the first build.

### Script check

`apps/server/scripts/timing-check.mts` (run with `yarn tsx scripts/timing-check.mts` from `apps/server`) prints level-1 costs/durations and a simple two-step production sequence.

## Constants touched (this slice)

| File | Change |
| --- | --- |
| `apps/server/src/core/pricing/constant/building.ts` | Early building `duration.base` → **45** for production + warehouses; sharpened level **multipliers** on resources and duration; mid/late buildings (research lab, cloning factory, central inductor) steeper curves. |
| `apps/server/src/core/pricing/constant/pace.ts` | `GAME_PRICING_SPEED=2` halves resource costs and table durations in `PricingService` before `scaleGameDurationSeconds`. |
| `apps/server/src/app/command/building/cancel.spec.ts` | Refund golden values after mushroom farm cost curve change. |

Technology and troop pricing tables were reviewed; pace multiplier applies uniformly via `PricingService` (first actions remain building upgrades).

## Evidence index

| Area | Paths |
| --- | --- |
| Gather interval | `apps/server/src/app/scheduling/intervals.ts`, [`006`](../006-city-lifecycle-gathering/spec.md) |
| Pricing | `apps/server/src/core/pricing/`, [`014`](../014-requirements-pricing/spec.md) |
| Resources | [`015`](../015-resources-model/spec.md) |
| Buildings | [`007`](../007-buildings-upgrade-queue/spec.md) |
| Tests | `apps/server/src/core/pricing/service.spec.ts` |
