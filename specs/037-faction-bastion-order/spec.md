# Slice 037 — Playable faction: L'Ordre du Bastion

**Status**: Implemented on `main` (slice 037): playable faction `the_bastion_order` with nine roster codes (heavy combat profile), garrison life bonus (× 1.15 for the owner's own combat stacks in their own city), faction-gated defenses `field_artillery` (per-round attack table) and `barbed_wire` (early attack reduction inside the 40 % combined cap, dies first), third signup card, migration `00020_bastion_order`. Artwork uses placeholders (see [Follow-ups](#follow-ups)).

## Summary

Add a third **playable** faction, **L'Ordre du Bastion** (`the_bastion_order`): heirs of a pre-collapse army, entrenched and disciplined. It plays as a **heavy army** (stronger, costlier, slower units), the opposite of La Symbiose ([`036`](../036-faction-symbiosis/spec.md)). Its troops get a **garrison bonus** when defending their own city, and it has **two faction-exclusive defenses**: *Artillerie de position* and *Barbelés*. Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`004`](../004-faction-domain/spec.md), [`002`](../002-player-session-auth/spec.md), [`009`](../009-troops-stationary/spec.md), [`014`](../014-requirements-pricing/spec.md), [`024`](../024-player-combat-pvp/spec.md), [`027`](../027-military-economy-technologies/spec.md) (modifiers), [`029`](../029-city-defenses/spec.md) (defenses), [`033`](../033-alliances/spec.md) (reinforcements), [`036`](../036-faction-symbiosis/spec.md) (faction defense gating, combined reduction cap, AI targeting).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Identity** | Pre-collapse army heirs; discipline, fortifications, heavy equipment. |
| **Passive bonus** | **Garrison**: the player's own troops have **+15 % life** when defending **their own city**. |
| **Unit profile** | **Heavy**: combat units about **20 % stronger**, **25 % costlier** and slower to produce, **15 % slower** than their Confederation counterpart. |
| **Faction defenses** | **Artillerie de position** (armed, strong in rounds 1–2) and **Barbelés** (cheap, weakens the assault early). The 5 common defenses stay available. |
| **Spawn** | Anywhere, same rule as every faction. |
| **Elite unit** | Out of scope (dedicated elite-units slice). |

## Faction identity

| Field | Value |
| --- | --- |
| Enum member | `THE_BASTION_ORDER` |
| Wire `FactionCode` | `the_bastion_order` |
| FR name | **L'Ordre du Bastion** |
| Playable | **Yes**: add to `playableFactionCodes()`. |
| Signup copy (FR, draft) | « Derniers héritiers d'une armée d'avant l'effondrement, les soldats de l'Ordre ne cèdent jamais un mur. Troupes lourdes et lentes, garnisons inébranlables, artillerie redoutée. » |

## Roster

Nine faction-exclusive `TroopCode`s. Names are proposals that can be renamed before implementation.

### Civilian roster (same stats, costs, durations and requirements as the Confederation counterpart)

| Role | Enum | Wire | FR name | Mirrors |
| --- | --- | --- | --- | --- |
| scout | `SENTINEL` | `sentinel` | **Vigie** | `explorer` |
| founder | `FIELD_ENGINEER` | `field_engineer` | **Ingénieur de campagne** | `settler` |
| carrier | `SUPPLY_TRUCK` | `supply_truck` | **Camion de ravitaillement** | `light_transporter` |
| cultivator | `QUARTERMASTER` | `quartermaster` | **Intendant** | `farmer` (0.2/s) |
| salvager | `SCRAPPER` | `scrapper` | **Ferrailleur** | `recycler` (0.24/s) |

### Combat roster (heavy profile)

Initial values: stats ≈ 1.2 ×, costs and durations ≈ 1.25 ×, speed ≈ 0.85 × the Confederation unit of the same class. Requirements copied from that unit.

| Class | Enum | Wire | FR name | Lore | speed | attack | defense | life | Plastic | Mushroom | Duration (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `legionnaire` | `GRENADIER` | `grenadier` | **Grenadier** | Armoured line infantry. | 0.85 | 13 | 16 | 18 | 1560 | 1560 | 125 |
| `interceptor` | `DRAGOON` | `dragoon` | **Dragon mécanisé** | Armoured motorbike strike unit. | 1.15 | 22 | 5 | 6 | 2190 | 1250 | 175 |
| `war_machine` | `SIEGE_TANK` | `siege_tank` | **Char de siège** | Restored pre-collapse tank. | 0.72 | 14 | 18 | 19 | 1750 | 1375 | 138 |
| `disruptor` | `MOBILE_MORTAR` | `mobile_mortar` | **Mortier mobile** | Towed mortar team, devastating but fragile. | 1.02 | 17 | 7 | 7 | 2000 | 1125 | 166 |

Stat uniqueness ([`024`](../024-player-combat-pvp/spec.md)) holds. Balance with the admin simulator.

## Passive bonus: garrison

| Topic | Rule |
| --- | --- |
| Who | `combat`-role stacks **owned by the city's owner**, when the owner's faction is `the_bastion_order`. |
| When | Battle target is a **city** owned by that player. Not outposts, not field stacks, not as reinforcements in an ally's city ([`033`](../033-alliances/spec.md)). Allied reinforcements inside a Bastion city do not get it. |
| Effect | Life × **1.15**, both in the life pool and in the life-per-unit used for casualties. |
| Stacking | Multiplies with strategy multipliers and Blindage organique: `life × strategy × (1 + 0.03 × plating) × 1.15`. |
| Snapshot | Stored in the defender's per-owner modifiers at battle start ([`027`](../027-military-economy-technologies/spec.md)), e.g. `garrison: 1.15`. |

Constant `faction_garrison_life_modifier: Partial<Record<FactionCode, number>>` in `core/faction/constant/`.

## Faction defenses

Registered in `defense_faction` ([`036`](../036-faction-symbiosis/spec.md)) for `the_bastion_order`.

| Enum | Wire | FR name | Points | Attack | Life | Armed | Special |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FIELD_ARTILLERY` | `field_artillery` | **Artillerie de position** | 4 | per round: 60 / 50 / 25 / 20 / 20 | 35 | **yes** | Breaks assaults: most of its damage lands in rounds 1–2. |
| `BARBED_WIRE` | `barbed_wire` | **Barbelés** | 1 | 0 | 15 | no | Each surviving unit reduces the attacker's attack pool by **1 % in round 1** (cap **10 %**) and **0.5 % in round 2** (cap **5 %**); no effect afterwards. |

| Code | Requirements | Cost per unit (plastic / mushroom) | Duration (s) |
| --- | --- | --- | --- |
| `field_artillery` | `city_wall` 3, `fortification` 2 | 1600 / 1000 | 150 |
| `barbed_wire` | `city_wall` 1 | 200 / 100 | 20 |

- Barbed wire counts in the **combined attack-reduction cap of 40 %** with shields and spore clouds ([`036`](../036-faction-symbiosis/spec.md)).
- **Casualty order**: `barbed_wire` comes **first**, before ramparts (it is in front of the walls). `field_artillery` sits with `turret` and `plasma_battery`. Under `siege_assault`: barbed wire, ramparts, then the siege order of [`029`](../029-city-defenses/spec.md).
- Fortification modifiers apply to both, as to every defense.
- **Combat model change**: `defense_characteristics` must support a **per-round attack** table (array of 5 values) in addition to a flat attack. The minefield (round 1 only) can be expressed the same way.

## System players

No Bastion system player. Alpha and the Ash Liturgy already target humans of any faction ([`036`](../036-faction-symbiosis/spec.md)). The combat policy simulates the garrison bonus and the new defenses through the shared tables.

## Web UI

| Surface | Change |
| --- | --- |
| Signup | Third faction card: « Troupes lourdes, +15 % de vie en défense de ses villes ». |
| Translations | Faction name; 9 troop names and descriptions; 2 defense names and descriptions. |
| Artwork | 9 troop images and 2 defense images, military pre-collapse style. Placeholders acceptable for the first merge if tracked in tasks. |
| Battle report | Show the garrison bonus in the defender's modifiers ("Garnison +15 % vie"). |
| Defense tab | Artillery card shows its per-round attack profile. |

## Persistence

No schema change for the faction. Backfill `defense` rows for the two new codes if the 029 migration creates rows per city and code.

## Testing

| Area | Cases |
| --- | --- |
| Signup | `the_bastion_order` accepted; roster bootstrap; three playable factions listed. |
| Roster | Only Bastion players recruit the 9 codes. |
| Garrison | +15 % life only for the owner's troops in the owner's own city; not in outposts, field, or as reinforcements; not for allied reinforcements; stacking with plating and strategy. |
| Defenses | Faction gating; artillery per-round attack; barbed wire round 1 / round 2 reductions and caps; combined 40 % cap; barbed wire dies first; artillery counts for victory, barbed wire does not. |
| PvP | Bastion vs Confederation and Bastion vs Symbiose allowed. |

## Out of scope

- Elite plasma unit.
- Faction-exclusive buildings or technologies.
- Bastion system player; faction spawn zones.
- Confederation faction defenses (still to design).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`004`](../004-faction-domain/spec.md) | New playable faction. |
| [`009`](../009-troops-stationary/spec.md) / [`024`](../024-player-combat-pvp/spec.md) | Bastion roster, garrison bonus. |
| [`029`](../029-city-defenses/spec.md) | Per-round attack tables, barbed wire casualty order. |
| [`036`](../036-faction-symbiosis/spec.md) | Barbed wire in the combined reduction cap. |

## Implementation notes

- **Playable**: `THE_BASTION_ORDER` is added to `FactionCode`; `playableFactionCodes()` derives it (the non-playable set is unchanged), so signup accepts it and the web signup lists three cards. Bootstrap and settle give one zero-count stack per Bastion code (`TroopService.codesForFaction`).
- **Roster**: civilian codes copy the mirrored Confederation stats, costs, durations and requirements (`quartermaster` / `scrapper` earn 0.2 / 0.24 per second). Combat codes use the table values with the requirements of the Confederation unit of the same class (`grenadier` ← `legionnaire`, `dragoon` ← `interceptor`, `siege_tank` ← `assault_behemoth`, `mobile_mortar` ← `shock_trooper`, the same mapping as [`036`](../036-faction-symbiosis/spec.md)). Rankings ([`034`](../034-rankings/spec.md)) value the new troop and defense codes through `PricingService` like every other code. Stat uniqueness (`core/troop/constant/faction.spec.ts`, full `speed / attack / defense / life` tuple) still holds.
- **Garrison**: `faction_garrison_life_modifier` (`core/faction/constant/garrison-modifier.ts`) is read through `FactionService.getGarrisonLifeMultiplier` (neutral 1). `sagaFinishAttack` sets `defender_modifiers.garrison` only when the target is a **city** and the multiplier is not 1 (outposts and field stacks never get it; the key is omitted otherwise, so older battles and other factions are unchanged and a missing value reads as 1). `CombatModifiers` gains `garrison?`; `computePools` multiplies the life of `combat`-role stacks **without** `player_id` by it: `life × strategy × arsenal life (1 + 0.03 × plating) × garrison`. Reinforcement stacks carry a `player_id` ([`033`](../033-alliances/spec.md)) and never get it, even when their owner is missing from `defender_owner_modifiers` (fallback to the side modifiers); owner modifiers are snapshotted without it, and a Bastion player's troops reinforcing an ally's city are owner-keyed stacks, so they do not get it either. Attack pools, non-combat troops and defenses are unaffected.
- **Life per unit**: the engine has no per-unit damage ([`029`](../029-city-defenses/spec.md) notes): the life pool is the only life measure in the loss budget, so the garrison multiplier applies there, exactly like Blindage organique. The casualty sort key still uses the base `life_capacity` for ordering within a tier (unchanged for every life modifier).
- **Per-round attack**: `DefenseCharacteristic` gains optional `attack_by_round` (rounds 1–5, rounds past the table use its last value); `DefenseService.getAttackForRound` returns it or the flat `attack`, and `addDefensePools` uses it for every defense (Fortification and plasma battery firing unchanged). The minefield is re-expressed as `[40, 0, 0, 0, 0]` and keeps its flat `attack: 40`; it is still consumed after round 1, so behaviour is identical (all existing combat tests pass). The flat `attack` of the field artillery is its round-1 value (60), used where a single number is needed (defense list `attack`, military ranking attack shares).
- **Barbed wire reduction**: shares are granted in order shield → spore → barbed wire, each clamped to what is left under `ATTACK_REDUCTION_CAP` (0.40); barbed wire uses the defenses alive at the start of the round, `min(0.10, 0.01 × n)` in round 1, `min(0.05, 0.005 × n)` in round 2, 0 afterwards (`BARBED_WIRE_REDUCTION_PER_UNIT_BY_ROUND` / `_CAP_BY_ROUND`). Following 036, the share is stored separately: `BattleRoundSummary.barbed_wire_reduction` and a new `battle_round.barbed_wire_reduction` column (double precision, default 0, migration `00020`); `shield_reduction` and `spore_reduction` are unchanged and `attacker_attack_pool` is the reduced pool. The admin simulator returns it and its round cards show « Barbelés −N % »; battle reports add a « Barbelés » column.
- **Casualty order**: a new `barbed_wire` tier sits before `rampart` in both `NORMAL_TIER` and `SIEGE_TIER`; `field_artillery` maps to the `turret` group. The other tiers (and the carrier / civilian / scout tiers) shift by one so relative order is unchanged. Field artillery is armed (counts for victory); barbed wire is not.
- **Defense gating**: both codes are in `defense_faction` for `the_bastion_order`; `DefenseService.init` still creates a row per code for every city and migration `00020` backfills the two new codes at count 0 for every existing city (Confederation and Symbiose cities included, as in 036).
- **System AI**: no Bastion system player and no AI builds Bastion defenses. `pickSystemAttack` simulates the garrison through `simulatedDefenderModifiers` (neutral modifiers + `garrison` for a Bastion city target), and `defenderCombatStacksOnCell` now tags other owners' stacks with their `player_id` so the simulated garrison skips them; the new defenses go through the shared tables.
- **Web**: third signup card from `FactionTranslations` (lore = spec draft copy, playstyle = « Troupes lourdes, +15 % de vie en défense de ses villes »), Bastion accent color `#b0a27a`. The battle report line « Technologies — … » becomes « Modificateurs — … » (fallback « aucun ») since it now also shows « Garnison +15 % vie » in the defender modifiers (`formatCombatModifiers`). The Défense tab shows per-round profiles: list card « ATK 60-50-25-20-20 », details « Attaque par tour (1 → 5) : 60 / 50 / 25 / 20 / 20 » (`GET /city/:city_id/defense` adds `attack_by_round`); the minefield now shows « 40-0-0-0-0 » the same way. The admin simulator lists the Bastion faction and its four combat codes.

## Follow-ups

- **Artwork**: no dedicated images yet. `apps/web/src/modules/troop/image.ts` maps each Bastion code to the picture of a related code (`sentinel` → `explorer`, `field_engineer` → `settler`, `supply_truck` → `light_transporter`, `quartermaster` → `farmer`, `scrapper` → `recycler`, `grenadier` → `legionnaire`, `dragoon` → `interceptor`, `siege_tank` → `war_machine`, `mobile_mortar` → `shock_trooper`), and `apps/web/src/modules/defense/image.ts` maps `field_artillery` → `/troops/assault_behemoth.png` and `barbed_wire` → `/buildings/plastic_warehouse.png`. Replace them with military pre-collapse art (`/troops/<code>.png`, `/defenses/<code>.png`) and drop the placeholder entries.
- **Balance**: roster values, the 1.15 garrison, the artillery table and the barbed wire shares need tuning with the admin simulator. The simulator has no garrison toggle yet (it only takes technology levels); add one if balancing needs it.

## Evidence index

| Area | Paths |
| --- | --- |
| Faction | `apps/server/src/core/faction/constant/code.ts`, `constant/garrison-modifier.ts`, `service.ts` (+ `service.spec.ts`), `apps/server/src/app/command/auth/signup.spec.ts`, `apps/web/src/modules/faction/translations.ts`, `color.ts` (+ `bastion.test.ts`), `apps/web/src/modules/auth/signup-form.test.tsx` |
| Roster | `apps/server/src/core/troop/constant/{code,faction,role,characteristic,earnings,order}.ts` (+ `faction.spec.ts`, roster and stat uniqueness), `apps/server/src/core/pricing/constant/troop.ts`, `apps/server/src/core/requirement/constant/troop.ts`, `apps/server/src/app/command/troop/recruit.spec.ts`, `apps/server/src/core/system-player/observability/troop-label.ts` |
| Combat | `apps/server/src/core/combat/combat-service.ts` (+ `bastion-combat.spec.ts`), `type/battle-stack.ts` (`garrison`, `barbed_wire_reduction`), `apps/server/src/app/saga/finish/attack.ts` (+ `attack-garrison.spec.ts`), `apps/server/src/adapter/database/repository/battle.ts`, `apps/server/src/web/handler/admin/combat-simulator/post.ts`, `packages/api-client/src/types/report-battle.ts`, `packages/api-client/src/endpoints/admin/combat-simulator.ts` |
| Defenses | `apps/server/src/core/defense/constant/{code,characteristic,order,faction}.ts`, `apps/server/src/core/defense/service.ts` (`getAttackForRound`, + `service.spec.ts`), `apps/server/src/core/pricing/constant/defense.ts`, `apps/server/src/core/requirement/constant/defense.ts`, `apps/server/src/app/command/defense/build.spec.ts`, `apps/server/src/app/query/defense/list.spec.ts`, `apps/server/src/web/handler/defense/list.ts` (+ `.spec.ts`), `packages/api-client/src/endpoints/defense/list.ts` |
| PvP and system AI | `apps/server/src/app/command/troop/movement/attack-target.spec.ts`, `apps/server/src/app/command/player/system/combat-policy.ts` (+ `combat-policy-defenses.spec.ts`) |
| Migration | `apps/server/src/adapter/database/migrations/00020_bastion_order.ts`, `apps/server/src/adapter/database/types.ts`. Verified locally: 3 cities → 3 `field_artillery` and 3 `barbed_wire` rows at count 0 (9 defense codes × 3 cities); `battle_round.barbed_wire_reduction` double precision, not null, default 0 |
| Web | `apps/web/src/modules/troop/translations.ts`, `image.ts`, `apps/web/src/modules/defense/translations.ts` (`formatAttackByRound`), `image.ts`, `list/index.tsx`, `details/index.tsx`, `apps/web/src/modules/communication/report/details.tsx`, `translations.ts` (garrison), `apps/web/src/modules/admin/combat-simulator/hooks.ts`, `page.tsx` |
