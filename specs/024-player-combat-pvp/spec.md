# Slice 024 — Player combat (PvP)

**Status**: Design locked (interview + combat mechanics); **not implemented** on `main` (brownfield movement has no `attack` action yet).

## Summary

Players launch **`attack`** troop movements ([`010`](../010-troop-movement-combat/spec.md)) against **enemy** map locations: **field stacks** (troops on a cell), **cities** ([`006`](../006-city-lifecycle-gathering/spec.md)), and **outposts** ([`011`](../011-outposts/spec.md)). When the movement **arrives**, the server **starts one battle** (single trigger). That battle **resolves over multiple combat rounds** using **attack/defense pools** and **whole-unit casualties**. Outcomes can **loot** resources (requires surviving **carriers**), **destroy** structures or stacks, and **occupy** locations (requires surviving **combat** troops). New **faction-exclusive combat `TroopCode`s** (same pattern as `explorer` / `seeker` in [`004`](../004-faction-domain/spec.md) + [`009`](../009-troops-stationary/spec.md)) each have **unique wire codes, French display names, and troop artwork**. **Defenders** are **auto-only**. **System-controlled** singularity players ([`016`](../016-system-controlled-players/spec.md)) recruit and fight with their faction’s combat codes. Battles emit **`battle`** reports ([`012`](../012-communication-reports/spec.md)).

**Depends on**: faction ([`004`](../004-faction-domain/spec.md)), troops ([`009`](../009-troops-stationary/spec.md)), movement ([`010`](../010-troop-movement-combat/spec.md)), cities ([`006`](../006-city-lifecycle-gathering/spec.md)), outposts ([`011`](../011-outposts/spec.md)), reports ([`012`](../012-communication-reports/spec.md)), requirements/pricing ([`014`](../014-requirements-pricing/spec.md)), system players ([`016`](../016-system-controlled-players/spec.md)), timing ([`022`](../022-timing-and-resources/spec.md)).

**Related (today)**: [`010`](../010-troop-movement-combat/spec.md) documents peaceful `MovementAction` values only; PvP adds `attack` and battle sagas.

## Decisions (interview — locked)

| Topic | Decision |
| --- | --- |
| **Targets (v1)** | Attack **enemy troops on cells**, **cities**, and **outposts** (all in scope). |
| **War / diplomacy** | **Always-on hostility** between players of **different** factions; **cannot attack** players of the **same** faction. No separate war declaration or peace treaty in v1. |
| **Resolution** | **One-shot trigger** when the attack movement **arrives** (starts exactly one battle). Combat **resolves in exactly five rounds** (fixed strike) using scheduled round jobs — not a single instant resolve at arrival. No timeout victory; see [Multi-round resolution](#multi-round-resolution-mechanics). |
| **Combat stats** | Each `TroopCode` has **`attack_capacity`** and **`defense_capacity`** (extend `troop_characteristics`). |
| **Outcomes (v1)** | **Loot**, **destroy**, and **occupy** are all in scope; see [Outcomes matrix](#outcomes-matrix) and [Outcomes vs army composition](#outcomes-vs-army-composition). |
| **Defenders** | **Auto-defend only**: all eligible defender troops on the target cell join the battle automatically; no optional decline, no manual intercept from other cells. |
| **Attacker retreat** | On **defender win** or **draw** (when the attacker still has survivors), surviving attacker troops **return to the attack movement origin cell** — same as defeat retreat; draw does not leave attackers on the destination. |
| **System players** | **Yes** — system-controlled players are valid attackers and defenders under the same faction and combat rules (e.g. singularity `Alpha` vs confederation humans). |
| **Faction identity** | **No shared generic combat unit** across factions; each new combat troop is **one faction only** (`troop_faction`), with **distinct name + art** like `explorer` vs `seeker`. |

## Faction gating

- Resolve **attacker** and **defender** `player_id` → `faction_code` ([`004`](../004-faction-domain/spec.md)).
- **Allow** attack only if `attacker.faction_code !== defender.faction_code`.
- **Reject** same-faction attacks.
- Playable signup today: **`the_confederation`** (humans). **`the_technological_singularity`** is non-playable but used by system AI ([`004`](../004-faction-domain/spec.md)); singularity combat troops still need **full name + art** for PvP UI, reports, and map tooltips when fighting Alpha.

## Attack targets

| Target kind | How identified at arrival | Defender owner |
| --- | --- | --- |
| **Field stack** | Destination `cell_id` has enemy troops; no enemy city/outpost on cell (or exposed stack per implementation). | Owner of troops on the cell. |
| **City** | Destination cell hosts an enemy **city** (`city_id`). | City owner. |
| **Outpost** | Destination cell hosts an enemy **outpost** (`outpost_id`). | Outpost owner. |

If city/outpost and garrison share a cell, the **location** is the assault target; **all stacks on that cell** enter the battle snapshot.

## Movement: `attack` action

Extend `MovementAction` with `ATTACK = 'attack'` (see [`010`](../010-troop-movement-combat/spec.md)).

| Concern | Spec |
| --- | --- |
| Create | `POST /troop/movement` with `action: 'attack'`, origin/destination, troop selection. |
| Faction check | Enforce [Faction gating](#faction-gating) before persist. |
| Troop mix | At least **one combat-role** unit required (see [Composition rules](#composition-rules)). |
| Finish | On `troop.movement.finish`, start **battle** instead of peaceful sagas. |
| Estimate | `POST /troop/movement/estimate` accepts `attack`; ETA from slowest selected unit **speed**. |

**Allowed movement actions by role** (v1):

| `combat_role` | `explore` | `base` / rebase | `transport` | `attack` |
| --- | --- | --- | --- | --- |
| `combat` | no | yes | no (payload) | yes |
| `carrier` | no | yes | yes | yes (escort) |
| `civilian` | no* | yes | no* | yes (vulnerable) |
| `scout` | yes | yes | no | no |

\*Existing earning troops keep today’s explore/transport rules for non-combat codes.

## Combat troops (faction-exclusive `TroopCode`s)

Four new codes — **two per faction**, **mirrored combat stats** but **unique identity** (wire enum, `troop_faction`, French copy, PNG art). Follow the same exclusivity model as `explorer`/`seeker` ([`009`](../009-troops-stationary/spec.md), `apps/server/src/core/troop/constant/faction.ts`).

### Roster (names, faction, stats)

| Faction | Enum member | Wire `TroopCode` | FR display name (UI) | Lore (spec) | `combat_role` | speed | transport_capacity | attack | defense |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `the_confederation` | `LEGIONNAIRE` | `legionnaire` | **Légionnaire** | Ligne d’infanterie organo-synthétique de la Confédération ; tient les garnisons et mène les assauts. | `combat` | 1.0 | 0 | 12 | 12 |
| `the_confederation` | `INTERCEPTOR` | `interceptor` | **Intercepteur** | Chasseur rapide confédéré, optimisé pour frapper en premier et rompre les formations. | `combat` | 1.35 | 0 | 16 | 6 |
| `the_technological_singularity` | `WAR_MACHINE` | `war_machine` | **Machine de guerre** | Plateforme d’assaut autonome d’Alpha ; ancre la ligne singularity sur le champ de bataille. | `combat` | 1.0 | 0 | 12 | 12 |
| `the_technological_singularity` | `DISRUPTOR` | `disruptor` | **Perturbateur** | Unité légère de saturation et de harcèlement ; fragile mais mortelle en rafale. | `combat` | 1.35 | 0 | 16 | 6 |

- **`troop_faction`**: each code maps to exactly one `FactionCode` ([`004`](../004-faction-domain/spec.md)); no code appears on both factions.
- **`TroopService.codesForFaction`**: confederation humans bootstrap/recruit **legionnaire** + **interceptor** only; singularity system player gets **war_machine** + **disruptor** (humans never recruit singularity codes via normal signup).
- **Recruitment (v1)**:
  - **Humans** (`the_confederation`): `PUT /troop/recruit` for `legionnaire` and `interceptor` only ([`009`](../009-troops-stationary/spec.md)).
  - **System AI** (`the_technological_singularity`): same recruit pipeline for `war_machine` and `disruptor` on Alpha’s cities ([`016`](../016-system-controlled-players/spec.md)).
- **Parity**: confederation pair and singularity pair use **identical numeric columns** above; only names, art, and faction mapping differ.

### Web: translations and artwork convention

Align with existing troops (`explorer`, `seeker`, etc.):

| Concern | Location | Convention |
| --- | --- | --- |
| **Image file** | `apps/web/public/troops/<wire_code>.png` | One PNG per `TroopCode` wire value (snake_case), e.g. `legionnaire.png`, `war_machine.png`. Same layout as `explorer.png` / `seeker.png`. |
| **Image URL** | `apps/web/src/modules/troop/image.ts` | `troopImageSrc(code)` → `` `/troops/${code}.png` `` (no change to helper; new files only). |
| **French name / description** | `apps/web/src/modules/troop/translations.ts` | Add `TroopTranslations` entries: `name` = FR display name from table above; `description` / `effect` = short combat flavor (implement with product copy). |
| **Alt text** | Troop list/detail components | Use `TroopTranslations[code].name` for `image.alt` (today `list/item` uses empty `alt` — implementation should set alt to troop name for accessibility). |
| **API client** | `packages/api-client` | Export new enum members after server `TroopCode` extension. |

**Required new assets (implementation checklist, not in repo until art lands):**

| Wire code | PNG path | Suggested alt (FR) |
| --- | --- | --- |
| `legionnaire` | `apps/web/public/troops/legionnaire.png` | Légionnaire |
| `interceptor` | `apps/web/public/troops/interceptor.png` | Intercepteur |
| `war_machine` | `apps/web/public/troops/war_machine.png` | Machine de guerre |
| `disruptor` | `apps/web/public/troops/disruptor.png` | Perturbateur |

Enemy-faction troops must render correctly in battle reports, movement troop picker, and location troop lists (read-only stacks), even if the local player cannot recruit that code.

### Extended `troop_characteristics` schema

Extend `TroopCharacteristic` (`apps/server/src/core/troop/constant/characteristic.ts`) per [`009`](../009-troops-stationary/spec.md):

| Field | Type | Notes |
| --- | --- | --- |
| `speed` | number | Travel ETA |
| `transport_capacity` | number | Loot haul when `combat_role` is `carrier` |
| `attack_capacity` | number | Per unit per round |
| `defense_capacity` | number | Per unit per round |
| `combat_role` | enum | `combat` \| `carrier` \| `civilian` \| `scout` |

**Existing troops** — add combat fields (unchanged codes):

| `TroopCode` | `combat_role` | attack | defense |
| --- | --- | --- | --- |
| `explorer` / `seeker` | `scout` | 2 | 3 |
| `settler` / `assembler` | `civilian` | 0 | 4 |
| `light_transporter` / `hauler` | `carrier` | 1 | 6 |
| `farmer` / `harvester` | `civilian` | 0 | 3 |
| `recycler` / `reclaimer` | `civilian` | 0 | 3 |

No per-player recruit cap beyond existing city recruitment concurrency ([`009`](../009-troops-stationary/spec.md)).

### Recruitment (requirements + pricing)

Mirror **numeric** rows per faction pair; requirements use `TroopRequirement` + `troop_costs` ([`014`](../014-requirements-pricing/spec.md)).

| Faction line unit | `CLONING_FACTORY` level | plastic | mushroom | duration (s) |
| --- | --- | --- | --- | --- |
| `legionnaire` / `war_machine` | 4 | 2_500 | 2_500 | 200 |
| `interceptor` / `disruptor` | 6 | 3_500 | 2_000 | 280 |

Technologies: **none** in v1.

### System AI recruitment ([`016`](../016-system-controlled-players/spec.md))

- **Parity**: Alpha uses **`war_machine`** / **`disruptor`** with the same costs and requirements as confederation counterparts.
- **Policy (v1)**: below garrison threshold, prefer **line** unit until ~20 count, then up to ~30% **skirmisher** before `attack` tick actions.
- **Attack tick**: requires ≥1 **combat** stack on origin and a valid cross-faction target.

## Composition rules

### Who fights

At battle **start**, snapshot defender cell stacks or attacker movement payload:

| `combat_role` | In battle? | Attack pool | Defense pool |
| --- | --- | --- | --- |
| `combat` | yes | 100% `attack_capacity × count` | 100% `defense_capacity × count` |
| `carrier` | yes | 0 | 50% `defense_capacity × count` |
| `civilian` | yes | 0 | 25% `defense_capacity × count` |
| `scout` | yes (if on cell) | 25% attack | 50% defense |

- **Attack** requires ≥ 1 `combat` unit; scouts cannot join `attack` movements.
- Exclude troops with non-null `movement_id`.

### Carriers and civilians under fire

- Carriers deal no damage; casualties hit **combat** stacks first, then **carrier**, then **civilian**, then **scout** (lowest `defense_capacity` first within role).
- **Loot** requires surviving **`carrier`** on winning attacker ([Outcomes vs army composition](#outcomes-vs-army-composition)).
- On successful **occupation**, default: remaining **defender civilians** on cell are **destroyed** (see open questions in project `docs/combat-spec-interview.md`).

## Multi-round resolution (mechanics)

### Scheduling

- **Combat rounds**: each battle runs a fixed **strike of exactly 5 rounds** (rounds **1** through **5**). Casualties from each round apply before the next round begins.
- **Early end**: if, after any round **1–4**, one side has **zero** `combat` units and the other has **≥ 1** `combat`, the battle **ends immediately** (no further rounds).
- **Round interval**: `COMBAT_ROUND_INTERVAL_MS` — propose **30_000** ([`022`](../022-timing-and-resources/spec.md)) for **pacing between scheduled round jobs only**. It is **not** a battle timeout and does **not** award victory to either side.
- **After round 5**: if the battle has not already ended early, it **always ends** when round 5 finishes — even when both sides still have `combat` troops.

### Per-round algorithm (simultaneous exchange)

1. **Pools**: `attack_pool(S) = Σ (count × effective_attack)`, `defense_pool(S) = Σ (count × effective_defense)` with [composition multipliers](#who-fights).
2. **Strike order**: **Simultaneous** each round (no first-strike in v1).
3. **Casualties (whole units)** attacker → defender:  
   `losses = min(defender_units_in_priority_order, max(1, floor(attack_pool(attacker) / max(1, defense_pool(defender)))))` when `attack_pool(attacker) > 0`; symmetric for defender → attacker.
4. **End round**: apply casualties, then evaluate [Battle end summary](#battle-end-summary). If the battle continues, schedule the next round (until round 5 completes or an early-end condition fires).

### Battle end summary

| Condition | Result |
| --- | --- |
| Defender 0 `combat`, attacker ≥ 1 `combat` (any round 1–5) | **Attacker wins** |
| Attacker 0 `combat`, defender ≥ 1 `combat` (any round 1–5) | **Defender wins** |
| Round **5** completes and **both** sides have ≥ 1 `combat` | **Draw** (stalemate) — no winner; apply [Draw (stalemate) outcomes](#draw-stalemate-outcomes) (attacker survivors **retreat to origin**). |
| Both sides 0 `combat` in the same round | **Draw** — no winner; casualties only (no retreat — no surviving attacker stacks). |

There is **no** defender-wins-on-timeout, **no** maximum round count beyond the fixed five, and **no** automatic defender victory when time elapses.

### Draw (stalemate) outcomes

When the result is **draw**:

| Effect | Spec |
| --- | --- |
| **Casualties** | All losses from rounds **1–5** (or fewer if ended early on a mutual-wipe draw) **remain applied**. **Defender** survivors stay on the battle cell; **attacker** survivors **leave** the destination (see **Attacker movement**). |
| **Occupy** | **No** — city/outpost ownership unchanged; attacker does not hold the cell as occupier. |
| **Destroy** | **No** — temp outposts, field stacks, and garrison structures are **not** destroyed solely because of a draw. |
| **Loot** | **No** — no resource transfer. |
| **Attacker movement** | Surviving attacker troops **retreat to the attack movement origin cell** (same placement rule as **defender win**). Draw is **not** a defender win — only retreat + casualty rules apply (no loot / occupy / destroy). |

**Attacker retreat (spec default):** on **defender win** or **draw** with ≥ 1 surviving attacker stack, survivors **return to attack movement origin cell**.

Draw does **not** apply when one side eliminated the other’s **combat** force in round 5 (or earlier): that battle ends with a normal **attacker** or **defender** win and full [Outcomes matrix](#outcomes-matrix) applies.

### Defender snapshot (auto-defend)

All defender stacks on cell with `movement_id` null; no reinforcements; no building HP in v1.

## Outcomes matrix

| Target | Attacker **wins** | Attacker **loses** | **Draw** (after 5 rounds or mutual wipe) |
| --- | --- | --- | --- |
| **Field stack** | Destroy defender troops; loot if carriers survive; occupy with survivors. | Retreat to origin. | Casualties only; defender stacks remain on cell; **attacker retreat to origin**; no loot/occupy/destroy. |
| **City** | Destroy garrison; loot warehouse; transfer **city** ownership. | City stays defender; retreat. | City stays defender; casualties only; **attacker retreat to origin**; no loot. |
| **Outpost (temporary)** | Destroy garrison; **destroy** temp outpost; loot; hold cell. | Outpost remains; retreat. | Outpost remains; casualties only; **attacker retreat to origin**. |
| **Outpost (permanent)** | Destroy garrison; loot; transfer **outpost** ownership. | Outpost remains; retreat. | Outpost remains; casualties only; **attacker retreat to origin**; no loot. |

City buildings are **not** deleted on capture.

## Outcomes vs army composition

| Outcome | Winning attacker requirement |
| --- | --- |
| **Occupy** | ≥ 1 surviving `combat` unit. |
| **Loot** | Surviving `carrier` stacks with total `transport_capacity` ≥ 1; transfer `min(50%` of each lootable resource`, remaining capacity)` ([`015`](../015-resources-model/spec.md)). |
| **Destroy** (temp outpost / troops) | Attacker win per matrix. |

## Battle lifecycle (jobs)

```text
attack movement arrives → snapshot → Battle round 0 → schedule round 1
each round: pools + casualties → end or schedule next
battle end → outcomes + battle reports
```

Arrival is one saga trigger; rounds use [`018`](../018-app-composition-jobs/spec.md).

## System-controlled players

Same rules; Alpha uses singularity combat codes and art. Humans see **Machine de guerre** / **Perturbateur** in UI when fighting singularity stacks.

## Communication reports (battle inbox)

Extend [`012`](../012-communication-reports/spec.md) with a new persisted report type when a **fight finishes** (after the last combat round and outcome application — not when the attack movement merely arrives).

### Report type

| Enum | Wire value | Notes |
| --- | --- | --- |
| `ReportType.BATTLE` | `battle` | Add to `core/communication/value/report-type.ts` and API client re-export. Prefer **`battle`** over `combat` for consistency with domain language (“battle” entity / jobs). |

Existing HTTP surface unchanged: `GET /communication/report`, `GET /communication/report/:report_id`, mark read, unread count, cleanup job ([`012`](../012-communication-reports/spec.md)).

### Who receives a report

| Player | Receives `battle` report? |
| --- | --- |
| **Attacker** (`movement.player_id`) | **Yes** — always |
| **Defender** (owner at battle start) | **Yes** — always |

Two separate `ReportEntity` rows per finished battle (one per `player_id`), same logical battle, **independent** `was_read` state. No report for non-participants. If defender is a system player, Alpha gets an inbox row like humans.

### Timing and command hook

1. `sagaAdvanceCombatRound` / `sagaFinishBattle` applies [Outcomes matrix](#outcomes-matrix).
2. **`createBattleReports`** (command) inserts attacker + defender reports in one transaction with battle outcomes.
3. Emit WebSocket notification(s) (see below).

### Payload (per report row)

Reuse brownfield columns where possible (`ReportEntity`: `origin`, `destination`, `troops`, `resources`, `remaining_resources`, `recorded_at`, `type`, `player_id`).

| Field | Attacker report | Defender report |
| --- | --- | --- |
| `type` | `battle` | `battle` |
| `player_id` | Attacker id | Defender id |
| `origin` | Attack movement **origin** coordinates | Same (shows where the assault launched) |
| `destination` | **Battle cell** coordinates | Same |
| `recorded_at` | Battle finish time | Same |
| `troops` | **This player’s casualties** (lost units per `TroopCode`, `count` = losses) | Defender casualties (losses) |
| `resources` | **Loot gained** (attacker only; zeros if no loot / defender report) | `0` (defender does not gain loot on loss; on defender win, zeros) |
| `remaining_resources` | Unused (zeros) unless implementation stores “loot left behind” | Zeros |

**Battle-specific metadata** (not expressible in today’s flat `report` table alone): add a **`report_battle`** table (or `report.metadata` JSONB migration) keyed by `report_id`, shared shape for both players:

```typescript
interface ReportBattleMetadata {
  battle_id: string
  movement_id: string
  perspective: 'attacker' | 'defender'
  attacker_player_id: string
  defender_player_id: string
  attacker_faction_code: FactionCode
  defender_faction_code: FactionCode
  target_kind: 'field' | 'city' | 'outpost'
  target_id?: string // city_id | outpost_id when applicable
  winner: 'attacker' | 'defender' | 'draw'
  rounds_played: number
  outcome: {
    occupied: boolean
    destroyed_temp_outpost: boolean
    loot_applied: boolean
    attacker_retreated: boolean // true when surviving attacker stacks were sent to movement origin (defender win or draw stalemate)
  }
  casualties_attacker: { code: TroopCode; count: number }[] // units lost
  casualties_defender: { code: TroopCode; count: number }[]
  round_summaries?: {
    round: number
    attacker_losses: { code: TroopCode; count: number }[]
    defender_losses: { code: TroopCode; count: number }[]
  }[] // optional v1: final totals only; per-round rows if UX needs replay
}
```

- **API**: extend `CommunicationGetReportResponse` / list item DTO with optional `battle?: ReportBattleMetadata` when `type === 'battle'`.
- **Faction display**: use `FactionCode` + [`004`](../004-faction-domain/spec.md) web translations (`apps/web/src/modules/faction/translations.ts`).
- **Troop names**: `TroopTranslations` + faction troop art for both sides’ codes in detail view.

### Web inbox UI

Follow `apps/web/src/modules/communication/` patterns:

| Piece | Change |
| --- | --- |
| `report/translations.ts` | `ReportTypeLabels[ReportType.BATTLE] = 'Bataille'` (FR, like existing labels). |
| `report/list.tsx` | No change required; list already shows `report.type` + origin → destination. |
| `report/details.tsx` | Branch on `type === 'battle'`: show factions, winner, rounds, outcome flags (loot / occupy / destroy / **attacker retreated**), casualty tables for both sides (from `battle` metadata), links: `movement_id` → movement detail route when route exists ([`019`](../019-web-shell-routing/spec.md)); `battle_id` for future dedicated battle page (optional v1). |
| Troop lines | Use `TroopTranslations[troop.code].name` for all codes (confederation + singularity) per [Web artwork convention](#web-translations-and-artwork-convention). |

Unread badge: existing `GET /communication/report/unread/count` includes new `battle` rows.

### WebSocket / realtime ([`017`](../017-realtime-websocket/spec.md))

**Brownfield:** movement finish emits `AppEvent.TroopMovementFinished` (`troop:movement-finished`); `apps/web/src/modules/troop/ws-listener.ts` invalidates `reportKeys.unreadCount` (reports created on peaceful movement finish).

**PvP:** battle reports are created at **battle end**, which may be **after** movement finish. Add:

| Event | Wire | Payload | When |
| --- | --- | --- | --- |
| `AppEvent.BattleFinished` | `battle:finished` | `{ player_id: string }` | After each participant’s `battle` report is persisted (emit **once per player** — attacker and defender). |

**Web client:** register listener (e.g. `apps/web/src/modules/communication/ws-listener.ts` or extend troop listener) to on `battle:finished` for matching session:

- `queryClient.invalidateQueries({ queryKey: reportKeys.unreadCount })`
- `queryClient.invalidateQueries({ queryKey: ['reports'] })` (list pages)
- Optional toast: “Nouveau rapport de bataille” (product copy)

Do **not** rely on `troop:movement-finished` alone for defender inbox refresh or post-round battle completion.

### Factory / persistence (implementation hint)

Extend `ReportFactory` (or `ReportFactory.generateBattleReport`) parallel to `generateUnread` for movement reports (`apps/server/src/core/communication/report/factory.ts`). Persist via `repository.report.create` + `report_battle` insert; covered by [`012`](../012-communication-reports/spec.md) test paths.

## Brownfield inventory (as of `main`)

| Area | Today |
| --- | --- |
| Movement | `explore`, `base`, `transport` only; no hostility ([`010`](../010-troop-movement-combat/spec.md)). |
| Troops | No `attack_capacity` / `defense_capacity`; roles via `TroopRole` + `troop_characteristics` speed/capacity ([`009`](../009-troops-stationary/spec.md)). |
| Faction troops | `troop_faction` exclusive codes per faction ([`004`](../004-faction-domain/spec.md)). |
| Art | `apps/web/public/troops/*.png` + `troopImageSrc` + `TroopTranslations`. |
| System AI | No `attack` tick ([`016`](../016-system-controlled-players/spec.md)). |

## Deferred (follow-up)

See project `docs/combat-spec-interview.md` (max 5 open questions): exploration gate, attack preview, civilian fate on capture, peaceful movement into hostile cells, attack movement cost.

## Implementation outline (non-normative)

| Area | Direction |
| --- | --- |
| Core | `core/combat/`, `troop/constant/{code,characteristic,faction}.ts`, pricing/requirement tables |
| Web | New PNGs + `TroopTranslations`; optional `image.alt` fix |
| Sagas / jobs | `sagaFinishAttack`, `combat.round.advance` |

## Evidence index (expected after implementation)

| Area | Paths (TBD) |
| --- | --- |
| Core | `apps/server/src/core/combat/`, `core/troop/constant/` |
| Web art | `apps/web/public/troops/{legionnaire,interceptor,war_machine,disruptor}.png` |
| Web UI | `apps/web/src/modules/troop/{image,translations}.ts` |
| Reports | `core/communication/value/report-type.ts`, `report_battle` metadata, `communication/ws-listener` |
