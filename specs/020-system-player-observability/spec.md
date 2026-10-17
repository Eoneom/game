# Slice 020 — System Player observability (admin live feed)

**Status**: Implementing on `main`.

## Summary

Allowlisted **human** commanders (`ADMIN_PLAYER_NAMES` env) open an **in-game** screen (nav link when admin) that streams **every** system-controlled Player tick over **WebSocket** — not only successful commits. Each event shows outcome (`success` | `idle` | `error`), an ordered **attempts** trace for the tick, a concise French **summary**, and **expandable JSON** (includes `attempts`). Combined god-view stream with optional **filter by system Player name**. No DB, no history. v1 does not change tick policy, replay/export, or alerts. Existing `logs/system-tick.log` remains.

**Depends on**: [`016`](../016-system-controlled-players/spec.md), [`017`](../017-realtime-websocket/spec.md), session auth ([`002`](../002-player-session-auth/spec.md)).

## Admin gate (Q7=B, Q23=B)

| Mechanism | Detail |
| --- | --- |
| Env | `ADMIN_PLAYER_NAMES` — comma-separated commander **names** (trimmed), loaded at startup |
| Check | Server compares logged-in `PlayerEntity.name` to allowlist (not client-only) |
| HTTP | `GET /admin/system-player-observability` — `{ is_admin, system_players? }` |
| WS | On connect, admin sockets registered; `system-player:action-committed` fan-out to admins only |

## Event emission

After each `actForSystemPlayer` run (or on tick error), `tickSystemPlayers` emits `AppEvent.SystemPlayerActionCommitted` on `AppEventBus`. No persistence.

| `outcome` | When | `attempts` | `payload` / `summary` |
| --- | --- | --- | --- |
| `success` | First category returns a payload (post-commit) | Skipped categories then one `success`; rotation from `categoriesForTick` | Full action `payload`; French summary via existing formatter |
| `idle` | All categories skipped | Every category `skipped` | Empty object; summary lists tried categories in order |
| `error` | Uncaught exception in tick for that player | `[]` (no partial trace) | Safe `error_message` / `error_code` (no stack) |

`actForSystemPlayer` returns the attempt trace without changing game logic.

## WebSocket message

```json
{
  "type": "system-player:action-committed",
  "committed_at": 1700000000000,
  "player_id": "…",
  "player_name": "Alpha",
  "tick_index": 4,
  "outcome": "success",
  "attempts": [
    { "category": "research", "result": "skipped" },
    { "category": "recruit", "result": "success" }
  ],
  "category": "recruit",
  "summary": "Joueur système Alpha — Recrutement de troupes (scout)",
  "payload": { }
}
```

Idle ticks omit `category` and use an empty `payload`. Error ticks set `outcome` to `error` and put error fields in `payload`.

## Web UI

Route `/admin/system-players`: live list (newest first), name filter, outcome badge, inline attempt chain, `<details>` for JSON (`outcome`, `attempts`, `payload`). Nav link « Observabilité IA » when `is_admin`. Copy in French covers succès, inactif, and erreur — not only successful actions.

## Out of scope

AI tick policy changes, replay/export, alerts.

## Evidence index

| Area | Paths |
| --- | --- |
| Spec | `specs/020-system-player-observability/` |
| Server | `core/admin/`, `app/query/admin/`, `web/handler/admin/`, `web/ws.ts`, `system/tick.ts`, `system/policy.ts` |
| Web | `apps/web/src/modules/admin/`, `routes/admin/` |
| Client | `packages/api-client/src/endpoints/admin/` |
