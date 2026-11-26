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

## Plasma

Plasma is a **spendable** resource ([`026`](../026-plasma-economy/spec.md)): produced by the `central_inductor` into the city cell's stock (unlimited storage), it can be priced in building / technology / troop cost tables ([`014`](../014-requirements-pricing/spec.md)), is debited by `purchaseResourceStock` with plastic and mushroom and refunded by the same cancel rules. No current content costs plasma.

### Loot ratio

After an attacker win with surviving carriers ([`024`](../024-player-combat-pvp/spec.md)), each resource is looted in order plastic → mushroom → plasma as `min(floor(stock × ratio), remaining capacity)`:

| Resource | Lootable share of defender stock |
| --- | --- |
| plastic | 50 % |
| mushroom | 50 % |
| plasma | 25 % |

Constant: `combat_loot_ratio` in `apps/server/src/core/combat/constant/loot.ts`; applied by `lootFromStock` in `apps/server/src/app/command/combat/apply-battle-outcomes.ts`.

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
