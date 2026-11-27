# Slice 036 — Playable faction: La Symbiose

**Status**: Implemented on `main` (slice 036): playable faction `the_symbiosis` with nine roster codes, +10 % mushroom / −10 % plastic production modifier, faction-gated defenses `mycelium_wall` (regrowth) and `spore_cloud` (attack reduction, 40 % combined cap), human targeting for the Ash Liturgy AI, signup faction cards, migration `00019_symbiosis`. Artwork uses placeholders (see [Follow-ups](#follow-ups)).

## Summary

Add a second **playable** faction, **La Symbiose** (`the_symbiosis`): a human colony fused with the mycelium that grows through the ruins. It plays as a **mass army** (cheaper, faster to produce, individually weaker units). It is strong on mushrooms and weak on plastic, and has **two faction-exclusive defenses**.

With two playable factions, **human-vs-human PvP** becomes possible: players of different factions are always hostile ([`024`](../024-player-combat-pvp/spec.md)). Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`004`](../004-faction-domain/spec.md) (factions), [`002`](../002-player-session-auth/spec.md) (signup), [`009`](../009-troops-stationary/spec.md) (rosters), [`014`](../014-requirements-pricing/spec.md), [`024`](../024-player-combat-pvp/spec.md), [`029`](../029-city-defenses/spec.md) (defenses), [`016`](../016-system-controlled-players/spec.md) / [`025`](../025-lawless-human-faction/spec.md) (AI targeting).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Identity** | Human colony fused with the mycelium; patient, organic, numerous. |
| **Passive bonus** | **+10 % mushroom** production, **−10 % plastic** production (all sources). |
| **Unit profile** | **Mass**: combat units about **25 % cheaper** and **25 % faster** to produce than their Confederation counterpart, about **20 % weaker**. |
| **Faction defenses** | **Two**: *Mur de mycélium* (regrowing rampart) and *Nuage de spores* (armed, weakens the attacker). The 5 common defenses of [`029`](../029-city-defenses/spec.md) stay available. |
| **Spawn** | Anywhere, same rule as today for every faction. |
| **Elite unit** | Out of scope (dedicated elite-units slice). |

## Faction identity

| Field | Value |
| --- | --- |
| Enum member | `THE_SYMBIOSIS` |
| Wire `FactionCode` | `the_symbiosis` |
| FR name | **La Symbiose** |
| Playable | **Yes**: add to `playableFactionCodes()`; remove nothing from the non-playable set (Singularity and Ash Liturgy stay system-only). |
| Signup copy (FR, draft) | « Fusionnés au mycélium qui ronge les ruines, les colons de la Symbiose ne meurent jamais tout à fait : ils repoussent. Armées nombreuses, champignons abondants, plastique rare. » |

## Roster

Nine faction-exclusive `TroopCode`s, the same pattern as the other factions ([`009`](../009-troops-stationary/spec.md), `troop_faction`). Names and lore are proposals that can be renamed before implementation.

### Civilian roster (same stats as the Confederation counterpart)

| Role | Enum | Wire | FR name | Mirrors | Note |
| --- | --- | --- | --- | --- | --- |
| scout | `DRIFTING_SPORE` | `drifting_spore` | **Spore errante** | `explorer` | Spore carried by the wind. |
| founder | `SEED_BEARER` | `seed_bearer` | **Porte-germe** | `settler` | Carries a mycelium seed to plant a new colony. |
| carrier | `MYCELIAL_PORTER` | `mycelial_porter` | **Portefaix mycélien** | `light_transporter` | Fungal beast of burden. |
| cultivator | `SYMBIONT_GROWER` | `symbiont_grower` | **Cultivateur symbiote** | `farmer` | Same earnings (0.2/s). |
| salvager | `DECOMPOSER` | `decomposer` | **Décomposeur** | `recycler` | Digests plastic waste; same earnings (0.24/s). |

Costs, durations and requirements are copied from the mirrored Confederation code.

### Combat roster (mass profile)

Initial values: stats ≈ 0.8 ×, costs ≈ 0.75 ×, durations ≈ 0.75 × the Confederation unit of the same `combat_troop_class`. Speed unchanged. Requirements are copied from that Confederation unit.

| Class | Enum | Wire | FR name | Lore | speed | attack | defense | life | Plastic | Mushroom | Duration (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `legionnaire` | `ROOT_WARDEN` | `root_warden` | **Garde-racine** | Infantry rooted in the ground, holds lines. | 1.00 | 9 | 10 | 12 | 940 | 940 | 75 |
| `interceptor` | `SPORE_SWARM` | `spore_swarm` | **Essaim de spores** | Fast cloud of hunter spores. | 1.35 | 14 | 3 | 4 | 1310 | 750 | 105 |
| `war_machine` | `FUNGAL_COLOSSUS` | `fungal_colossus` | **Colosse fongique** | Mass of mycelium that crushes walls. | 0.85 | 10 | 12 | 13 | 1050 | 825 | 83 |
| `disruptor` | `TOXIC_HOWLER` | `toxic_howler` | **Hurleur toxique** | Spits paralysing toxins. | 1.20 | 11 | 5 | 5 | 1200 | 675 | 100 |

Stat uniqueness ([`024`](../024-player-combat-pvp/spec.md)) holds: no combat code mirrors another numerically. Balance with the admin simulator before release.

## Passive bonus

| Resource | Multiplier | Sources |
| --- | --- | --- |
| mushroom | × 1.10 | `mushroom_farm` and cultivator troop earnings, cities and outposts |
| plastic | × 0.90 | `recycling_plant` and salvager troop earnings, cities and outposts |

- New constant `faction_production_modifier: Partial<Record<FactionCode, Partial<Resource>>>` in `core/faction/constant/`.
- It stacks multiplicatively with the 027 technology bonuses: `rate × faction × (1 + tech)`.
- The production breakdowns show the faction modifier next to the cell and technology bonuses.

## Faction defenses

[`029`](../029-city-defenses/spec.md) gains an optional `defense_faction: Partial<Record<DefenseCode, FactionCode>>`. A defense listed there can only be built by that faction (`defense:not-in-faction-roster`); defenses without an entry are common.

| Enum | Wire | FR name | Points | Attack | Life | Armed | Special |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `MYCELIUM_WALL` | `mycelium_wall` | **Mur de mycélium** | 1 | 0 | 50 | no | Takes losses first, like the rampart. **Regrowth**: if the defender wins or draws, `floor(30 % × destroyed)` units come back after the battle. |
| `SPORE_CLOUD` | `spore_cloud` | **Nuage de spores** | 2 | 12 | 10 | **yes** | Each surviving unit reduces the attacker's attack pool by **1 %**, capped at **15 %**. |

| Code | Requirements | Cost per unit (plastic / mushroom) | Duration (s) |
| --- | --- | --- | --- |
| `mycelium_wall` | `city_wall` 1 | 400 / 700 | 60 |
| `spore_cloud` | `city_wall` 2, `fortification` 1 | 500 / 700 | 60 |

**Combined reduction cap**: the shield generator (up to 30 %) and the spore cloud (up to 15 %) add up, capped at **40 %** in total. Barbed wire ([`037`](../037-faction-bastion-order/spec.md), up to 10 % in round 1 and 5 % in round 2) joins the same cap, granted after shields and spores.

Casualty order: `mycelium_wall` sits with `rampart` (first); `spore_cloud` sits with `turret`. Under `siege_assault`, with ramparts.

Regrowth is applied in the outcome step and shown in the defender's battle report ("Mur de mycélium : +N repoussés").

## System players

| Area | Change |
| --- | --- |
| Targeting | The Ash Liturgy profile "human (Confederation) targets first" ([`025`](../025-lawless-human-faction/spec.md)) becomes "**human** targets first", whatever their faction. Alpha targets humans of any faction. |
| Symbiose AI | None: no system player for this faction in this slice. |
| Combat policy | Simulations handle the new codes and defenses through the shared tables (no special case). |

## Web UI

| Surface | Change |
| --- | --- |
| Signup | La Symbiose selectable, with a card per faction (name, short lore, playstyle: « Armées nombreuses, +10 % champignons, −10 % plastique »). |
| Translations | Faction name; 9 troop names and descriptions; 2 defense names and descriptions. |
| Artwork | 9 troop images and 2 defense images, original and organic in style. Placeholders acceptable for the first merge if tracked in tasks. |
| Production breakdown | Faction modifier line. |
| Battle report | Mycelium regrowth line. |

## Persistence

- No schema change for the faction itself (`faction_code` is text).
- If the 029 migration created `defense` rows per city for every code, backfill rows at count 0 for the two new defense codes; otherwise create them lazily.

## Testing

| Area | Cases |
| --- | --- |
| Signup | `the_symbiosis` accepted; bootstrap gives the Symbiose roster; Singularity and Ash Liturgy still rejected. |
| Roster | Symbiose players can only recruit their 9 codes; Confederation players cannot recruit them (`troop:not-in-faction-roster`). |
| Production | +10 % mushroom and −10 % plastic on buildings and troops; stacking with technologies. |
| Defenses | Faction gating; mycelium regrowth on defender win or draw only; spore cloud reduction and the 40 % combined cap; spore cloud counts for victory. |
| PvP | Confederation vs Symbiose attacks allowed; same-faction attacks rejected. |
| AI | Ash Liturgy and Alpha target Symbiose humans. |

## Out of scope

- Elite plasma unit (dedicated slice).
- Faction-exclusive buildings or technologies.
- Symbiose system player.
- Faction spawn zones (wait for the map rework).
- Confederation faction defenses (two to design later, see brainstorm).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`004`](../004-faction-domain/spec.md) | New playable faction. |
| [`009`](../009-troops-stationary/spec.md) / [`024`](../024-player-combat-pvp/spec.md) | Symbiose roster and combat codes. |
| [`029`](../029-city-defenses/spec.md) | `defense_faction`, faction defenses, combined reduction cap. |
| [`025`](../025-lawless-human-faction/spec.md) / [`016`](../016-system-controlled-players/spec.md) | Human targeting regardless of faction. |
| [`027`](../027-military-economy-technologies/spec.md) | Faction modifier stacking in production. |

## Implementation notes

- **Playable**: `THE_SYMBIOSIS` is added to `FactionCode`; `playableFactionCodes()` derives it automatically (known codes minus `non_playable_faction_codes`, which is unchanged). Bootstrap and settle give one zero-count stack per Symbiose code (`TroopService.codesForFaction`).
- **Roster**: civilian codes copy the mirrored Confederation stats, costs, durations and requirements; combat codes use the table values with the requirements of the Confederation unit of the same class (`legionnaire` ← `legionnaire`, `interceptor` ← `interceptor`, `war_machine` ← `assault_behemoth`, `disruptor` ← `shock_trooper`). `symbiont_grower` / `decomposer` earn 0.2 / 0.24 per second (`troop_earnings`). Rankings ([`034`](../034-rankings/spec.md)) value them through `PricingService` like every other code.
- **Stat uniqueness**: the Symbiose keeps the Confederation speeds (spec: "speed unchanged"), so speeds repeat across factions. The enforced rule (new test in `core/troop/constant/faction.spec.ts`) is that no two combat codes share the full `speed / attack / defense / life` tuple.
- **Production modifier**: `faction_production_modifier` (`core/faction/constant/production-modifier.ts`) is read through `FactionService.getProductionMultipliers` (neutral 1 for unset resources; water is never set). `BuildingService` and `TroopService.getEarningsBySecond` take a `faction_multiplier` next to `technology_multiplier` (`round(rate × scale × faction × tech)`). `AppService.getProductionFactionMultipliers` loads the player's faction; city and outpost breakdowns and building details (`GET /building`) apply it, and the breakdowns expose `faction_production_multiplier` (API: `{ plastic, mushroom }` on `GET /city/:id` and `GET /outpost/:id`). The "Base" column stays the neutral pre-cell rate.
- **Defense gating**: `defense_faction` (`core/defense/constant/faction.ts`) with `DefenseService.isAvailableTo` / `codesForFaction` / `assertInRoster`. `buildDefense` checks the roster at request time, like `recruitTroop` (queued rows are not re-checked: a captured city loses its queue anyway). The defense list hides other factions' defenses but keeps complete `costs` / `requirements` records (the system AI reads them by code). `DefenseService.init` still creates a row per code for every city, and migration `00019` backfills the two new codes at count 0, so Confederation cities also hold count-0 Symbiose rows.
- **Combat**: casualty tiers map defenses to tier groups — `mycelium_wall` with `rampart`, `spore_cloud` with `turret` — in both the normal and the `siege_assault` orders. The spore cloud is armed (counts for victory) and its attack and life go through the shared defense pools (Fortification applies). Reductions use the defenses alive at the start of the round: shield `min(0.30, 0.02 × n)`, spore `min(0.15, 0.01 × n)`, and the spore share is clamped to `0.40 − shield`. The round summary keeps `shield_reduction` unchanged and adds `spore_reduction` (new `battle_round.spore_reduction` column in `00019`); `attacker_attack_pool` is the reduced pool.
- **Regrowth**: `DefenseService.getRegrowth` returns `floor(0.3 × destroyed)` for mycelium walls when the winner is `defender` or `draw` (an epsilon guards float products such as `0.3 × 10`). `applyBattleOutcomes` removes `destroyed − regrown` units instead of `destroyed` and passes `regrown_defenses` to `createBattleReports`, which adds them to the **defender** metadata's `outcome.regrown_defenses` only (attacker and reinforcement reports are unchanged). The web defender report shows « Mur de mycélium : +N repoussés » under the outcome lines. Battle loss lines still count every destroyed wall, so the attacker's military ranking credit ([`034`](../034-rankings/spec.md)) includes walls that grew back.
- **System AI**: the Ash Liturgy knob `confederation_target_score_bonus` is renamed `human_target_score_bonus`; it applies when the defender's faction is playable (`FactionService.isPlayable`: Confederation and Symbiose today). Alpha keeps no bonus and attacks any other faction. No AI builds or recruits Symbiose codes; `planSystemDefenseBuild` only picks rampart / turret / minefield.
- **Web**: signup radio cards (name, lore, playstyle, accessible name = faction name). The Confederation card copy (« Héritiers de l'ordre d'avant l'effondrement… », « Armées polyvalentes, production équilibrée. ») is not in this spec and was written for parity. Symbiose accent color `#7dcea0` (chat). `ProductionTerrainReadout` gains a « Faction » column (between Terrain and Techno) shown only when the modifier is not neutral. Battle reports add a « Spores » column next to « Bouclier ». The admin simulator lists the Symbiose faction and its four combat codes; its round cards show the spore share. `defense:not-in-faction-roster` is translated.
- **Observability labels**: `core/system-player/observability/troop-label.ts` was missing the Ash Liturgy codes (pre-existing type error); it now names the Ash Liturgy and Symbiose codes.

## Follow-ups

- **Artwork**: no dedicated images yet. `apps/web/src/modules/troop/image.ts` maps each Symbiose code to the picture of its mirrored code (`symbiont_grower` → `spore_acolyte`), and `apps/web/src/modules/defense/image.ts` maps `mycelium_wall` → `/buildings/mushroom_farm.png` and `spore_cloud` → `/troops/spore_acolyte.png`. Replace them with original organic art (`/troops/<code>.png`, `/defenses/<code>.png`) and drop the placeholder map.
- **Balance**: roster values, the regrowth ratio, the spore cloud reduction and the 40 % cap need tuning with the admin simulator.
- **Ranking credit for regrown walls**: decide whether walls that grow back should still count toward the attacker's military value.

## Evidence index

| Area | Paths |
| --- | --- |
| Faction | `apps/server/src/core/faction/constant/code.ts`, `constant/production-modifier.ts`, `service.ts` (+ `service.spec.ts`), `apps/server/src/app/command/auth/signup.spec.ts`, `apps/web/src/modules/faction/translations.ts`, `color.ts` (+ `symbiosis.test.ts`) |
| Roster | `apps/server/src/core/troop/constant/{code,faction,role,characteristic,earnings,order}.ts` (+ `faction.spec.ts`, roster and stat uniqueness), `apps/server/src/core/pricing/constant/troop.ts`, `apps/server/src/core/requirement/constant/troop.ts`, `apps/server/src/app/command/troop/recruit.spec.ts`, `apps/server/src/core/system-player/observability/troop-label.ts` |
| Production | `apps/server/src/core/building/service.ts`, `apps/server/src/core/troop/service.ts` (`faction_multiplier`), `apps/server/src/app/service.ts` (`getProductionFactionMultipliers`, breakdowns, + `service.spec.ts`), `apps/server/src/app/query/building/get.ts` (+ `.spec.ts`), `apps/server/src/app/query/city/get.ts`, `outpost/get.ts`, `apps/server/src/web/handler/city/get.ts`, `outpost/get.ts` (+ `.spec.ts`), `packages/api-client/src/endpoints/city/get.ts`, `outpost/get.ts` |
| Defenses | `apps/server/src/core/defense/constant/{code,characteristic,order,faction}.ts`, `apps/server/src/core/defense/service.ts` (+ `service.spec.ts`), `error.ts`, `apps/server/src/core/pricing/constant/defense.ts`, `apps/server/src/core/requirement/constant/defense.ts`, `apps/server/src/app/command/defense/build.ts` (+ `.spec.ts`), `apps/server/src/app/query/defense/list.ts` (+ `.spec.ts`) |
| Combat and reports | `apps/server/src/core/combat/combat-service.ts` (+ `defense-combat.spec.ts`), `troop-combat.ts`, `type/battle-stack.ts` (`spore_reduction`), `type/report-battle-metadata.ts` (`regrown_defenses`), `apps/server/src/app/command/combat/apply-battle-outcomes.ts` (+ `.spec.ts`), `apps/server/src/app/command/communication/report/create-battle.ts` (+ `create-battle-defenses.spec.ts`), `apps/server/src/adapter/database/repository/battle.ts`, `apps/server/src/web/handler/admin/combat-simulator/post.ts`, `packages/api-client/src/types/report-battle.ts`, `packages/api-client/src/endpoints/admin/combat-simulator.ts` |
| PvP and system AI | `apps/server/src/app/command/troop/movement/attack-target.spec.ts`, `apps/server/src/app/command/player/system/combat-policy.ts` (+ `.spec.ts`), `actions.ts`, `apps/server/src/core/player/system/ai-profile.ts` (`human_target_score_bonus`) |
| Migration | `apps/server/src/adapter/database/migrations/00019_symbiosis.ts`, `apps/server/src/adapter/database/types.ts`. Verified locally: 3 cities → 3 `mycelium_wall` and 3 `spore_cloud` rows at count 0 (7 defense codes × 3 cities); `battle_round.spore_reduction` double precision default 0 |
| Web | `apps/web/src/modules/auth/signup-form.tsx` (+ `.test.tsx`), `apps/web/src/modules/troop/translations.ts`, `image.ts`, `apps/web/src/modules/defense/translations.ts`, `image.ts`, `apps/web/src/ui/production-terrain-readout.tsx` (+ test), `apps/web/src/modules/city/page.tsx`, `apps/web/src/modules/outpost/page.tsx`, `apps/web/src/modules/communication/report/details.tsx`, `translations.ts` (`regrowthLines`), `apps/web/src/modules/admin/combat-simulator/hooks.ts`, `page.tsx`, `apps/web/src/helpers/error-translations.ts` |
