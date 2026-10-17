# Slice 004 — Faction domain vocabulary

**Status**: As implemented on `main` (brownfield).

## Summary

Factions are string enum codes shared between server core, API client, and web UI. The server distinguishes **known** factions (defined in code) from **playable** factions (known minus a non-playable set). Signup and troop initialization use playable checks; system-controlled singularity players use the non-playable faction code.

## Faction codes

Defined in `apps/server/src/core/faction/constant/code.ts`:

| Enum member | Wire value |
| --- | --- |
| `THE_CONFEDERATION` | `the_confederation` |
| `THE_TECHNOLOGICAL_SINGULARITY` | `the_technological_singularity` |

Exported to clients as `FactionCode` from `packages/api-client/src/index.ts` (re-export from server core).

## Playable vs non-playable

`apps/server/src/core/faction/constant/playable.ts`:

- `non_playable_faction_codes`: `Set` containing `FactionCode.THE_TECHNOLOGICAL_SINGULARITY`.
- `playableFactionCodes()`: all `FactionCode` values not in that set (today: only `the_confederation`).

## Domain service

`FactionService` (`apps/server/src/core/faction/service.ts`):

| Method | Behavior |
| --- | --- |
| `isKnown` / `assertKnown` | Code is in `Object.values(FactionCode)` |
| `isPlayable` / `assertPlayable` | Known and not in `non_playable_faction_codes` |

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

Tests: `apps/server/src/app/command/auth/signup.spec.ts` (unknown faction, singularity non-playable).

## Troop initialization

`TroopService.init` / `TroopService.codesForFaction(faction_code)` use faction to determine which troop codes get zero-count stacks at city bootstrap (`signup.spec.ts` asserts count = `TroopService.codesForFaction(faction_code).length`).

## Web UI

| Path | Role |
| --- | --- |
| `apps/web/src/modules/faction/translations.ts` | French display names for every `FactionCode` (including singularity) |
| `apps/web/src/modules/auth/signup-form.tsx` | Radio list from `playableFactionCodes()` only |

Signup form default selection: `FactionCode.THE_CONFEDERATION`.

## API client

- `FactionCode`, `playableFactionCodes`, `FactionError` exported from `packages/api-client/src/index.ts`.
- `SignupRequest.faction_code` typed as `FactionCode` (`packages/api-client/src/endpoints/player/signup.ts`).

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/faction/{constant/code,constant/playable,error,service}.ts` |
| Consumers | `apps/server/src/app/command/auth/signup.ts`, `apps/server/src/core/troop/service.ts` |
| Client | `packages/api-client/src/index.ts`, `endpoints/player/signup.ts` |
| Web | `apps/web/src/modules/faction/translations.ts`, `apps/web/src/modules/auth/signup-form.tsx` |
