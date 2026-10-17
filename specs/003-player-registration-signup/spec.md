# Slice 003 — Player registration (signup) and bootstrap

**Status**: As implemented on `main` (brownfield).

## Summary

`POST /player/signup` creates a new human player, their first city on the world grid, and initial buildings, technologies, troops, resource stock, and exploration visibility. The HTTP response returns `player_id` and `city_id` only—**no session token**. The web client calls `POST /player/login` immediately after signup (`useSignup` in `apps/web/src/modules/auth/hooks.ts`).

Signup delegates to `signupAuth` → `bootstrapPlayer` (`apps/server/src/app/command/auth/signup.ts`, `apps/server/src/app/command/player/bootstrap.ts`).

## HTTP contract

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `POST` | `/player/signup` | None | `signupHandler` (`apps/server/src/web/handler/player/signup.ts`) |

**Request** (JSON):

```json
{
  "player_name": "<string>",
  "city_name": "<string>",
  "faction_code": "<FactionCode>"
}
```

Types: `packages/api-client/src/endpoints/player/signup.ts` (`FactionCode` from `apps/server/src/core/faction/constant/code.ts`).

**Success** — HTTP `200`:

```json
{
  "status": "ok",
  "data": {
    "player_id": "<uuid>",
    "city_id": "<uuid>"
  }
}
```

**Validation errors** (handler, HTTP `400`):

| Missing field | `error_code` |
| --- | --- |
| `player_name` | `player_name:not-found` |
| `city_name` | `city_name:not-found` |
| `faction_code` | `faction_code:not-found` |

**Domain errors** (command throws; error middleware HTTP `200`, `status: nok`, `error_code` = thrown message):

| Condition | `error_code` |
| --- | --- |
| Player name taken | `player:already-exists` |
| City name taken | `city:already-exists` |
| Unknown faction | `faction:not-found` |
| Non-playable faction | `faction:not-playable` |

Faction rules: `FactionService.assertPlayable` in `signupAuth` (see `specs/004-faction-domain/spec.md`).

Tests: `apps/server/src/web/handler/player/signup.spec.ts`, `apps/server/src/app/command/auth/signup.spec.ts`.

## Command flow (`signupAuth`)

1. `FactionService.assertPlayable(faction_code)`.
2. `bootstrapPlayer({ player_name, city_name, faction_code, system_controlled: false })`.

## Bootstrap (`bootstrapPlayer`)

Orchestration in `apps/server/src/app/command/player/bootstrap.ts`:

| Step | Behavior |
| --- | --- |
| Uniqueness | `repository.player.exist(player_name)`, `repository.city.exist(city_name)` |
| World placement | `AppService.selectCityFirstCell()`; `AppService.getCellsAround({ coordinates })` |
| Player | `PlayerService.init` with `system_controlled: false` |
| City | `CityService.settle` on first cell |
| Buildings | `BuildingService.init` — one row per `BuildingCode`; mushroom farm, recycling plant, and solar panel at **level 1**, others at **0** |
| Technologies | `TechnologyService.init` — one row per `TechnologyCode` for `player_id` |
| Resources | Load stock for city cell; `ResourcesService.firstCityCanonicalResourceStockState` then `updateOne` (`STARTING_PLASTIC` 3000, `STARTING_MUSHROOM` 2000 in `apps/server/src/core/city/constant/index.ts`) |
| Troops | `TroopService.init` — zero-count stacks per faction troop codes on city cell |
| Exploration | `ExplorationEntity.init` for city cell + surrounding cells |
| Persist | `player.create`, `city.create`, parallel creates for buildings, technologies, stock, troops, exploration |

Returns `{ player_id, city_id }` from created entities.

`bootstrapPlayer` is also used for non-signup flows (e.g. system players) with `system_controlled: true`; signup always passes `false`.

## Web UI

| Path | Role |
| --- | --- |
| `apps/web/src/modules/auth/signup-form.tsx` | Form: player name, city name, faction radio from `playableFactionCodes()` |
| `apps/web/src/modules/auth/hooks.ts` | `useSignup`: signup → login → `startSession` |
| `apps/web/src/modules/auth/signup-form.test.tsx` | Component tests |

Client-side validation uses French toast messages before submit; server enforces typed `RequestError` codes above.

## Dependencies

- Slice 002: session token after signup via login.
- Slice 004: playable `faction_code` enforcement.

## Evidence index

| Area | Paths |
| --- | --- |
| Commands | `apps/server/src/app/command/auth/signup.ts`, `apps/server/src/app/command/player/bootstrap.ts` |
| HTTP | `apps/server/src/web/handler/player/signup.ts` |
| Domain services | `PlayerService`, `CityService`, `BuildingService`, `TechnologyService`, `TroopService`, `ResourcesService`, `ExplorationEntity` (as referenced in bootstrap) |
| API types | `packages/api-client/src/endpoints/player/signup.ts` |
| Web | `apps/web/src/modules/auth/{signup-form,hooks}.tsx` |
