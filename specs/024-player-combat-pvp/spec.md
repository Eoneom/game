# Slice 024 — Player combat (PvP)

**Status**: Design locked (interview + five-round strategy combat); **not implemented** on `main` (brownfield movement has no `attack` action yet).

## Summary

Players launch **`attack`** troop movements ([`010`](../010-troop-movement-combat/spec.md)) against **enemy** map locations: **field stacks** (troops on a cell), **cities** ([`006`](../006-city-lifecycle-gathering/spec.md)), and **outposts** ([`011`](../011-outposts/spec.md)). When the movement **arrives**, the server **starts one battle** (single trigger). Before round **1**, each side locks a **combat strategy** that sets **per-round attack and life multipliers** for each of **four** `combat_troop_class` values (`legionnaire`, `interceptor`, `war_machine`, `disruptor` — one per faction combat `TroopCode`). The battle then **resolves in exactly five simultaneous combat rounds** using **attack pools** vs **life pools**, optional **composition exposure**, **role-aware target priority**, and **whole-unit casualties**. Outcomes can **loot** resources (requires surviving **carriers**), **destroy** outposts or stacks, and **occupy** locations (requires surviving **combat** troops). New **faction-exclusive combat `TroopCode`s** (same pattern as `explorer` / `seeker` in [`004`](../004-faction-domain/spec.md) + [`009`](../009-troops-stationary/spec.md)) each have **unique wire codes, French display names, and troop artwork**. **Defenders** are **auto-only**. **System-controlled** singularity players ([`016`](../016-system-controlled-players/spec.md)) recruit and fight with their faction’s combat codes. Battles emit **`battle`** reports with **per-round summaries** ([`012`](../012-communication-reports/spec.md)).

**Depends on**: faction ([`004`](../004-faction-domain/spec.md)), troops ([`009`](../009-troops-stationary/spec.md)), movement ([`010`](../010-troop-movement-combat/spec.md)), cities ([`006`](../006-city-lifecycle-gathering/spec.md)), outposts ([`011`](../011-outposts/spec.md)), reports ([`012`](../012-communication-reports/spec.md)), requirements/pricing ([`014`](../014-requirements-pricing/spec.md)), system players ([`016`](../016-system-controlled-players/spec.md)), timing ([`022`](../022-timing-and-resources/spec.md)).

**Related (today)**: [`010`](../010-troop-movement-combat/spec.md) documents peaceful `MovementAction` values only; PvP adds `attack` and battle sagas.

## Decisions (interview — locked)

| Topic | Decision |
| --- | --- |
| **Targets (v1)** | Attack **enemy troops on cells**, **cities**, and **outposts** (all in scope). |
| **War / diplomacy** | **Always-on hostility** between players of **different** factions; **cannot attack** players of the **same** faction. No separate war declaration or peace treaty in v1. |
| **Resolution** | **One-shot trigger** when the attack movement **arrives** (starts exactly one battle). Combat **resolves in exactly five rounds** (fixed strike) of **simultaneous exchange** using scheduled round jobs — not a single instant resolve at arrival. No timeout victory; see [Multi-round resolution](#multi-round-resolution-mechanics). |
| **Pre-battle strategy** | Attacker **must** choose a **`CombatStrategy`** when creating an `attack` movement. Defender uses a **garrison default strategy** on city/outpost when set, else **`balanced`**. Strategies define **per-round Attack % and Life %** multipliers for **each** of the four [combat troop classes](#combat-troop-classes). Round **5** column is the final round (battles never extend past 5). |
| **Combat stats** | Each `TroopCode` has **`attack_capacity`**, **`defense_capacity`**, and (for `combat_role = combat`) **`life_capacity`** + **`combat_troop_class`** (extend `troop_characteristics` per [`009`](../009-troops-stationary/spec.md)). **Life** is the durability stat in the casualty formula; **defense** still drives role contribution weights for non-combat stacks. |
| **Composition depth** | **Target priority** (v1): combat losses prefer the enemy class that matches the round’s dominant attacker profile. **Exposure** (v1): homogeneous combat armies (exactly one `combat_troop_class` among combat stacks) take increased casualties via a **life-pool** penalty. |
| **Battle reports** | **`battle`** reports include **`round_summaries`** (per-round pools + casualties) in metadata ([`012`](../012-communication-reports/spec.md)). |
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
| Create | `POST /troop/movement` with `action: 'attack'`, `combat_strategy` ([`CombatStrategy`](#combat-strategies)), origin/destination, troop selection. |
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

Four new codes — **two per faction**, each with **unique combat stats** and **unique identity** (wire enum, `troop_faction`, French copy, PNG art). Follow the same exclusivity model as `explorer`/`seeker` ([`009`](../009-troops-stationary/spec.md), `apps/server/src/core/troop/constant/faction.ts`).

### Roster (names, faction, stats)

| Faction | Enum member | Wire `TroopCode` | FR display name (UI) | Lore (spec) | `combat_role` | `combat_troop_class` | speed | transport_capacity | attack | defense | life |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `the_confederation` | `LEGIONNAIRE` | `legionnaire` | **Légionnaire** | Ligne d’infanterie organo-synthétique de la Confédération ; tient les garnisons et mène les assauts. | `combat` | `legionnaire` | 1.00 | 0 | 11 | 13 | 15 |
| `the_confederation` | `INTERCEPTOR` | `interceptor` | **Intercepteur** | Chasseur rapide confédéré, optimisé pour frapper en premier et rompre les formations. | `combat` | `interceptor` | 1.35 | 0 | 18 | 4 | 5 |
| `the_technological_singularity` | `WAR_MACHINE` | `war_machine` | **Machine de guerre** | Plateforme d’assaut autonome d’Alpha ; lente mais blindée, elle absorbe les tirs et avance sous le feu. | `combat` | `war_machine` | 0.90 | 0 | 13 | 16 | 17 |
| `the_technological_singularity` | `DISRUPTOR` | `disruptor` | **Perturbateur** | Unité légère de saturation et de harcèlement ; rafales courtes, repositionnement constant, coque minimale. | `combat` | `disruptor` | 1.25 | 0 | 15 | 5 | 4 |

- **`troop_faction`**: each code maps to exactly one `FactionCode` ([`004`](../004-faction-domain/spec.md)); no code appears on both factions.
- **`TroopService.codesForFaction`**: confederation humans bootstrap/recruit **legionnaire** + **interceptor** only; singularity system player gets **war_machine** + **disruptor** (humans never recruit singularity codes via normal signup).
- **Recruitment (v1)**:
  - **Humans** (`the_confederation`): `PUT /troop/recruit` for `legionnaire` and `interceptor` only ([`009`](../009-troops-stationary/spec.md)).
  - **System AI** (`the_technological_singularity`): same recruit pipeline for `war_machine` and `disruptor` on Alpha’s cities ([`016`](../016-system-controlled-players/spec.md)).
- **Stat uniqueness**: all four `TroopCode`s have **distinct** `attack_capacity`, `defense_capacity`, `life_capacity`, and `speed`. Cross-faction pairs are **not** numeric mirrors — confederation fields **heavy line** (`legionnaire`) and **fast striker** (`interceptor`); singularity fields **slow assault platform** (`war_machine`) and **harassment skirmisher** (`disruptor`).

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
| `attack_capacity` | number | Per unit per round (before strategy Attack %) |
| `defense_capacity` | number | Role weighting for non-combat contributions; **not** used in combat-troop durability pool |
| `life_capacity` | number | **Life** (durability) per unit per round (before strategy Life %). Required when `combat_role = combat`; omit (treat as `defense_capacity`) for other roles |
| `combat_troop_class` | enum | `legionnaire` \| `interceptor` \| `war_machine` \| `disruptor` — only when `combat_role = combat`; **1:1** with combat `TroopCode` wire value; drives strategy tables |
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

Combat troops are **not** recruitable at game start. Gates live in `TroopRequirement` (`apps/server/src/core/requirement/constant/troop.ts`) and are enforced by `RequirementService.checkTroopRequirement` on `PUT /troop/recruit` ([`014`](../014-requirements-pricing/spec.md), [`009`](../009-troops-stationary/spec.md)). Costs live in `troop_costs` (`apps/server/src/core/pricing/constant/troop.ts`).

**Building + technology requirements** (per `TroopCode`; wire codes from [`007`](../007-buildings-upgrade-queue/spec.md) / [`008`](../008-technology-research/spec.md)):

| `TroopCode` | Faction | `cloning_factory` level | `replication_catalyst` level | `outpost_logistics` level |
| --- | --- | ---: | ---: | ---: |
| `legionnaire` | `the_confederation` | 4 | 1 | — |
| `interceptor` | `the_confederation` | 6 | 2 | 1 |
| `war_machine` | `the_technological_singularity` | 4 | 1 | — |
| `disruptor` | `the_technological_singularity` | 6 | 2 | 1 |

- **Anchor** (`legionnaire`, `war_machine`): mid-game military cloning after the factory is upgraded past light haulers (`light_transporter` / `hauler` require `cloning_factory` 5 in [`014`](../014-requirements-pricing/spec.md)) and **`replication_catalyst` 1** is researched (military-grade replication — same tech family that shortens recruit duration today).
- **Striker** (`interceptor`, `disruptor`): late-mid assault troops need a higher factory tier plus **`replication_catalyst` 2** and **`outpost_logistics` 1** (expeditionary strike capacity aligned with outpost play in [`011`](../011-outposts/spec.md)).
- **Singularity parity**: Alpha cities use the **same requirement rows** for `war_machine` / `disruptor` as confederation uses for `legionnaire` / `interceptor` (faction differs; gates do not).
- **No day-one combat**: explorers/seekers remain `cloning_factory` 1 with no combat tech; combat codes stay locked until the rows above are met.

**Recruitment cost** (paired by role slot; combat stats are **not** paired across factions):

| Role slot | Codes | plastic | mushroom | duration (s) |
| --- | --- | ---: | ---: | ---: |
| Anchor | `legionnaire`, `war_machine` | 2_500 | 2_500 | 200 |
| Striker | `interceptor`, `disruptor` | 3_500 | 2_000 | 280 |

Implementation maps each row to `RequirementValue` `{ buildings: [{ code, level }], technologies: [{ code, level }] }` with `BuildingCode.CLONING_FACTORY` and `TechnologyCode.REPLICATION_CATALYST` / `TechnologyCode.OUTPOST_LOGISTICS` as applicable.

### System AI recruitment ([`016`](../016-system-controlled-players/spec.md))

- **Recruitment gates + costs**: Alpha uses **`war_machine`** / **`disruptor`** with the same **`TroopRequirement`** and **`troop_costs`** rows as confederation **`legionnaire`** / **`interceptor`** (see [Recruitment (requirements + pricing)](#recruitment-requirements--pricing)); combat stats differ per [Roster](#roster-names-faction-stats).
- **Policy (v1)**: below garrison threshold, prefer **`war_machine`** until ~20 count, then up to ~30% **`disruptor`** before `attack` tick actions.
- **Attack tick**: requires ≥1 **combat** stack on origin and a valid cross-faction target.
- **Strategy (v1)**: Alpha picks `opening_strike` when attacker advantage ≥ 1.2 projected pools, else `balanced` (see [Combat strategies](#combat-strategies)).

## Combat troop classes

Each faction combat `TroopCode` maps to exactly one **`combat_troop_class`** (same wire string as `TroopCode`):

| `combat_troop_class` | `TroopCode` | Faction | Role in combat |
| --- | --- | --- | --- |
| `legionnaire` | `legionnaire` | `the_confederation` | Anchor; high **life**, moderate attack |
| `interceptor` | `interceptor` | `the_confederation` | Striker; high attack, low **life** |
| `war_machine` | `war_machine` | `the_technological_singularity` | Slow assault platform; highest **life**, high **defense**, moderate **attack** |
| `disruptor` | `disruptor` | `the_technological_singularity` | Harassment skirmisher; high **attack** and **speed**, lowest **life** |

Strategy multipliers apply **per `combat_troop_class` per round** (four independent columns in tables below). Non-combat `TroopCode`s omit `combat_troop_class`.

## Combat strategies

`CombatStrategy` is chosen **before round 1** and stored on the battle snapshot (`attacker_strategy`, `defender_strategy`).

| Side | How strategy is set (v1) |
| --- | --- |
| **Attacker** | Required field `combat_strategy` on `POST /troop/movement` when `action = attack` ([`010`](../010-troop-movement-combat/spec.md)). |
| **Defender** | **City / outpost**: optional `default_combat_strategy` on garrison settings (persisted with location). **Field stack**: `balanced`. If unset, `balanced`. |

Wire enum (example): `balanced`, `opening_strike`, `hold_the_line`. All factions share the same strategy definitions.

Each strategy provides **Attack %** and **Life %** multipliers per `combat_troop_class` for rounds **1–5** (values are factors on base capacities, e.g. `1.00` = 100%). For this spec the battle **never runs round 6+**; round **5** values apply only to round 5. Each of the **four** classes has its **own** multiplier row (curves may differ by role — e.g. `war_machine` gains less from `opening_strike` spike, more from `hold_the_line` durability).

### `balanced` (default)

| Round | `legionnaire` Att% | `legionnaire` Life% | `interceptor` Att% | `interceptor` Life% | `war_machine` Att% | `war_machine` Life% | `disruptor` Att% | `disruptor` Life% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1–5 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

### `opening_strike`

| Round | `legionnaire` Att% | `legionnaire` Life% | `interceptor` Att% | `interceptor` Life% | `war_machine` Att% | `war_machine` Life% | `disruptor` Att% | `disruptor` Life% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.12 | 0.92 | 1.32 | 0.78 | 1.08 | 0.94 | 1.28 | 0.74 |
| 2 | 1.08 | 0.96 | 1.22 | 0.83 | 1.06 | 0.97 | 1.20 | 0.80 |
| 3 | 1.04 | 1.00 | 1.12 | 0.88 | 1.04 | 1.02 | 1.14 | 0.86 |
| 4 | 1.00 | 1.00 | 1.06 | 0.94 | 1.02 | 1.00 | 1.08 | 0.92 |
| 5 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

### `hold_the_line`

| Round | `legionnaire` Att% | `legionnaire` Life% | `interceptor` Att% | `interceptor` Life% | `war_machine` Att% | `war_machine` Life% | `disruptor` Att% | `disruptor` Life% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.88 | 1.18 | 0.82 | 1.08 | 0.85 | 1.22 | 0.84 | 1.05 |
| 2 | 0.93 | 1.22 | 0.87 | 1.13 | 0.90 | 1.28 | 0.88 | 1.10 |
| 3 | 0.98 | 1.28 | 0.92 | 1.18 | 0.96 | 1.34 | 0.92 | 1.14 |
| 4 | 1.03 | 1.32 | 0.97 | 1.23 | 1.02 | 1.38 | 0.96 | 1.18 |
| 5 | 1.08 | 1.38 | 1.02 | 1.28 | 1.08 | 1.45 | 1.00 | 1.22 |

**Lookup**: for round `r`, use column `r`; if `r > 5` (not used in v1), keep round **5** multipliers.

## Composition rules

### Who fights

At battle **start**, snapshot defender cell stacks or attacker movement payload:

| `combat_role` | In battle? | Attack pool contribution | Life pool contribution |
| --- | --- | --- | --- |
| `combat` | yes | `attack_capacity × count` (× strategy Att% per class) | `life_capacity × count` (× strategy Life% per class) |
| `carrier` | yes | 0 | 50% `defense_capacity × count` (no strategy) |
| `civilian` | yes | 0 | 25% `defense_capacity × count` |
| `scout` | yes (if on cell) | 25% `attack_capacity × count` | 50% `defense_capacity × count` |

- **Attack** requires ≥ 1 `combat` unit; scouts cannot join `attack` movements.
- Exclude troops with non-null `movement_id`.

### Carriers and civilians under fire

- Carriers deal no damage; casualties hit **combat** stacks first, then **carrier**, then **civilian**, then **scout** (lowest `defense_capacity` first within role).
- **Loot** requires surviving **`carrier`** on winning attacker ([Outcomes vs army composition](#outcomes-vs-army-composition)).
- On successful **occupation**, default: remaining **defender civilians** on cell are **destroyed** (see open questions in project `docs/combat-spec-interview.md`).

### Composition exposure (homogeneous combat)

When a side’s surviving **`combat`** stacks all share the **same** `combat_troop_class` (homogeneous army — e.g. only `legionnaire`, or only `disruptor`, with no other combat class present), that side’s **life pool** for the round is multiplied by **`EXPOSURE_LIFE_MULT = 0.85`** before casualties (≈15% more vulnerability). Mixed-class combat armies (two or more distinct `combat_troop_class` values) use multiplier **1.0**. Carriers/civilians/scouts do not affect this check.

### Target priority (combat casualties)

When applying **whole-unit** losses to **`combat`** stacks on a side:

1. **Class focus**: let `dominant_class` be the attacker’s `combat_troop_class` with higher **attack pool** contribution this round. Prefer removing defender **combat** units whose class equals `dominant_class` first (focus fire). If tied, prefer the class with higher base `attack_capacity` (`interceptor` / `disruptor` before `legionnaire` / `war_machine`).
2. **Within class**: lowest `life_capacity` stack first, then lowest `count`.
3. After **combat** stacks are exhausted for the round’s loss budget, continue with [carriers and civilians](#carriers-and-civilians-under-fire) ordering.

Symmetric rules when the defender inflicts losses on the attacker.

## Multi-round resolution (mechanics)

### Scheduling

- **Combat rounds**: each battle runs a fixed **strike of exactly 5 rounds** (rounds **1** through **5**). Casualties from each round apply before the next round begins.
- **Early end**: if, after any round **1–4**, one side has **zero** `combat` units and the other has **≥ 1** `combat`, the battle **ends immediately** (no further rounds).
- **Round interval**: `COMBAT_ROUND_INTERVAL_MS` — propose **30_000** ([`022`](../022-timing-and-resources/spec.md)) for **pacing between scheduled round jobs only**. It is **not** a battle timeout and does **not** award victory to either side.
- **After round 5**: if the battle has not already ended early, it **always ends** when round 5 finishes — even when both sides still have `combat` troops.

### Per-round algorithm (simultaneous exchange)

For round `r` ∈ {1…5}:

1. **Strategy multipliers**: load Att%/Life% for each `combat_troop_class` from each side’s locked `CombatStrategy` (round **5** column when `r = 5`).
2. **Pools** (side `S`):
   - `attack_pool(S) = Σ_stack (count × effective_attack)` with [role weights](#who-fights) and, for combat stacks, `effective_attack = attack_capacity × att_multiplier(class, r)`.
   - `life_pool(S) = Σ_stack (count × effective_life)` with role weights; combat stacks use `effective_life = life_capacity × life_multiplier(class, r)`; other roles use `defense_capacity` per table.
   - Apply [composition exposure](#composition-exposure-homogeneous-combat) to `life_pool(S)` when applicable.
3. **Strike order**: **Simultaneous** each round (no first-strike in v1).
4. **Casualties (whole units)** attacker → defender:  
   `loss_budget = max(1, floor(attack_pool(attacker) / max(1, life_pool(defender))))` when `attack_pool(attacker) > 0`; distribute losses using [target priority](#target-priority-combat-casualties). Symmetric for defender → attacker.
5. **Round record**: append [round summary](#payload-per-report-row) (pools + losses) to battle state for reports.
6. **End round**: apply casualties, then evaluate [Battle end summary](#battle-end-summary). If the battle continues, schedule the next round (until round 5 completes or an early-end condition fires).

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
| **Destroy** | **No** — temp outposts, field stacks, and garrison stacks are **not** destroyed solely because of a draw. |
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
attack movement arrives → snapshot (strategies, stacks) → schedule round 1
each round r=1..5: strategy multipliers → pools → simultaneous casualties → round summary
battle end → outcomes + battle reports (with round_summaries)
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
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
  rounds_played: number
  outcome: {
    occupied: boolean
    destroyed_temp_outpost: boolean
    loot_applied: boolean
    attacker_retreated: boolean // true when surviving attacker stacks were sent to movement origin (defender win or draw stalemate)
  }
  casualties_attacker: { code: TroopCode; count: number }[] // units lost
  casualties_defender: { code: TroopCode; count: number }[]
  round_summaries: {
    round: number
    attacker_attack_pool: number
    defender_attack_pool: number
    attacker_life_pool: number
    defender_life_pool: number
    attacker_losses: { code: TroopCode; count: number }[]
    defender_losses: { code: TroopCode; count: number }[]
  }[] // required v1 — one row per round actually played (1..rounds_played)
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
| `report/details.tsx` | Branch on `type === 'battle'`: show factions, **strategies**, winner, rounds, **round-by-round table** (`round_summaries`), outcome flags (loot / occupy / destroy / **attacker retreated**), casualty totals for both sides (from `battle` metadata), links: `movement_id` → movement detail route when route exists ([`019`](../019-web-shell-routing/spec.md)); `battle_id` for future dedicated battle page (optional v1). |
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
| Troops | No `attack_capacity` / `life_capacity` / `combat_troop_class`; roles via `TroopRole` + `troop_characteristics` speed/capacity ([`009`](../009-troops-stationary/spec.md)). |
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
