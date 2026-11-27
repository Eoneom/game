# Slice 030 — Intelligence: espionage and detection

**Status**: Implemented on `main` (slice 030): `espionage` and `detection` technologies (Renseignement branch), `spy` movement action with randomized resolution (`core/intel/`, `sagaFinishSpy`), `spy` / `spy_detected` reports (`report_spy`), `GET /troop/movement/incoming` and WS `movement:incoming`, web incoming-attack badge, « Attaques entrantes » section, « Espionner » action, spy report details, migration `00013_intelligence`.

## Summary

Add a **Renseignement** technology branch with two technologies and the gameplay they unlock:

- **Espionnage** (`espionage`) unlocks a new movement action, **`spy`**. Scout-role troops travel to an enemy location and bring back a **spy report**. Its level of detail depends on the gap between the spy's Espionnage and the target's Détection. The mission can **fail with some randomness**: the scouts are destroyed and the target is warned.
- **Détection** (`detection`) warns a player of **incoming attacks**. It shows nothing at level 0, and each level adds detail. It also protects against spies.

Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`008`](../008-technology-research/spec.md), [`009`](../009-troops-stationary/spec.md) (scout role), [`010`](../010-troop-movement-combat/spec.md) (movements), [`012`](../012-communication-reports/spec.md) (reports), [`017`](../017-realtime-websocket/spec.md) (events), [`024`](../024-player-combat-pvp/spec.md) (targets, faction gating), [`027`](../027-military-economy-technologies/spec.md) (branches), [`028`](../028-command-center-shelter/spec.md) (movement cap), [`029`](../029-city-defenses/spec.md) (defenses in reports).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Incoming attacks without technology** | **Nothing**: no alert at `detection` 0. |
| **Detection detail** | Level 1: alert, target and arrival time. Each level adds detail (see table). |
| **Spy report detail** | Depends on `gap = espionage(spy owner) − detection(target owner)`. |
| **Failure** | **Random**, with a probability that depends on the gap and the number of scouts sent. On failure the scouts are destroyed and the target is warned. |
| **Targets** | Same as attack: enemy **cities**, **outposts** and **field stacks**. Report content adapts to the target kind. |

## Technologies

Branch **Renseignement** (web grouping, [`027`](../027-military-economy-technologies/spec.md)).

| Enum | Wire | FR name | Requirements | Cost (`base` / `multiplier`) |
| --- | --- | --- | --- | --- |
| `ESPIONAGE` | `espionage` | **Espionnage** | `research_lab` 3 | Plastic 3000 / 1.7, mushroom 3000 / 1.7, duration 120 s / 2 |
| `DETECTION` | `detection` | **Détection** | `research_lab` 3 | Plastic 3000 / 1.7, mushroom 3000 / 1.7, duration 120 s / 2 |

No plasma: intelligence must be reachable early. No level cap: levels beyond the detail tables keep improving the odds against spies.

## Detection: incoming attacks

### What the defender sees

An **incoming attack** is an `attack` movement owned by another player whose destination cell holds one of the player's cities, outposts or troops. Spy movements are **never** shown in advance.

| `detection` level | Information |
| --- | --- |
| 0 | Nothing. |
| 1 | Alert, targeted location, arrival time. |
| 2 | + attacker name and faction. |
| 3 | + army size: total unit count, rounded to the nearest 10. |
| ≥ 4 | + exact composition (troop code and count). The attacker's strategy is never revealed. |

The level is read **live** on each query, so research finished while an attack is under way adds detail immediately.

### API and events

| Item | Spec |
| --- | --- |
| `GET /troop/movement/incoming` | Incoming attacks visible to the player, with fields filtered by detection level: `{ id, target: { kind, id, name, coordinates }, arrive_at, attacker?: { name, faction_code }, unit_count?, troops? }`. Returns `[]` at level 0. |
| WS `movement:incoming` | Sent to the defender when an attack movement is created and the defender's `detection` ≥ 1. Payload: `{ player_id, movement_id, arrive_at }`. The client refetches the list. |
| Attack arrival | Existing `battle:finished` flow; the entry disappears from the list once the movement is hidden ([`010`](../010-troop-movement-combat/spec.md)). |

## Espionage: the `spy` movement

### Creation

Extend `MovementAction` with `SPY = 'spy'`.

| Rule | Error |
| --- | --- |
| Player has `espionage` ≥ 1 | `intel:espionage-required` |
| Only `scout`-role troops, at least one | `intel:scout-only` |
| Target holds an **enemy-faction** city, outpost or troop stack | `intel:no-valid-target`, `combat:same-faction-attack` (reused) |
| Movement cap ([`028`](../028-command-center-shelter/spec.md)) | `troop:movement:limit-reached` |

Duration uses the scouts' speed (slowest unit), as for any movement.

### Resolution on arrival (`sagaFinishSpy`)

1. `gap = espionage(spy owner) − detection(target owner)`, both read at arrival.
2. Success probability:

   ```
   p_success = clamp(0.50 + 0.15 × gap + 0.02 × (scouts − 1), 0.05, 0.95)
   ```

   More scouts raise the odds, and all of them are lost on failure. The random source is injectable for tests; the roll is stored in the report metadata.
3. **Success**: the spy owner receives a `spy` report (below). The cell is marked explored for the spy owner. The scouts return home with an automatic `base` movement, as for `explore`. The target is **not** notified.
4. **Failure**: all scouts of the movement are destroyed. The spy owner receives a `spy` report with `success: false` and no intel. The target receives a `spy_detected` report naming the spy owner, the location and the number of scouts destroyed.

If the target no longer exists or changed to a same-faction owner on arrival, the mission ends with no intel and the scouts return, without a failure roll.

### Report detail tiers

`tier = max(1, gap)` on success. A lucky success with `gap ≤ 0` gives tier 1.

| Tier | City | Outpost | Field stack |
| --- | --- | --- | --- |
| 1 | Troops on the cell (code, count) | Troops | Troops |
| 2 | + defenses ([`029`](../029-city-defenses/spec.md)) and garrison default strategy | + garrison default strategy | — |
| 3 | + resource stock | + resource stock | — |
| ≥ 4 | + building levels and owner's technology levels | + outpost type | — |

Content is a **snapshot at arrival**.

### Reports

| `ReportType` | Recipient | Metadata |
| --- | --- | --- |
| `spy` | Spy owner | `success`, `roll`, `p_success`, `tier`, `target: { kind, id, name, owner_name, faction_code, coordinates }`, `troops?`, `defenses?`, `default_strategy?`, `resources?`, `buildings?`, `technologies?`, `outpost_type?`, `scouts_lost` |
| `spy_detected` | Target owner | `spy_owner: { name, faction_code }`, `target`, `scouts_destroyed` |

Stored like battle metadata (dedicated `report_spy` table, JSON columns).

## System players

| Area | Change |
| --- | --- |
| Research | Append `detection` then `espionage` to `SYSTEM_TECHNOLOGY_RESEARCH_PRIORITY`, after the 027 entries. |
| Spying | System players do not send spies in this slice; their attack scoring is unchanged. |
| Incoming attacks | Not used by the planner in this slice. |

## Web UI

| Surface | Change |
| --- | --- |
| Header | Badge with the number of incoming attacks, shown only when `detection` ≥ 1 and the list is non-empty. |
| Shell columns ([`041`](../041-app-shell-navigation/spec.md)) | Left column: « ⚠ N attaque(s) entrante(s) · mm:ss » under « Déplacements » for the current location (danger left bar). Right column: danger dot on every targeted city / outpost. Same detection-gated list. |
| Movements page | "Attaques entrantes" section: target, countdown, then attacker, size and composition according to level. Toast on `movement:incoming`. |
| Movement create | "Espionner" action available when only scouts are selected and the target is an enemy location; shows the success probability preview from the known levels (own espionage only; the target's detection is unknown, so show "≥ 5 %"). |
| Reports | Details for `spy` (tiers, failure) and `spy_detected`. |
| Technology list | **Renseignement** branch. |

French copy for all new errors.

## Persistence

Migration (next free number):

1. Backfill `technology` rows `espionage` and `detection` at level 0 per player.
2. Create `report_spy` (`report_id`, metadata JSON columns).
3. Extend the report type check, if any, with `spy` and `spy_detected`.

## Testing

| Area | Cases |
| --- | --- |
| Detection | Level 0 returns `[]` and sends no event; level 1 hides attacker; level 3 rounds size; level 4 shows composition; strategy never exposed; live level on query. |
| Spy creation | Without `espionage`, with a non-scout, same faction, no target, movement cap. |
| Resolution | Probability formula and clamps; success gives tier = `max(1, gap)`; failure destroys scouts and writes both reports; vanished target returns scouts without a roll. |
| Tiers | Content per tier and target kind. |
| Migration | New technology rows. |

## Out of scope

- Spying by system players and AI use of incoming-attack data.
- Advance warning of spy movements.
- Cartography and vision radius (map rework).
- Player-side attack simulator.

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`008`](../008-technology-research/spec.md) / [`014`](../014-requirements-pricing/spec.md) | New technologies. |
| [`010`](../010-troop-movement-combat/spec.md) | `spy` action, incoming endpoint. |
| [`012`](../012-communication-reports/spec.md) | `spy`, `spy_detected` reports. |
| [`017`](../017-realtime-websocket/spec.md) | `movement:incoming`. |
| [`016`](../016-system-controlled-players/spec.md) | Research priority. |

## Implementation notes

- **Target resolution**: spy creation and arrival reuse the attack resolver (`resolveSpyTarget` wraps `resolveAttackTarget`): city, then outpost, then a single-owner field stack. `combat:no-valid-target` is renamed `intel:no-valid-target`; a same-faction owner keeps `combat:same-faction-attack`. A field cell holding stacks of several foreign owners is not a valid target (as for attacks). Creation checks run in the spec order (espionage, scouts, target), then the movement cap.
- **Roll**: `finishTroopSpyMovement` takes an injectable `random` (default `Math.random`, uniform in [0, 1)); the mission succeeds when `roll < p_success`. `p_success` is rounded to 6 decimals to drop float noise. Both are stored in the report.
- **Aborted mission** (target vanished or now same-faction): the spy owner still gets a `spy` report so the return is explained — `success: false`, an extra `aborted: true` flag (not in the spec's metadata list), `roll` / `p_success` `null`, `tier` 0, `scouts_lost` 0, and `target` with only `coordinates` (kind and owner fields `null`). No exploration, no `spy_detected`.
- **Failure**: `tier` is 0 and no intel is attached; the scouts' troop rows are deleted, then the movement (no return trip). `spy_detected` reports have empty `troops` (the count is `scouts_destroyed`); the `spy` report's `troops` are the scouts sent.
- **Snapshot content**: "troops on the cell" are the target owner's stationary stacks (the battle defender set), merged per code. Defenses with count 0, buildings at level 0 and technologies at level 0 are left out. Resources are the stored cell stock floored (as of its last gather, the same stock loot reads). `default_strategy` is the garrison default resolved to `balanced` when unset.
- **Exploration**: success marks only the target cell explored for the spy owner (not the explore radius).
- **Storage**: `report_spy` has `report_id` (PK, cascade), `movement_id`, `spy_player_id`, `target_player_id` (null when aborted), `target_json` and `metadata_json` (everything else); `report.createSpyReports` writes reports and rows in one transaction, `getSpyMetadataByReportId` merges them back. `report.type` has no check constraint, so the migration only adds the table and the technology backfill.
- **Incoming attacks**: `movement.listIncomingAttacks` selects other players' `attack` movements whose destination cell holds one of the player's cities, outposts or stationary troops (one SQL query); entries without a pending finish job (arrived, battle running) are dropped and the rest sorted by `arrive_at`. The target is described from the player's side (city → outpost → field); outposts and field stacks have no name, a field target has no id. The detection level is read on every call; nothing is queried at level 0. `unit_count` is `round(total / 10) × 10`, so an army of 1–4 units reads 0.
- **Event**: `createTroopMovement` emits `movement:incoming` after scheduling every attack (human or system) when the resolved defender's `detection` ≥ 1. Spy failures do not emit an event to the target; the `spy_detected` report shows up through the usual report refresh.
- **System AI**: `detection`, `espionage` are appended after every other code in both research orders (default and Arsenal-first).
- **Web « Espionner »**: offered when the selection is scouts only and the destination is not a same-faction settlement. The client reads the destination's settlement from a 1×1 `GET /world/cells` (`useDestinationStance`): enemy city / outpost → offered; same-faction → hidden; no settlement → offered, because field stacks are not on the map (the server then answers `intel:no-valid-target` if nothing is there). Without `espionage` the action shows « Recherchez l'Espionnage… » and cannot be sent. The preview reads « ≥ 5 % (jusqu'à X % contre une cible sans Détection) », X being the formula with the player's own Espionnage and gap = own level. The map panel lists `spy` with the explored-cell actions. Probability constants live in `core/intel/constant/probability.ts` and are exported by the API client.
- **Web incoming attacks**: `useListIncomingMovements` (`['movements', 'incoming']`, so movement invalidations refresh it); the header badge (under the location title, links to the movements page) and the « Attaques entrantes » section render only when the list is non-empty, which the server guarantees only from detection 1. The section refetches when a countdown ends; `movement:incoming` shows a toast and refetches; `technology:research-finished` refetches (live detection level).

## Follow-ups

- **Artwork**: no dedicated images. `apps/web/src/modules/technology/image.ts` maps `espionage` → explorer art and `detection` → research lab art; replace them when `/technologies/espionage.png` and `/technologies/detection.png` exist.
- **Spy detected notification**: the target gets no realtime toast for `spy_detected` (no event in the spec); consider a WS event if players miss it.
- **Small armies at detection 3**: rounding to the nearest 10 shows 0 for 1–4 units; consider a minimum of 10 or a « < 10 » label.
- **Balance**: probability coefficients, costs and the tier table need playtesting.

## Evidence index

| Area | Paths |
| --- | --- |
| Technologies | `apps/server/src/core/technology/constant/code.ts`, `order.ts`, `apps/server/src/core/requirement/constant/technology.ts`, `apps/server/src/core/pricing/constant/technology.ts` (+ `core/pricing/service.spec.ts`, Renseignement), `apps/server/src/app/command/player/system/technologies.ts` (+ `.spec.ts`) |
| Intel domain | `apps/server/src/core/intel/error.ts`, `type.ts`, `constant/probability.ts`, `service.ts` (+ `service.spec.ts`: formula and clamps, tiers, scope per target kind, detection filter) |
| Spy | `apps/server/src/core/troop/constant/movement-action.ts`, `apps/server/src/app/command/troop/movement/create.ts` (+ `create-spy.spec.ts`), `spy-target.ts`, `finish/spy.ts` (+ `finish/spy.spec.ts`), `apps/server/src/app/saga/finish/spy.ts` (+ `spy.spec.ts`), `movement.ts` (+ `movement.spec.ts`) |
| Detection | `apps/server/src/app/query/troop/movement/incoming.ts` (+ `.spec.ts`), `apps/server/src/web/handler/troop/movement/incoming.ts` (+ `.spec.ts`), `apps/server/src/web/router.ts`, `apps/server/src/app/port/repository/movement.ts`, `apps/server/src/adapter/database/repository/movement.ts` (`listIncomingAttacks`), `apps/server/src/core/events.ts`, `apps/server/src/app/event-bus.ts`, `apps/server/src/web/ws.ts` (+ `ws.spec.ts`) |
| Reports | `apps/server/src/core/communication/value/report-type.ts`, `apps/server/src/app/port/repository/report.ts`, `apps/server/src/adapter/database/repository/report.ts`, `report-spy.ts`, `apps/server/src/app/query/communication/report/get.ts` (+ `get-spy.spec.ts`), `apps/server/src/web/handler/communication/report/get.ts` |
| API | `packages/api-client/src/endpoints/troop/movement/incoming.ts`, `troop/index.ts`, `communication/report/get.ts`, `packages/api-client/src/types/report-spy.ts`, `events.ts` (`MovementIncomingEventPayload`), `index.ts` (`IntelError`, `SPY_SUCCESS_*`) |
| Migration | `apps/server/src/adapter/database/migrations/00013_intelligence.ts`, `apps/server/src/adapter/database/types.ts` (`ReportSpy`). Verified locally: 3 players → 3 `espionage` and 3 `detection` rows at level 0; `report_spy` created; `listIncomingAttacks` and a `report_spy` round trip run against the database |
| Web | `apps/web/src/modules/movement/incoming/` (`index.tsx`, `item.tsx`, `translations.ts` + test), `movement/page.tsx`, `movement/spy.ts` (+ `spy.test.ts`), `movement/api/destination.ts`, `movement/create/index.tsx`, `movement/create/spy/index.tsx`, `movement/translations.ts`, `apps/web/src/modules/map/details/index.tsx`, `apps/web/src/ui/header/index.tsx`, `ui/header/incoming/index.tsx`, `apps/web/src/modules/troop/hooks.ts`, `troop/ws-listener.ts`, `apps/web/src/modules/communication/report/details.tsx`, `spy-details.tsx`, `spy-translations.ts` (+ test), `translations.ts`, `apps/web/src/modules/technology/branch.ts` (+ `branch.test.ts`), `translations.ts`, `image.ts`, `apps/web/src/helpers/error-translations.ts` |
