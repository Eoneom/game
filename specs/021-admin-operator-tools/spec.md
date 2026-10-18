# Slice 021 — Admin operator tools

**Status**: As implemented on `main`. Merges former slice **020** (system-player observability) and the **admin fight simulator** subsection from **024**.

Shared gate: `ADMIN_PLAYER_NAMES` env + `adminMiddleware` on HTTP; allowlisted session on `/admin/observability/ws`.

## System player observability

Allowlisted **human** commanders open a **dedicated admin console** (not the in-game workspace shell) at `/admin`. The nav link « Observabilité IA » (visible only when `is_admin`) points to that console. The console streams **every** system-controlled Player tick over a **narrow admin WebSocket** — not the game event socket — and shows a **read-only stats panel** (cities, outposts, building levels per city, technology levels per player). Each tick event shows outcome (`success` | `idle` | `error`), an ordered **attempts** trace, a concise French **summary**, and **expandable JSON**. Combined god-view stream with optional **filter by system Player name** (applies to feed and stats). Stats: HTTP snapshot on load/refresh; live patches via admin WebSocket after each **successful** tick action only. No DB persistence for feed or stats. Operators may **force one tick on demand** (admin HTTP); the 60s singleton schedule is rescheduled from force time. No replay/export or alerts. Existing `logs/system-tick.log` remains.

**Depends on**: [`016`](../016-system-controlled-players/spec.md), [`017`](../017-realtime-websocket/spec.md), session auth ([`002`](../002-player-session-auth/spec.md)).

## Admin gate (Q7=B, Q23=B)

| Mechanism | Detail |
| --- | --- |
| Env | `ADMIN_PLAYER_NAMES` — comma-separated commander **names** (trimmed), loaded at startup |
| Check | Server compares logged-in `PlayerEntity.name` to allowlist (not client-only) |
| HTTP | `GET /admin/system-player-observability` — `{ is_admin, system_players? }` |
| HTTP | `GET /admin/system-player-stats` — `{ players: [...] }` (admin middleware; `admin:forbidden` otherwise) |
| HTTP | `POST /admin/system-player-tick` — runs one immediate system-player tick for **all** system-controlled players (same job body as pg-boss `player.system.tick`); reschedules the singleton next tick at `now + SYSTEM_PLAYER_TICK_INTERVAL_MS` with `tick_index + 1` (replaces any pending singleton job). Admin middleware. Response: `{ tick_index, next_tick_index, next_execute_at, system_player_count }` |
| Game WS | Default upgrade path (`/?token=`): **game** `AppEvent` fan-out only; observability events **not** sent here |
| Admin WS | Path `/admin/observability/ws?token=` — allowlisted admins only (`4003` + `forbidden` otherwise); fan-out **only** `system-player:action-committed` and `system-player:stats-updated` |

## Event emission

After each `executeSystemPlayerTick` run (or on tick error), `tickSystemPlayers` emits `AppEvent.SystemPlayerActionCommitted` on `AppEventBus`. After each **success** or **partial** outcome, also emits `AppEvent.SystemPlayerStatsUpdated` with a fresh snapshot for that player. No persistence.

| `outcome` | When | `attempts` | `payload` / `summary` |
| --- | --- | --- | --- |
| `success` | Exactly one action committed | Skipped intents then one `success` | `committed_actions` length 1 |
| `partial` | Two or more actions committed (up to `SYSTEM_MAX_ACTIONS_PER_TICK`, **10**) | Mixed `skipped` / `success` in plan order | `committed_actions[]`; multi-line French summary |
| `idle` | No actions committed | Every tried intent `skipped` | No `committed_actions`; summary lists tried categories in order |
| `error` | Uncaught exception in tick for that player | `[]` (no partial trace) | Top-level `payload` with safe `error_message` / `error_code` (no stack) |

Bus payload includes top-level `committed_actions: { category, payload }[]` when any action committed. Legacy duplicate top-level `category` and mirrored action `payload` are **not** emitted (clients use `committed_actions` only).

**Tick category labels** (French summaries / attempt chains): `apps/web/src/modules/admin/system-player-observability/labels.ts` — `upgrade`, `research`, `recruit`, `explore`, `base`, `settle`, `make-permanent`, `transport`, `deploy-outpost` (« Déploiement vers avant-poste »), `attack`. A single tick may list the same category multiple times when the planner prepends repeated intents (e.g. several `transport` or `make-permanent` actions).

## WebSocket message (tick feed)

```json
{
  "type": "system-player:action-committed",
  "committed_at": 1700000000000,
  "player_id": "…",
  "player_name": "Alpha",
  "tick_index": 4,
  "outcome": "partial",
  "attempts": [
    { "category": "upgrade", "result": "success" },
    { "category": "research", "result": "success" },
    { "category": "recruit", "result": "skipped" }
  ],
  "summary": "Joueur système Alpha — 2 actions :\n• …",
  "committed_actions": [
    { "category": "upgrade", "payload": { } },
    { "category": "research", "payload": { } }
  ]
}
```

Idle ticks omit `committed_actions` and `payload`. Error ticks set `outcome` to `error` and put error fields in `payload`.

Nav also links **Simulateur de combat** → `/admin/combat-simulator` (see [Combat fight simulator](#combat-fight-simulator)).

## Stats snapshot

`GET /admin/system-player-stats` returns one entry per system-controlled player:

| Field | Content |
| --- | --- |
| `cities` | `id`, `name`, `coordinates`, `resources` (projected gather at `now()`), `earnings_per_second`, `energy`, `energy_consumption`, `production_energy_ratio`, `warehouses_capacity`, `warehouse_space_remaining` (plastic/mushroom; same as city page), `troops[]` (`code`, `count`, sorted like troop list), optional `pending_recruitment` (`troop_code`, `finish_at`, `remaining_count`) from recruit job queue |
| `outposts` | `id`, `type`, `coordinates`, `resources`, `earnings_per_second`, warehouse fields for permanent outposts, `troops[]` (`code`, `count`) |
| `technologies` | `code`, `level` (sorted like player UI) |
| `ongoing_movements` | `id`, `action` (`MovementAction`), `origin`, `destination`, `arrive_at` (from troop-movement finish job), `resources`, `troops[]` (`code`, `count`, sorted like troop list). Movements without a pending finish job are omitted. |
| `buildings_by_city` | per city: `city_id`, `city_name`, `buildings[]` with `code`, `level` |
| `updated_at` | server ms timestamp when snapshot was built |

Admin UI shows map coordinates via the same `formatCoordinates` helper as nav/map (`x.y`), French labels for building/technology/outpost/troop type/resource names (reuses web translation tables), stock/production/energy/warehouse/troop readouts per city and outpost, in-progress city recruit with countdown when present, and does **not** surface raw `cell_id`. Stats HTTP query **refetches every 5s** while the admin console is open (aligned with gather pulse).

After each successful system tick action, server emits `system-player:stats-updated` with the same shape (plus `type`) for that player only.

## Web UI

| Route | Behavior |
| --- | --- |
| `/admin` | Two-column layout: **État** (stats) | **Ticks** (live feed). Tick list omits **skipped** attempt categories in summaries and attempt chains (full attempts remain in JSON). Shared name filter; **« Forcer un tick IA »** / stats refresh as before |
| `/admin/system-players` | Redirect to `/admin` (legacy URL) |

Nav: « Observabilité IA » when `is_admin` → `/admin`. Non-admins: link hidden; direct `/admin` navigates away (e.g. to inbox). Admin observability WebSocket connects **only** while the admin console route is mounted (not on game login).

Copy in French covers succès, inactif, and erreur — not only successful actions.

### Admin stats panel (UI)

As implemented on `main` (read-only **État** column; no new requirements beyond the snapshot fields above):

| Concern | Behavior |
| --- | --- |
| Layered surfaces | Admin chrome uses `admin-surface-page`, `admin-surface-panel`, `admin-surface-card`, `admin-surface-nested`, `admin-surface-toolbar`, and `admin-surface-code` (`apps/web/src/index.css`; wired from `modules/admin/layout.tsx` and observability `page.tsx`). |
| Player card order | Per system player: **Technologies** → **Mouvements en cours** → **Colonies** → **Avant-postes** (always shown with count; empty empires show a short French placeholder). |
| **Mouvements en cours** | Section title `Mouvements en cours (N)`. Each row: French action label (`MovementActionLabels`), origin → destination coordinates, troop lines (`translateTroopCode`), optional cargo for `TRANSPORT`, countdown via `CountdownProgress` / `useCountdownProgress` to `arrive_at`. Empty: short French placeholder. |
| Per-city section | Nested card: production line, **dense** `EnergyReadout` (`dense` prop — bar height/styling aligned with warehouse `<progress>` bars), plastic/mushroom warehouse bars, **Bâtiments** two-column grid, then **Troupes** (counts only; optional in-progress recruit with countdown). |
| Per-city **Troupes** | `TroopsList` default: one column on narrow viewports, **two columns from `sm` breakpoint** (`sm:grid-cols-2`). |
| **Avant-postes** layout | Section always visible (count + French empty copy). When outposts exist, cards render in a **three-column** grid (`grid-cols-3`, `gap-2`); each card is `admin-surface-nested`. Outposts are ordered by **increasing `coordinates.x`**, then **`coordinates.y`** (stats snapshot from `collectSystemPlayerStatsSnapshot`). |
| Per-outpost card | Type label, coordinates, optional production line, warehouse bars when capacity &gt; 0, **Troupes** via `TroopsList` with `one_per_line` — **one troop per line** (vertical `flex-col` list; outpost cards are narrow). |

### Tick feed copy (French)

| Concern | Behavior |
| --- | --- |
| Category labels | `TICK_CATEGORY_LABEL` in `labels.ts` (web) and `CATEGORY_LABEL` in `core/system-player/observability/summary.ts` (server) stay aligned. |
| Movement (`explore`, `base`, `transport`, `deploy-outpost`, `attack`) | When `payload.move_troops` is present, summaries append the full stack as French troop names with counts (e.g. `Explorateur ×1, Colon ×2`) via `formatMoveTroops` in `format-move-troops.ts` (web + server). `transport` also appends carried resources when `payload.resources` has positive amounts (`Plastique 100`, …). All movement categories may append `(origin) → (destination)` when coordinates are present. |
| `deploy-outpost` | Label **« Déploiement vers avant-poste »**; also **`avant-poste {outpost_id}`** when set. Troop detail uses full `move_troops` (not only the first code). |

Evidence: `apps/web/src/modules/admin/system-player-observability/stats-panel.tsx`, `labels.ts`, `format-event.ts`, `apps/server/src/core/system-player/observability/summary.ts`, `apps/web/src/index.css`, `apps/web/src/ui/energy-readout.tsx`.

## Out of scope (observability)

Automated tick interval changes, per-player-only force tick, replay/export, alerts.

## Combat fight simulator

Operators with `is_admin` can run **non-persistent** battle simulations (no database writes, no jobs). PvP combat rules: [`024`](../024-player-combat-pvp/spec.md).

| Concern | Spec |
| --- | --- |
| HTTP | `POST /admin/combat-simulator` — `authMiddleware` + `adminMiddleware` (same gate as `POST /admin/system-player-tick`). |
| Body | `attacker_stacks`, `defender_stacks`: arrays of `{ troop_code, count }` (`TroopCode` wire values, `count` non-negative integer). `attacker_strategy`, `defender_strategy`: `CombatStrategy` wire values. |
| Engine | `CombatService.simulateBattle` loops `advanceRound` from round 1 until `winner !== null` or round 5. |
| Response | `winner` (`attacker` \| `defender` \| `draw` \| null), `round_summaries` (pools + per-code losses), `final_attacker_stacks`, `final_defender_stacks`. |
| Web | `/admin/combat-simulator` — French UI « Simulateur de combat »; gated on `is_admin`. Per side: **faction** picker (Confédération vs Singularité); troop dropdown lists only that faction’s four PvP combat codes **not already used on another row** on the same side (at most one row per `troop_code` per camp); **Ajouter une stack** disabled when all four codes are used. Each stack row uses an **`xl` `EntityThumb`** (80×80); **one control row** (unit `<select>`, count `<select>` from presets, **Retirer**) and a **stats line** beside the art, both stretched to the thumb height. **Results**: five round cards in a responsive grid; config scrolls above, results panel stays fully visible at the bottom. Loss chips use troop thumbnails. Per-unit and line **ATK / DEF / VIE** from `troop_characteristics`; footer **Totaux (base, hors stratégie)**. **Auto-run** (~300 ms debounce) when stacks, factions, or strategies change. |
| Validation | Reject duplicate `troop_code` within `attacker_stacks` or within `defender_stacks` (`RequestError.TROOP_CODE_DUPLICATE`). |

Evidence: `apps/web/src/modules/admin/combat-simulator/`, `apps/server/src/web/handler/admin/combat-simulator/`, `packages/api-client/src/endpoints/admin/combat-simulator.ts`.

## Evidence index

| Area | Paths |
| --- | --- |
| Spec | `specs/021-admin-operator-tools/` |
| Server | `core/admin/`, `app/query/admin/`, `web/handler/admin/`, `web/ws.ts`, `system/tick.ts`, `system/policy.ts` |
| Web | `apps/web/src/modules/admin/`, `routes/admin/`, `helpers/admin-observability-websocket.ts`, `modules/admin/system-player-observability/stats-panel.tsx`, `ui/energy-readout.tsx`, `index.css` (`admin-surface-*`) |
| Client | `packages/api-client/src/endpoints/admin/` |
