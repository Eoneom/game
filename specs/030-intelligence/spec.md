# Slice 030 — Intelligence: espionage and detection

**Status**: Planned.

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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Technologies | `core/technology/constant/code.ts`, requirement and pricing constants |
| Spy | `core/troop/constant/movement-action.ts`, `app/command/troop/movement/create.ts`, `app/saga/finish/spy.ts`, `core/intel/` (probability, tiers) |
| Detection | `app/query/troop/movement/incoming.ts`, `web/handler/troop/movement/incoming.ts`, `core/events.ts` |
| Reports | `core/communication/`, `adapter/database/repository/report-spy.ts` |
| Web | `modules/movement/*`, header, `modules/communication/report/details.tsx`, `modules/technology/*` |
