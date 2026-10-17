# Slice 009 — Troops (stationary stacks)

**Status**: As implemented on `main` (brownfield).

## Summary

**Troop stacks** (`TroopEntity`) sit on a `cell_id`, belong to a `player_id`, have a `TroopCode` and `count`, and may reference an active `movement_id`. Players **recruit** (batched job `troop.recruit.progress`), **cancel** recruitment, and **list/get** troops by city or outpost. Faction determines which troop codes exist at bootstrap (`TroopService.codesForFaction`). Movement creation is [`010`](../010-troop-movement-combat/spec.md).

**Depends on**: city/outpost location, requirements/pricing ([`014`](../014-requirements-pricing/spec.md)), faction ([`004`](../004-faction-domain/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/city/:city_id/troop` | yes | `troopListCityHandler` |
| `GET` | `/outpost/:outpost_id/troop` | yes | `troopListOutpostHandler` |
| `GET` | `/troop/:troop_id` | yes | `troopGetHandler` |
| `PUT` | `/troop/recruit` | yes | `troopRecruitHandler` |
| `PUT` | `/troop/cancel` | yes | `troopCancelHandler` |

| `TroopError` (stationary-related) | Meaning |
| --- | --- |
| `troop:not-found` | Unknown troop |
| `troop:already-in-progress` | Recruitment already running for city |
| `troop:not-in-progress` | Cancel when idle |
| `troop:not-enough-troops` | Insufficient count for an operation |
| `troop:not-owner` | Wrong player |
| `troop:not-in-faction-roster` | Code not allowed for faction |

Recruitment progress emits `troop:recruitment-updated` (WebSocket [`017`](../017-realtime-websocket/spec.md)).

Tests: `apps/server/src/web/handler/troop/{recruit,cancel,get,list/*}.spec.ts`, `apps/server/src/app/command/troop/{recruit,cancel,progress-recruit}.spec.ts`, `apps/server/src/core/troop/service.spec.ts`.

## Background jobs

| Queue | Command |
| --- | --- |
| `troop.recruit.progress` | `progressTroopRecruitment` (stately queue) |

## Domain

- `TroopService.init` / `codesForFaction` at player bootstrap.
- Costs: `PricingService.getTroopCost` (cloning factory + replication catalyst reduce duration).
- Requirements: `RequirementService.checkTroopRequirement`.

## Web UI

`apps/web/src/modules/troop/` — details, recruit form (not movement list; see movement module).

## API client

`packages/api-client/src/endpoints/troop/`.

## Evidence index

| Area | Paths |
| --- | --- |
| Core | `apps/server/src/core/troop/` |
| Commands | `apps/server/src/app/command/troop/` (except `movement/`) |
| Queries | `apps/server/src/app/query/troop/` (except movement) |
| Jobs | `apps/server/src/adapter/job-queue/troop/recruit-progress.ts` |
| HTTP | `apps/server/src/web/handler/troop/` (except `movement/`) |
