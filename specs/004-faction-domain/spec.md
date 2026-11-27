# Slice 004 — Faction domain vocabulary

**Status**: As implemented on `main` (brownfield).

## Summary

Factions are string enum codes shared between server core, API client, and web UI. The server distinguishes **known** factions (defined in code) from **playable** factions (known minus a non-playable set). Signup and troop initialization use playable checks; system-controlled singularity players use the non-playable faction code. **PvP**: cross-faction attacks are always allowed; same-faction attacks are forbidden ([`024`](../024-player-combat-pvp/spec.md)).

## Faction codes

Defined in `apps/server/src/core/faction/constant/code.ts`:

| Enum member | Wire value |
| --- | --- |
| `THE_CONFEDERATION` | `the_confederation` |
| `THE_TECHNOLOGICAL_SINGULARITY` | `the_technological_singularity` |
| `THE_ASH_LITURGY` | `the_ash_liturgy` |
| `THE_SYMBIOSIS` | `the_symbiosis` (La Symbiose, playable, [`036`](../036-faction-symbiosis/spec.md)) |
| `THE_BASTION_ORDER` | `the_bastion_order` (L'Ordre du Bastion, playable, [`037`](../037-faction-bastion-order/spec.md)) |

Exported to clients as `FactionCode` from `packages/api-client/src/index.ts` (re-export from server core).

## Playable vs non-playable

`apps/server/src/core/faction/constant/playable.ts`:

- `non_playable_faction_codes`: `Set` containing `FactionCode.THE_TECHNOLOGICAL_SINGULARITY` and `FactionCode.THE_ASH_LITURGY`.
- `playableFactionCodes()`: all `FactionCode` values not in that set (today: `the_confederation`, `the_symbiosis` ([`036`](../036-faction-symbiosis/spec.md)) and `the_bastion_order` ([`037`](../037-faction-bastion-order/spec.md)).

## Domain service

`FactionService` (`apps/server/src/core/faction/service.ts`):

| Method | Behavior |
| --- | --- |
| `isKnown` / `assertKnown` | Code is in `Object.values(FactionCode)` |
| `isPlayable` / `assertPlayable` | Known and not in `non_playable_faction_codes` |
| `getProductionMultipliers` | Per-resource production multiplier of a faction from `faction_production_modifier` (`constant/production-modifier.ts`, slice [`036`](../036-faction-symbiosis/spec.md)); neutral (1) when unset |
| `getGarrisonLifeMultiplier` | Life multiplier of the city owner's own combat stacks when their city is attacked, from `faction_garrison_life_modifier` (`constant/garrison-modifier.ts`, slice [`037`](../037-faction-bastion-order/spec.md): Bastion 1.15); neutral (1) when unset |
| `getLogisticsModifier` | Carrier capacity and non-combat movement speed multipliers of a faction, from `faction_logistics_modifier` (`constant/logistics-modifier.ts`, slice [`039`](../039-confederation-identity/spec.md): Confederation 1.10 / 1.05); neutral (1 / 1) when unset |

**Errors** (`apps/server/src/core/faction/error.ts`, exported as `FactionError`):

| Code | When |
| --- | --- |
| `faction:not-found` | Unknown code (`assertKnown` / `assertPlayable` on unknown) |
| `faction:not-playable` | Known but in `non_playable_faction_codes` |

Tests: `apps/server/src/core/faction/service.spec.ts`.

## HTTP / signup usage

- `signupAuth` calls `FactionService.assertPlayable(faction_code)` before bootstrap (`apps/server/src/app/command/auth/signup.ts`).
- Handler missing `faction_code` → `400` + `faction_code:not-found` (`RequestError.FACTION_CODE_NOT_FOUND`).
- Invalid faction from command → `200` + `faction:not-found` or `faction:not-playable` via error middleware.

Tests: `apps/server/src/app/command/auth/signup.spec.ts` (unknown faction, singularity and ash liturgy non-playable, `the_symbiosis` and `the_bastion_order` accepted with their own rosters).

## Troop initialization

`TroopService.init` / `TroopService.codesForFaction(faction_code)` use faction to determine which troop codes get zero-count stacks at city bootstrap (`signup.spec.ts` asserts count = `TroopService.codesForFaction(faction_code).length`). PvP adds **four** faction-exclusive combat `TroopCode`s per faction (roster in [`024`](../024-player-combat-pvp/spec.md); La Symbiose's nine codes in [`036`](../036-faction-symbiosis/spec.md), L'Ordre du Bastion's nine codes in [`037`](../037-faction-bastion-order/spec.md)).

## Web UI

| Path | Role |
| --- | --- |
| `apps/web/src/modules/faction/translations.ts` | French display names for every `FactionCode` (including singularity) |
| `apps/web/src/modules/auth/signup-form.tsx` | One radio card per `playableFactionCodes()` entry: name, short lore and playstyle (`FactionTranslations[code].lore` / `.playstyle`, slice [`036`](../036-faction-symbiosis/spec.md)) |

Signup form default selection: `FactionCode.THE_CONFEDERATION`.

## API client

- `FactionCode`, `playableFactionCodes`, `FactionError` exported from `packages/api-client/src/index.ts`.
- `SignupRequest.faction_code` typed as `FactionCode` (`packages/api-client/src/endpoints/player/signup.ts`).

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/faction/{constant/code,constant/playable,constant/production-modifier,constant/garrison-modifier,error,service}.ts` |
| Consumers | `apps/server/src/app/command/auth/signup.ts`, `apps/server/src/core/troop/service.ts` |
| Client | `packages/api-client/src/index.ts`, `endpoints/player/signup.ts` |
| Web | `apps/web/src/modules/faction/translations.ts`, `apps/web/src/modules/auth/signup-form.tsx` |
