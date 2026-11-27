# Slice 017 — Real-time event fan-out (WebSocket)

**Status**: As implemented on `main` (brownfield).

## Summary

The HTTP server hosts **game** WebSocket upgrades on the default path and a separate **admin observability** path on the same port (see [`021`](../021-admin-operator-tools/spec.md#system-player-observability)). Connections authenticate with the session token query param (`?token=`). The in-process `AppEventBus` bridges domain events to per-player game WS messages. The web client registers game module listeners on login/signup and invalidates React Query caches on events.

**Depends on**: session auth ([`002`](../002-player-session-auth/spec.md)).

## Connection gate (`apps/server/src/web/ws.ts`)

### Game socket (default upgrade path)

| Condition | Close code | Reason |
| --- | --- | --- |
| Missing `token` | `4001` | `token:not-found` (`RequestError.TOKEN_NOT_FOUND`) |
| `authorizeAuth` failure | `4001` | `unauthorized` (literal string) |
| Success | — | One game socket per `player_id` in memory map; the player's faction is read once per connection for faction chat fan-out ([`032`](../032-messaging/spec.md)) |

### Admin observability socket (`/admin/observability/ws`)

Same token gates as game; additionally requires observability allowlist (`4003` + `forbidden` when not admin). Carries only `system-player:action-committed` and `system-player:stats-updated` (slice 020).

Tests: `apps/server/src/web/ws.spec.ts`, `apps/web/src/helpers/websocket.test.ts`, `apps/web/src/helpers/admin-observability-websocket.test.ts`.

## Events (`core/events.ts` → bus → WS payload)

| `AppEvent` | WS JSON `type` | Extra fields |
| --- | --- | --- |
| `city:resources-gathered` | same | `city_id` |
| `building:upgrade-finished` | same | `city_id` |
| `building:queue-item-dropped` | same | `city_id`, `building_code`, `error_code` |
| `technology:research-finished` | same | — |
| `technology:queue-item-dropped` | same | `city_id`, `technology_code`, `error_code` |
| `troop:movement-finished` | same | — |
| `battle:finished` | same | `player_id`, `report_id`, `perspective` (`attacker` \| `defender` \| `reinforcement`), `winner` (`attacker` \| `defender` \| `draw`) — once per participant (each reinforcement owner included, slice [`033`](../033-alliances/spec.md)), after the battle reports commit ([`024`](../024-player-combat-pvp/spec.md)) |
| `movement:incoming` | same | `player_id`, `movement_id`, `arrive_at` — to the defender when an attack movement is created and their `detection` ≥ 1 ([`030`](../030-intelligence/spec.md)); the client refetches `GET /troop/movement/incoming` |
| `mail:received` | same | `mail_id` — to the recipient when a letter is delivered (not when the recipient blocked the sender) ([`032`](../032-messaging/spec.md)) |
| `chat:message` | same | `channel` (`global` \| `faction` \| `alliance`), `message` (`id`, `author` `{ id, name, faction_code, alliance_tag }`, `body`, `created_at`) — **multi-recipient fan-out**: every connected player allowed in the channel (all for `global`, the author's faction for `faction`, the current alliance members for `alliance` — slice [`033`](../033-alliances/spec.md)), except players who blocked the author ([`032`](../032-messaging/spec.md)) |
| `alliance:updated` | same | `alliance_id` — to every member on membership, role or description changes ([`033`](../033-alliances/spec.md)) |
| `alliance:invitation-received` | same | `invitation_id`, `alliance_id` — to the invited player |
| `alliance:application-received` | same | `application_id`, `alliance_id` — to the chef and officers |
| `alliance:joined` | same | `alliance_id` — to the player who joined (creation included) |
| `alliance:left` | same | `alliance_id`, `reason` (`leave` \| `kick` \| `dissolve`) — to the player who left |
| `reinforcement:arrived` | same | `city_id`, `owner_player_id`, `report_id` — to the host when allied troops are stationed |
| `reinforcement:recalled` | same | `city_id`, `owner_player_id`, `movement_id` — to the host when stationed troops leave (owner recall or automatic return) |
| `exchange:filled` | same | `order_id`, `lots`, `price` — to each party of a faction exchange fill ([`035`](../035-faction-exchange/spec.md)) |
| `exchange:book-updated` | same | `resource` — to connected players of the book's faction, throttled in `ws.ts` to once per 2 s per (faction, resource): the first update goes out at once, later ones collapse into one send at the end of the window |
| `troop:recruitment-updated` | same | `city_id` |
| `outpost:created` | same | — |
| `outpost:deleted` | same | `outpost_id` |
| `outpost:resources-gathered` | same | `outpost_id` |

Bus implementation: `apps/server/src/app/event-bus.ts` (typed payloads, info logging). Tests: `apps/server/src/app/event-bus.spec.ts`.

Emitters: gather commands, `finishBuildingUpgrade`, `finishTechnologyResearch`, `progressTroopRecruitment`, `sagaFinishOneMovement`, `advanceCombatRound` (`battle:finished`), `createTroopMovement` (`movement:incoming`), `sendCommunicationMail` (`mail:received`), `postCommunicationChatMessage` (`chat:message`), alliance commands in `app/command/alliance/` (`alliance:*`), `sagaFinishReinforce` (`reinforcement:arrived`), `createTroopMovement` and the automatic return (`reinforcement:recalled`), exchange order commands, the expiry job and city capture (`exchange:filled`, `exchange:book-updated`, slice [`035`](../035-faction-exchange/spec.md)), outpost lifecycle/gather.

Multi-recipient fan-out (`sendToGamePlayers` in `ws.ts`) walks the in-memory connection map with a per-event filter; the event payload carries the channel faction (`null` for global), the alliance `member_ids` (`null` outside the alliance channel, slice [`033`](../033-alliances/spec.md)) and `excluded_player_ids`. `alliance:updated` and `alliance:application-received` use the same helper with their `player_ids`. Single server process only.

## Web listeners

Registered in `startSession` (`apps/web/src/modules/auth/hooks.ts`):

- `city/ws-listener.ts`
- `building/ws-listener.ts`
- `technology/ws-listener.ts`
- `troop/ws-listener.ts` (incl. the « Attaque entrante » toast on `movement:incoming`, slice 030)
- `outpost/ws-listener.ts`
- `alliance/ws-listener.ts` (alliance data refresh and toasts, reinforcement lists, slice 033)
- `exchange/ws-listener.ts` (book and trades refresh on `exchange:book-updated`; fill toast and own orders, movements, troops and reports refresh on `exchange:filled`, slice 035)
- `communication/ws-listener.ts` (battle report toast, « Nouvelle lettre » toast on `mail:received`, chat history cache on `chat:message` via `communication/chat/ws-listener.ts`; registers once per page load)

`wsClient.on` returns an unsubscribe function, used by the chat panel for its activity dot.

Client: `apps/web/src/helpers/websocket.ts` — connect/disconnect, parse `type`, dispatch to registered handlers.

## Out of scope

Communication reports are not pushed over WS (HTTP polling/React Query only). Letters and chat are ([`032`](../032-messaging/spec.md)).

## Evidence index

| Area | Paths |
| --- | --- |
| Server WS | `apps/server/src/web/ws.ts`, `apps/server/src/web/http.ts` |
| Events | `apps/server/src/core/events.ts`, `apps/server/src/app/event-bus.ts` |
| Web | `apps/web/src/helpers/websocket.ts`, `apps/web/src/modules/*/ws-listener.ts` |
