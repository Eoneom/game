# Slice 017 — Real-time event fan-out (WebSocket)

**Status**: As implemented on `main` (brownfield).

## Summary

The HTTP server hosts a **WebSocket** server on the same port. Connections authenticate with the session token query param (`?token=`). The in-process `AppEventBus` bridges domain events to per-player WS messages. The web client registers module listeners on login/signup and invalidates React Query caches on events.

**Depends on**: session auth ([`002`](../002-player-session-auth/spec.md)).

## Connection gate (`apps/server/src/web/ws.ts`)

| Condition | Close code | Reason |
| --- | --- | --- |
| Missing `token` | `4001` | `token:not-found` (`RequestError.TOKEN_NOT_FOUND`) |
| `authorizeAuth` failure | `4001` | `unauthorized` (literal string) |
| Success | — | One socket per `player_id` in memory map |

Tests: `apps/server/src/web/ws.spec.ts`, `apps/web/src/helpers/websocket.test.ts`.

## Events (`core/events.ts` → bus → WS payload)

| `AppEvent` | WS JSON `type` | Extra fields |
| --- | --- | --- |
| `city:resources-gathered` | same | `city_id` |
| `building:upgrade-finished` | same | `city_id` |
| `technology:research-finished` | same | — |
| `troop:movement-finished` | same | — |
| `troop:recruitment-updated` | same | `city_id` |
| `outpost:created` | same | — |
| `outpost:deleted` | same | `outpost_id` |
| `outpost:resources-gathered` | same | `outpost_id` |

Bus implementation: `apps/server/src/app/event-bus.ts` (typed payloads, info logging). Tests: `apps/server/src/app/event-bus.spec.ts`.

Emitters: gather commands, `finishBuildingUpgrade`, `finishTechnologyResearch`, `progressTroopRecruitment`, `sagaFinishOneMovement`, outpost lifecycle/gather.

## Web listeners

Registered in `startSession` (`apps/web/src/modules/auth/hooks.ts`):

- `city/ws-listener.ts`
- `building/ws-listener.ts`
- `technology/ws-listener.ts`
- `troop/ws-listener.ts`
- `outpost/ws-listener.ts`

Client: `apps/web/src/helpers/websocket.ts` — connect/disconnect, parse `type`, dispatch to registered handlers.

## Out of scope

Communication reports are not pushed over WS (HTTP polling/React Query only).

## Evidence index

| Area | Paths |
| --- | --- |
| Server WS | `apps/server/src/web/ws.ts`, `apps/server/src/web/http.ts` |
| Events | `apps/server/src/core/events.ts`, `apps/server/src/app/event-bus.ts` |
| Web | `apps/web/src/helpers/websocket.ts`, `apps/web/src/modules/*/ws-listener.ts` |
