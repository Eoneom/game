# Slice 013 — Location activity indicators

**Status**: As implemented on `main` (brownfield).

## Summary

Aggregated **activity** for a city or outpost: active building upgrade (with timing), queued upgrade depth, active technology research, active troop recruitment, and in-flight troop movements (count + next arrival). Used by the web activity strip and location nav badges.

**Depends on**: buildings ([`007`](../007-buildings-upgrade-queue/spec.md)), technology ([`008`](../008-technology-research/spec.md)), troops ([`009`](../009-troops-stationary/spec.md)), movement jobs ([`010`](../010-troop-movement-combat/spec.md)).

## HTTP

| Method | Path | Auth | Handler |
| --- | --- | --- | --- |
| `GET` | `/city/:city_id/activity` | yes | `cityActivityHandler` |
| `GET` | `/outpost/:outpost_id/activity` | yes | `outpostActivityHandler` |

Missing id → **400** + `city_id:not-found` or `outpost_id:not-found`.

Wrong owner → `city:not-owner` or `outpost:not-owner` via error middleware.

**Response shape** (`LocationActivityResponse` via mapper): `building`, `building_queue_depth`, `research`, `recruitment`, `movements: { count, next_arrive_at }`. Building/research timings are derived from pending job `execute_at` minus `PricingService` durations.

Tests: handler behavior implied by `LocationActivityQuery` wiring; ownership errors from query (`apps/server/src/app/query/location/activity.ts`). No dedicated `activity.spec.ts` in repo—logic covered indirectly through job queue mocks in integration paths.

## Web UI

- `apps/web/src/modules/location/activity-hooks.ts` — React Query hooks calling activity endpoints.
- `apps/web/src/modules/location/context.tsx` — selected city/outpost.
- `apps/web/src/ui/activity/` — `ActivityStrip` in `App.tsx`.

## API client

`LocationActivityResponse` exported from `@eoneom/api-client` (activity endpoint types).

## Evidence index

| Area | Paths |
| --- | --- |
| Query | `apps/server/src/app/query/location/activity.ts` |
| HTTP | `apps/server/src/web/handler/location/activity.ts`, `activity.mapper.ts` |
| Web | `apps/web/src/modules/location/`, `apps/web/src/ui/activity/` |
