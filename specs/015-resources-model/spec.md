# Slice 015 — Resources model

**Status**: As implemented on `main` (brownfield).

## Summary

In-game **resources** are plastic, mushroom, and plasma (`shared/resource`). Each world cell can hold a **resource stock** (amounts + last gather timestamps). Cities and outposts gather passively into stock subject to **warehouse capacity** (buildings for cities, logistics for outposts). `ResourcesService` centralizes gather math, capping, affordability checks, and initial stock rolls.

**Depends on**: buildings/outposts for capacity and earnings ([`007`](../007-buildings-upgrade-queue/spec.md), [`011`](../011-outposts/spec.md)).

## Resource stock

Persistence via `resource_stock` repository adapter; errors:

| `ResourceStockError` | Meaning |
| --- | --- |
| `resource-stock:not-found` | No stock row for cell |

Tests: `apps/server/src/core/resources/service.spec.ts`, `service.deposit.spec.ts`.

## `ResourcesService` behaviors (evidenced in code/tests)

| Method | Role |
| --- | --- |
| `randomResourceStockState` | New cell: independent uniform ints in `[0, STARTING_*]` per resource |
| `firstCityCanonicalResourceStockState` | Signup main city: full `STARTING_PLASTIC` / `STARTING_MUSHROOM` |
| `emptyResourceStockState` | Zero stock with gather timestamps |
| `gatherResourceStock` | Per-resource earnings since last gather, capped by warehouse capacity |
| `getEarnings` / `getCappedEarnings` | Time delta × rate, respect capacity |
| `assertCanAfford` / `pay` | Spend plastic/mushroom/plasma; throws `city:not-enough-resources` |

Starting constants: `apps/server/src/core/city/constant` (`STARTING_MUSHROOM`, `STARTING_PLASTIC`).

## Consumers

- `cityGather` / outpost gather commands.
- Building upgrade, technology research, troop recruit (via command + `ResourcesService.pay`).
- Movement transport saga (resource deposit/withdraw).

## Web UI

`apps/web/src/helpers/energy.ts` — energy display helpers tied to building production/consumption (not separate plasma UI everywhere).

## API client

Resource amounts appear on city/outpost/troop DTOs where exposed by queries; no standalone “resources” REST resource.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/resources/`, `apps/server/src/shared/resource.ts` |
| Adapters | `apps/server/src/adapter/database/repository/resource-stock/` |
| Commands | city/outpost gather, building/technology/troop spends |
