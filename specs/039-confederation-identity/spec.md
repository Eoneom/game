# Slice 039 — Confederation identity: defenses and logistics bonus

**Status**: Planned.

## Summary

Bring **La Confédération** to parity with the two new playable factions, La Symbiose ([`036`](../036-faction-symbiosis/spec.md)) and L'Ordre du Bastion ([`037`](../037-faction-bastion-order/spec.md)). It gets:

- a **passive logistics bonus**: carriers transport more, and non-combat movements are faster;
- **two faction-exclusive defenses**: the *Canon électromagnétique* (anti-siege, armed) and the *Leurres holographiques* (cheap decoys that absorb early losses).

Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Depends on**: [`004`](../004-faction-domain/spec.md), [`010`](../010-troop-movement-combat/spec.md) (movement duration, transport), [`024`](../024-player-combat-pvp/spec.md) (loot, casualties), [`027`](../027-military-economy-technologies/spec.md) (speed stacking), [`029`](../029-city-defenses/spec.md) (defenses, `siege_assault`), [`035`](../035-faction-exchange/spec.md) (exchange convoys), [`036`](../036-faction-symbiosis/spec.md) / [`037`](../037-faction-bastion-order/spec.md) (faction defense gating, per-round attack tables).

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| **Passive bonus** | **Logistics**: +10 % transport capacity for the faction's carriers, +5 % speed for movements without combat troops. |
| **Faction defenses** | **Canon électromagnétique** and **Leurres holographiques**. The 5 common defenses stay available. |

## Passive bonus: logistics

Constant `faction_logistics_modifier: Partial<Record<FactionCode, { transport_capacity: number; non_combat_speed: number }>>` in `core/faction/constant/`, with `the_confederation: { transport_capacity: 1.10, non_combat_speed: 1.05 }`.

| Effect | Rule |
| --- | --- |
| Transport capacity | `transport_capacity × 1.10` for every `carrier`-role unit owned by a Confederation player. Applies to transport payload checks, loot haul ([`024`](../024-player-combat-pvp/spec.md)) and exchange carrier reservations ([`035`](../035-faction-exchange/spec.md)). Other roles unchanged. |
| Non-combat speed | Movements of a Confederation player that contain **no `combat`-role unit** get speed × **1.05**: explore, transport, base, spy, exchange convoys, and returns. Movements with combat units use the normal rule (and Propulsion tactique, [`027`](../027-military-economy-technologies/spec.md)). |
| Snapshot | Applied when the movement is created, like Propulsion; a movement under way is not recomputed. |

The movement estimate and the transport form show the boosted values.

## Faction defenses

Registered in `defense_faction` ([`036`](../036-faction-symbiosis/spec.md)) for `the_confederation`.

| Enum | Wire | FR name | Points | Attack | Life | Armed | Special |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `RAILGUN` | `railgun` | **Canon électromagnétique** | 3 | 30 | 25 | **yes** | **Anti-siege**: its attack is **doubled** in a round when the attacker uses `siege_assault`, or when `war_machine` units make up at least **50 %** of the attacker's combat attack pool that round. |
| `HOLO_DECOY` | `holo_decoy` | **Leurres holographiques** | 1 | 0 | — | no | **Decoys**: in rounds 1 and 2, up to **30 %** of the defender's loss budget (rounded down) is taken from decoys first, one decoy per unit loss. Not in the life pool. All remaining decoys disappear after round 2. |

| Code | Requirements | Cost per unit (plastic / mushroom / plasma) | Duration (s) |
| --- | --- | --- | --- |
| `railgun` | `city_wall` 3, `fortification` 2, `central_inductor` 1 | 1400 / 800 / 100 | 120 |
| `holo_decoy` | `city_wall` 1 | 150 / 150 / — | 15 |

### Combat details

- **Railgun** sits with `turret` and `plasma_battery` in the casualty order. Under `siege_assault` it falls with the other armed defenses in the siege order of [`029`](../029-city-defenses/spec.md). It counts for victory (armed). The doubling is evaluated per round, from the attacker's pools of that round, before shield-type reductions.
- **Decoys** take losses **before every other defender stack**, including barbed wire and ramparts, but only within the 30 % share of rounds 1–2. The rest of the loss budget follows the normal order. They do not count for victory.
- Decoys lost or vanished are both consumed: the player rebuilds them, like minefields.
- Fortification modifiers apply to the railgun's attack and life. Decoys have no stats to scale.
- The battle report shows "Leurres : N pertes absorbées" and "Canon électromagnétique : tir doublé (siège)" when it happens.

## System players

No change: Alpha and the Ash Liturgy are not Confederation. The combat policy simulates the two defenses through the shared tables.

## Web UI

| Surface | Change |
| --- | --- |
| Signup | Confederation card: « Logistique supérieure : +10 % de transport, +5 % de vitesse hors combat ». |
| Translations / artwork | 2 defense names, descriptions and images (clean organo-synthetic style). Placeholders acceptable for the first merge if tracked in tasks. |
| Movement estimate / transport form | Boosted capacity and speed. |
| Battle report | Decoy absorption and railgun doubling lines. |

## Persistence

No schema change. Backfill `defense` rows for the two codes if the 029 migration creates rows per city and code.

## Testing

| Area | Cases |
| --- | --- |
| Logistics | Carrier capacity ×1.10 for Confederation only (transport, loot, exchange reservations); non-combat movements ×1.05; movements with a combat unit unchanged; no stacking with Propulsion on non-combat movements. |
| Railgun | Doubling under `siege_assault`; doubling at ≥ 50 % war_machine attack share; normal otherwise; counts for victory. |
| Decoys | Absorb at most 30 % of the loss budget in rounds 1–2; vanish after round 2; never count for victory; taken before ramparts. |
| Gating | Only Confederation players build the two defenses. |

## Out of scope

- Elite plasma unit (dedicated slice).
- Other faction bonuses rebalancing (playtests).

## Spec cross-links to update on implementation

| Spec | Update |
| --- | --- |
| [`004`](../004-faction-domain/spec.md) | Confederation passive bonus. |
| [`010`](../010-troop-movement-combat/spec.md) | Non-combat speed bonus, carrier capacity. |
| [`029`](../029-city-defenses/spec.md) | Railgun and decoys in casualty order. |
| [`036`](../036-faction-symbiosis/spec.md) / [`037`](../037-faction-bastion-order/spec.md) | Remove "Confederation faction defenses" from out of scope. |

## Evidence index (when implemented)

| Area | Expected paths |
| --- | --- |
| Bonus | `core/faction/constant/logistics-modifier.ts`, `core/troop/service.ts` (duration, capacity), transport / loot / exchange call sites |
| Defenses | `core/defense/constant/*`, `core/combat/combat-service.ts` |
| Web | `modules/auth/signup-form.tsx`, defense translations and images, `modules/movement/*`, report details |
