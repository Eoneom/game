# Slice 020 — System Player observability (admin live feed)

**Status**: As implemented on `main`.

## Summary

Allowlisted **human** commanders (`ADMIN_PLAYER_NAMES` env) open a **dedicated admin console** (not the in-game workspace shell) at `/admin`. The nav link « Observabilité IA » (visible only when `is_admin`) points to that console. The console streams **every** system-controlled Player tick over a **narrow admin WebSocket** — not the game event socket — and shows a **read-only stats panel** (cities, outposts, building levels per city, technology levels per player). Each tick event shows outcome (`success` | `idle` | `error`), an ordered **attempts** trace, a concise French **summary**, and **expandable JSON**. Combined god-view stream with optional **filter by system Player name** (applies to feed and stats). Stats: HTTP snapshot on load/refresh; live patches via admin WebSocket after each **successful** tick action only. No DB persistence for feed or stats. v1 does not change tick policy, replay/export, or alerts. Existing `logs/system-tick.log` remains.

**Depends on**: [`016`](../016-system-controlled-players/spec.md), [`017`](../017-realtime-websocket/spec.md), session auth ([`002`](../002-player-session-auth/spec.md)).

## Admin gate (Q7=B, Q23=B)

| Mechanism | Detail |
| --- | --- |
| Env | `ADMIN_PLAYER_NAMES` — comma-separated commander **names** (trimmed), loaded at startup |
| Check | Server compares logged-in `PlayerEntity.name` to allowlist (not client-only) |
| HTTP | `GET /admin/system-player-observability` — `{ is_admin, system_players? }` |
| HTTP | `GET /admin/system-player-stats` — `{ players: [...] }` (admin middleware; `admin:forbidden` otherwise) |
| Game WS | Default upgrade path (`/?token=`): **game** `AppEvent` fan-out only; observability events **not** sent here |
| Admin WS | Path `/admin/observability/ws?token=` — allowlisted admins only (`4003` + `forbidden` otherwise); fan-out **only** `system-player:action-committed` and `system-player:stats-updated` |

## Event emission

After each `actForSystemPlayer` run (or on tick error), `tickSystemPlayers` emits `AppEvent.SystemPlayerActionCommitted` on `AppEventBus`. After each **success** outcome, also emits `AppEvent.SystemPlayerStatsUpdated` with a fresh snapshot for that player. No persistence.

| `outcome` | When | `attempts` | `payload` / `summary` |
| --- | --- | --- | --- |
| `success` | First category returns a payload (post-commit) | Skipped categories then one `success`; rotation from `categoriesForTick` | Full action `payload`; French summary via existing formatter |
| `idle` | All categories skipped | Every category `skipped` | Empty object; summary lists tried categories in order |
| `error` | Uncaught exception in tick for that player | `[]` (no partial trace) | Safe `error_message` / `error_code` (no stack) |

`actForSystemPlayer` returns the attempt trace without changing game logic.

## WebSocket message (tick feed)

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

## Stats snapshot

`GET /admin/system-player-stats` returns one entry per system-controlled player:

| Field | Content |
| --- | --- |
| `cities` | `id`, `name`, `coordinates` (`x`, `y` — same as city/outpost APIs), `resources` (`plastic`, `mushroom`, `plasma` gathered as-of snapshot time) |
| `outposts` | `id`, `type`, `coordinates`, `resources` (permanent outposts gathered; temporary uses stored stock) |
| `technologies` | `code`, `level` (sorted like player UI) |
| `buildings_by_city` | per city: `city_id`, `city_name`, `buildings[]` with `code`, `level` |
| `updated_at` | server ms timestamp when snapshot was built |

Admin UI shows map coordinates via the same `formatCoordinates` helper as nav/map (`x.y`), French labels for building/technology/outpost type/resource names (reuses web translation tables), and does **not** surface raw `cell_id`.

After each successful system tick action, server emits `system-player:stats-updated` with the same shape (plus `type`) for that player only.

## Web UI

| Route | Behavior |
| --- | --- |
| `/admin` | Admin shell + stats panel (« État des joueurs système ») + live tick feed (newest first); shared name filter; outcome badge; French attempt chain and summaries (codes translated client-side); JSON details |
| `/admin/system-players` | Redirect to `/admin` (legacy URL) |

Nav: « Observabilité IA » when `is_admin` → `/admin`. Non-admins: link hidden; direct `/admin` navigates away (e.g. to inbox). Admin observability WebSocket connects **only** while the admin console route is mounted (not on game login).

Copy in French covers succès, inactif, and erreur — not only successful actions.

## Out of scope

AI tick policy changes, replay/export, alerts.

## Evidence index

| Area | Paths |
| --- | --- |
| Spec | `specs/020-system-player-observability/` |
| Server | `core/admin/`, `app/query/admin/`, `web/handler/admin/`, `web/ws.ts`, `system/tick.ts`, `system/policy.ts` |
| Web | `apps/web/src/modules/admin/`, `routes/admin/`, `helpers/admin-observability-websocket.ts` |
| Client | `packages/api-client/src/endpoints/admin/` |
