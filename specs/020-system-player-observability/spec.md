# Slice 020 — System Player observability (admin live feed)

**Status**: Implementing on `main`.

## Summary

Allowlisted **human** commanders (`ADMIN_PLAYER_NAMES` env) open an **in-game** screen (nav link when admin) that streams **successful** system-controlled Player actions **after commit** over **WebSocket**. Each event shows a concise French summary (CONTEXT.md terms) plus **expandable full JSON payload**. Combined god-view stream with optional **filter by system Player name**. No DB, no history, no failed/idle rows. v1 does not change tick policy, replay/export, or alerts. Existing `logs/system-tick.log` remains.

**Depends on**: [`016`](../016-system-controlled-players/spec.md), [`017`](../017-realtime-websocket/spec.md), session auth ([`002`](../002-player-session-auth/spec.md)).

## Admin gate (Q7=B, Q23=B)

| Mechanism | Detail |
| --- | --- |
| Env | `ADMIN_PLAYER_NAMES` — comma-separated commander **names** (trimmed), loaded at startup |
| Check | Server compares logged-in `PlayerEntity.name` to allowlist (not client-only) |
| HTTP | `GET /admin/system-player-observability` — `{ is_admin, system_players? }` |
| WS | On connect, admin sockets registered; `system-player:action-committed` fan-out to admins only |

## Event emission (Q14=A, Q8=C, Q9=A, Q16=A)

After `actForSystemPlayer` returns a category + payload (post-command commit), `tickSystemPlayers` emits `AppEvent.SystemPlayerActionCommitted` on `AppEventBus`. No persistence.

## WebSocket message (Q11=B, Q12=A, Q13=A, Q19=C)

```json
{
  "type": "system-player:action-committed",
  "committed_at": 1700000000000,
  "player_id": "…",
  "player_name": "Alpha",
  "tick_index": 4,
  "category": "upgrade",
  "summary": "Joueur système Alpha — Amélioration de bâtiment (mushroom_farm)",
  "payload": { }
}
```

## Web UI (Q4=D, Q15=C, Q18=B)

Route `/admin/system-players`: live list (newest first), name filter, `<details>` for JSON. Nav link « Observabilité IA » when `is_admin`.

## Out of scope (Q22=D)

AI tick policy changes, replay/export, alerts.

## Evidence index

| Area | Paths |
| --- | --- |
| Spec | `specs/020-system-player-observability/` |
| Server | `core/admin/`, `app/query/admin/`, `web/handler/admin/`, `web/ws.ts`, `system/tick.ts` |
| Web | `apps/web/src/modules/admin/`, `routes/admin/` |
| Client | `packages/api-client/src/endpoints/admin/` |
