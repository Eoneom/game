# Slice 036 — Playable faction: La Symbiose

**Status**: Planned.

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

**Combined reduction cap**: the shield generator (up to 30 %) and the spore cloud (up to 15 %) add up, capped at **40 %** in total.

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

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Faction | `core/faction/constant/code.ts`, `playable.ts`, `production-modifier.ts`; `packages/api-client` faction codes; `apps/web/src/modules/faction/translations.ts` |
| Roster | `core/troop/constant/{code,faction,role,characteristic,earnings,order}.ts`, `core/pricing/constant/troop.ts`, `core/requirement/constant/troop.ts` |
| Defenses | `core/defense/constant/*`, `core/combat/combat-service.ts`, `app/command/combat/apply-battle-outcomes.ts` |
| Web | `modules/auth/signup-form.tsx`, troop and defense translations and images |
