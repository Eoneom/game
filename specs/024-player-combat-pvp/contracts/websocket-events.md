# Contract — WebSocket events (PvP)

**Slice**: 024 | **Status**: Planned  
**Aligns with**: [`017-realtime-websocket`](../017-realtime-websocket/spec.md), `packages/api-client/src/events.ts`

## Existing event (unchanged)

| `AppEvent` | Wire | Payload | When |
| --- | --- | --- | --- |
| `TroopMovementFinished` | `troop:movement-finished` | `{ player_id: string }` | Peaceful saga complete **or** attack movement arrival (battle may still be in progress) |

**Client note**: `apps/web/src/modules/troop/ws-listener.ts` invalidates movements and report unread on this event. For PvP, **battle inbox** updates must also listen to `battle:finished`.

## New event

| `AppEvent` | Wire | Payload | When |
| --- | --- | --- | --- |
| `BattleFinished` | `battle:finished` | `{ player_id: string }` | After that player's `battle` report row is committed |

Emit **once per participant** (attacker and defender), same pattern as movement finish targeting the affected player session(s).

### Server emission

In `createBattleReports` (or `sagaFinishBattle`):

```typescript
Factory.getEventBus().emit(AppEvent.BattleFinished, { player_id: attacker_id })
Factory.getEventBus().emit(AppEvent.BattleFinished, { player_id: defender_id })
```

`apps/server/src/core/events.ts` — add enum member; re-export via api-client.

### Web client subscription

Register in `apps/web/src/modules/communication/ws-listener.ts` (or extend troop listener):

```typescript
wsClient.on(AppEvent.BattleFinished, ({ player_id }) => {
  // if session matches current player
  queryClient.invalidateQueries({ queryKey: reportKeys.unreadCount })
  queryClient.invalidateQueries({ queryKey: ['reports'] })
})
```

Optional product toast: « Nouveau rapport de bataille ».

## Out of scope (v1)

- Per-round live WS (`battle:round-complete`) — rounds are server-job paced; UI refreshes on battle finish or polling battle state if a debug endpoint is added later.
- Public battle spectating channels.

## Type export

```typescript
// packages/api-client — AppEvent re-export includes:
BattleFinished = 'battle:finished'
```

Payload type (optional explicit interface in api-client):

```typescript
export interface BattleFinishedEventPayload {
  player_id: string
}
```
