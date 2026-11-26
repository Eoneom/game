# Slice 037 — Playable faction: L'Ordre du Bastion

**Status**: Planned.

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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Faction | `core/faction/constant/code.ts`, `playable.ts`, `garrison-modifier.ts`; `packages/api-client`; `apps/web/src/modules/faction/translations.ts` |
| Roster | `core/troop/constant/*`, `core/pricing/constant/troop.ts`, `core/requirement/constant/troop.ts` |
| Combat | `core/combat/combat-service.ts`, `app/saga/finish/attack.ts` (garrison snapshot) |
| Defenses | `core/defense/constant/*` |
| Web | `modules/auth/signup-form.tsx`, troop and defense translations and images |
