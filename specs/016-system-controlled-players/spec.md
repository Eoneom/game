# Slice 016 — System-controlled players

**Status**: As implemented on `main` (brownfield).

## Summary

The server maintains **system-controlled** players (non-human opponents) that cannot log in (`player:system-controlled`). On boot, `ensureSystemPlayer` creates one singularity-faction player named `Alpha` with city `Core I` if none exist. A recurring **system player tick** job rotates scripted actions (upgrade, research, recruit, explore, base, settle, make-permanent, transport) until one succeeds per tick.

**Depends on**: faction ([`004`](../004-faction-domain/spec.md)), bootstrap ([`003`](../003-player-registration-signup/spec.md)), all game commands invoked by tick actions.

## Boot

`apps/server/src/index.ts`:

1. `ensureSystemPlayer()` — returns existing `player_id` or bootstraps with `system_controlled: true`.
2. `ensureSystemPlayerTickScheduled({ tick_index: 0 })`.

Constants (`core/player/constant/system.ts`):

| Constant | Value |
| --- | --- |
| `SYSTEM_PLAYER_NAME` | `Alpha` |
| `SYSTEM_PLAYER_FACTION_CODE` | `the_technological_singularity` |
| `SYSTEM_FIRST_CITY_NAME` | `Core I` (roman numerals via `systemCityName`) |

## Tick pipeline

| Piece | Role |
| --- | --- |
| `SYSTEM_PLAYER_TICK_QUEUE` | pg-boss stately queue |
| `tickSystemPlayers` | Lists `repository.player.listSystemControlled()`, runs `actForSystemPlayer` per player, schedules next tick |
| `categoriesForTick` | Rotates action order by `tick_index` |
| `systemTickActions` | Per-category handlers in `app/command/player/system/actions.ts` |
| `actForSystemPlayer` | First action returning `true` wins the tick |
| `storage.ts` | Warehouse pressure threshold and upgrade / transport helpers |

Interval: `SYSTEM_PLAYER_TICK_INTERVAL_MS` (`app/scheduling/intervals`).

## Warehouse storage awareness

System tick actions use `CityGetQuery` warehouse fields (`warehouses_capacity`, `resource_stock`, `warehouse_space_remaining`) — same capacity math as human city reads; no duplicate domain logic.

**Pressure threshold**: a plastic or mushroom stock counts as pressured when `stock >= capacity × 0.7`. This matches the web header warehouse progress warn level (`HeaderResourcesItem` `warnCapacity`).

**Upgrade** (`tryUpgrade`): when the city is under warehouse pressure **or** `production_energy_ratio < 1`, eligible buildings are sorted before the first affordable upgrade is chosen:

1. **Energy** (`solar_panel`) when energy-starved (`production_energy_ratio < 1`).
2. Warehouse for each pressured resource (`plastic_warehouse` / `mushroom_warehouse`).
3. Other warehouses.
4. Non-production buildings (labs, etc.).
5. Production buildings (`recycling_plant`, `mushroom_farm`, `central_inductor`) — deprioritized while energy-starved.

When not pressured, building iteration order is unchanged (repository list order).

**Transport** (`tryTransport`): cargo sent to the first city is capped per resource to `min(origin stock, destination warehouse_space_remaining)`, matching `depositUpToCapacity` on arrival. Plasma is not warehouse-capped. If capped cargo is empty, the outpost is skipped.

Tests: `apps/server/src/app/command/player/ensure-system.spec.ts`, `system/tick.spec.ts`, `system/actions.spec.ts`, `system/policy.spec.ts`, `core/player/constant/system.spec.ts`.

## Player errors (relevant)

| `PlayerError` | Meaning |
| --- | --- |
| `player:system-controlled` | Login blocked for system players |
| `player:not-found` / `player:already-exists` | Bootstrap edge cases |

## Out of scope

Human signup/login ([`002`](../002-player-session-auth/spec.md), [`003`](../003-player-registration-signup/spec.md)).

## Evidence index

| Area | Paths |
| --- | --- |
| Commands | `apps/server/src/app/command/player/ensure-system.ts`, `system/{tick,policy,actions}.ts` |
| Jobs | `apps/server/src/adapter/job-queue/player/system-tick.ts` |
| Core | `apps/server/src/core/player/constant/system.ts` |
