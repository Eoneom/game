# Slice 013 — Location activity indicators

**Status**: As implemented on `main` (brownfield).

## Summary

Aggregated **activity** for a city or outpost: active building upgrade (with timing), queued upgrade depth, active technology research, active troop recruitment, and in-flight troop movements (count + next arrival). Used by the left navigation column of the web shell ([`041`](../041-app-shell-navigation/spec.md)); the former activity strip (`ui/activity`) is gone.

**Depends on**: buildings ([`007`](../007-buildings-upgrade-queue/spec.md)), technology ([`008`](../008-technology-research/spec.md)), troops ([`009`](../009-troops-stationary/spec.md)), movement jobs ([`010`](../010-troop-movement-combat/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/city/:city_id/activity` | yes | `cityActivityHandler` |
| `GET` | `/outpost/:outpost_id/activity` | yes | `outpostActivityHandler` |

Missing id → **400** + `city_id:not-found` or `outpost_id:not-found`.

Wrong owner → `city:not-owner` or `outpost:not-owner` via error middleware.

**Response shape** (`LocationActivityResponse` via mapper): `building`, `building_queue_depth`, `research`, `recruitment`, `movements: { count, next_arrive_at }`. Building/research timings are derived from pending job `execute_at` minus `PricingService` durations.

Added by [`041`](../041-app-shell-navigation/spec.md) (existing fields unchanged):

| Field | City | Outpost |
| --- | --- | --- |
| `research.city_id`, `research.city_name` | city running the player-wide research | same |
| `research_queue_depth` | player-wide research queue length | same |
| `recruitment_queue_depth` | troop recruit queue length | 0 |
| `fortification` | running defense build batch `{ code, remaining_count, finish_at, started_at }` or `null` | `null` |
| `fortification_queue_depth` | defense build queue length | 0 |
| `fortification_available` | Enceinte (`city_wall`) level ≥ 1 | `false` |

Tests: `apps/server/src/app/query/location/activity.spec.ts` ([`041`](../041-app-shell-navigation/spec.md)) covers the fortification batch, `fortification_available`, the queue depths, the research city and the outpost defaults; ownership errors come from the query (`apps/server/src/app/query/location/activity.ts`).

## Web UI

- `apps/web/src/modules/location/activity-hooks.ts` — `useLocationActivity` (15 s polling as a safety net; WebSocket listeners invalidate `activityKeys.all`).
- `apps/web/src/modules/location/context.tsx` — selected city/outpost.
- `apps/web/src/ui/nav/menu/activity.tsx` — activity lines of the left column ([`041`](../041-app-shell-navigation/spec.md)).

## API client

`LocationActivityResponse` exported from `@eoneom/api-client` (activity endpoint types, incl. `LocationActivityFortification` since 041).

## Evidence index

| Area | Paths |
| --- | --- |
| Query | `apps/server/src/app/query/location/activity.ts`, `activity.spec.ts` |
| HTTP | `apps/server/src/web/handler/location/activity.ts`, `activity.mapper.ts` |
| API client | `packages/api-client/src/endpoints/location/activity.ts` |
| Web | `apps/web/src/modules/location/`, `apps/web/src/ui/nav/menu/activity.tsx` |
