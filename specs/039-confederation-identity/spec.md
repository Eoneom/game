# Slice 039 — Confederation identity: defenses and logistics bonus

**Status**: Implemented on `main` (slice 039): Confederation logistics bonus (carriers × 1.10 in transport checks, loot and exchange carrier sizing; movements without combat units × 1.05 speed, snapshotted at creation), faction-gated defenses `railgun` (doubled against sieges) and `holo_decoy` (absorb up to 30 % of the loss budget in rounds 1–2), report lines, signup copy, migration `00021_confederation_identity`. Artwork uses placeholders (see [Follow-ups](#follow-ups)).

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

## Implementation notes

- **Logistics constant**: `faction_logistics_modifier` (`core/faction/constant/logistics-modifier.ts`, type `FactionLogisticsModifier`) is read through `FactionService.getLogisticsModifier` (neutral `{ 1, 1 }`) and, where only a `player_id` is at hand, `AppService.getLogisticsModifier` (loads the player's faction).
- **Carrier capacity**: `TroopService.getTransportCapacity(code, carrier_capacity_multiplier = 1)` applies the multiplier to `TroopRole.CARRIER` units only (`light_transporter`, `hauler`, `bone_cart`, `mycelial_porter`, `supply_truck`), rounded per unit (`Math.round`, 10 000 → 11 000). Settlers, explorers and other units that carry a little keep their base capacity. `getTotalTransportCapacity` and `assertTransportResources` take the same optional `carrier_capacity_multiplier`.
- **Non-combat speed**: `getSlowestSpeed` / `getMovementDuration` / `createMovement` take `non_combat_speed_multiplier` (default 1), applied to the slowest speed only when none of the movement's troop codes is `combat`-role. Propulsion tactique only boosts `combat`-role units in `getEffectiveSpeed`, so a movement gets either Propulsion (with combat units) or the logistics bonus (without), never both. Like Propulsion it is read when the movement is created; movements under way are not recomputed.
- **Call-site audit** (every place that computes a movement duration or a carrier capacity):

  | Call site | Decision |
  | --- | --- |
  | `app/command/troop/movement/create.ts` (`createTroopMovement`: explore, transport, base, spy, attack, reinforce) | Capacity check and creation use the owner's modifier; attack and reinforce always hold combat units, so only their carriers' capacity can change (attacks carry no cargo). System AI movements go through here too and get their (neutral) faction modifier. |
  | `app/command/troop/movement/shared.ts` (`createReturnBaseTrip`: returns after explore, transport, spy, rebase, a bounced reinforcement, exchange delivery / return) | Speed bonus applied (no effect when the troops include combat units). |
  | `app/command/troop/movement/finish/exchange.ts` (redirected convoy leg) | Speed bonus applied. |
  | `app/command/exchange/place.ts` (placement reservation, convoy sizing on fills, reservation top-up, `sendConvoy`) | Capacity and speed from the order owner's faction (`order.faction_code`, no extra query; placement uses the placing player). |
  | `app/query/exchange/estimate.ts` | Reserved carriers and typical delivery duration use the player's modifier. |
  | `app/query/troop/movement/estimate.ts` (`POST /troop/movement/estimate`) | Duration, speed and transport capacity show the boosted values; the web movement form reads them from there. |
  | `app/command/combat/apply-battle-outcomes.ts` (loot haul) | Attacker's carriers use the attacker's modifier. |
  | `core/exchange/service.ts` (`allocateCarriers`, `convoyCarriers`, `topUpReservations`) | Optional `carrier_capacity_multiplier` (default 1). `isCarrier` and the `carrierStacks` ordering are unchanged: one owner's multiplier is the same for every carrier. |
  | `app/command/troop/reinforcement/return-home.ts` | Not wired: reinforcements are `combat`-role only (`assertReinforcementArmy`), so the bonus can never apply. |
  | `app/command/player/system/transport.ts` (`carrierTroopsForTransportLoad`), `actions.ts` (system transport clamp) | Left neutral: system players (Alpha, the Ash Liturgy) have no logistics modifier. If one ever did, the AI would only under-load; `createTroopMovement` still validates with the real multiplier. |
  | Battle retreats | Instantaneous ([`024`](../024-player-combat-pvp/spec.md)), no duration. |

- **Railgun**: armed, 3 points, attack 30, life 25, casualty tier `turret` in both orders (so it falls before combat troops under `siege_assault`, after them otherwise). `computePools` now also returns the side's `combat_attack_pool` (`combat`-role troops with strategy and Arsenal multipliers); `advanceRound` computes the attacker's pools first and doubles the railguns (`RAILGUN_SIEGE_ATTACK_MULTIPLIER`) when the attacker uses `siege_assault` or `war_machine` attack / combat attack pool ≥ `RAILGUN_WAR_MACHINE_SHARE` (0.5). Carriers' attack is not in that share. Shield-type reductions are applied afterwards to the attacker's total pool, so the share is evaluated before them. Fortification multiplies the (doubled) attack and the life; the siege life multiplier (75 %) applies as to every defense. The defense list shows the flat attack 30 (the doubling depends on the attacker, so there is no `attack_by_round` table).
- **Holo decoys**: 1 point, no attack and no life (not in the life pool, never a casualty candidate, never armed). In rounds 1 to `HOLO_DECOY_LAST_ROUND` (2), `applyLosses` first takes `min(decoys, floor(HOLO_DECOY_LOSS_SHARE × loss budget))` (0.3, with an epsilon against float products) from the decoys, then spends the rest of the budget in the normal order (barbed wire, ramparts, …). A loss budget below 4 gives the decoys nothing. After round 2 — or when the battle ends earlier, so decoys never survive a battle — the remaining decoys are consumed and added to that round's `defender_losses` like minefields; absorbed and vanished decoys are both removed from the city after the battle and both count in the attacker's military credit ([`034`](../034-rankings/spec.md)), as minefields do.
- **Round summaries**: following 036 / 037, `BattleRoundSummary` gains `decoy_absorbed` (losses absorbed this round; vanished decoys excluded) and `railgun_doubled` (only true when railguns were alive), stored in new `battle_round` columns `decoy_absorbed` (integer, default 0) and `railgun_doubled` (boolean, default false) by migration `00021`; battle reports and the admin simulator expose them (`ReportBattleMetadata.round_summaries`, `AdminCombatSimulatorRoundSummaryWire`).
- **Gating and requirements**: both codes are in `defense_faction` for `the_confederation`. `railgun` needs `city_wall` 3 and `central_inductor` 1 (buildings) and `fortification` 2, costs 1400 / 800 / 100 plasma, 120 s; `holo_decoy` needs `city_wall` 1, costs 150 / 150, 15 s. Rankings ([`034`](../034-rankings/spec.md)) value them through `PricingService` like every code (plasma included). `DefenseService.init` still creates a row per code for every city; migration `00021` backfills the two codes at count 0 for every existing city (Symbiose and Bastion cities included, as in 036 / 037).
- **System AI**: no AI builds the Confederation defenses (`planSystemDefenseBuild` unchanged); attack simulations go through the shared combat engine, so railgun doubling and decoys are simulated with no special case.
- **Web**: the Confederation signup card playstyle is the spec copy « Logistique supérieure : +10 % de transport, +5 % de vitesse hors combat »; the lore sentence written for parity in 036 is kept (the spec gives none). Defense names, descriptions and effects in `DefenseTranslations`; the Défense tab lists the two defenses for Confederation players only (server-side faction filter). Battle reports add « Leurres : N pertes absorbées » (sum over rounds) and « Canon électromagnétique : tir doublé (siège) » under the outcome lines, for every perspective (`confederationDefenseLines`). The movement estimate shows the server's boosted speed and capacity; speeds are now formatted with at most three decimals (`formatSpeed`), since multipliers produce values such as 0.7875000000000001. The admin simulator round cards show « Leurres N pertes absorbées · Canon électromagnétique ×2 ».

## Follow-ups

- **Artwork**: no dedicated images yet. `apps/web/src/modules/defense/image.ts` maps `railgun` → `/troops/striker_drone.png` and `holo_decoy` → `/troops/seeker.png`. Replace them with clean organo-synthetic art (`/defenses/<code>.png`) and drop the placeholder entries.
- **Balance**: the 1.10 / 1.05 logistics values, the railgun stats and doubling threshold, and the decoy share need tuning with the admin simulator (which has no faction logistics input; loot capacity is not simulated there).
- **Transport form**: the boosted values are shown without saying where they come from; a « Logistique +10 % » hint would need the estimate to return the modifier.

## Evidence index

| Area | Paths |
| --- | --- |
| Bonus | `apps/server/src/core/faction/constant/logistics-modifier.ts`, `apps/server/src/core/faction/service.ts` (+ `service.spec.ts`), `apps/server/src/app/service.ts` (`getLogisticsModifier`), `apps/server/src/core/troop/service.ts` (capacity, speed, duration; + `service.spec.ts`), `apps/server/src/app/command/troop/movement/create.ts` (+ `create.spec.ts`), `shared.ts`, `finish/exchange.ts`, `apps/server/src/app/command/troop/movement/rebase.spec.ts`, `apps/server/src/app/query/troop/movement/estimate.ts` (+ `.spec.ts`), `apps/server/src/app/command/combat/apply-battle-outcomes.ts` (+ `.spec.ts`, `-military.spec.ts`), `apps/server/src/core/exchange/service.ts` (+ `service.spec.ts`), `apps/server/src/app/command/exchange/place.ts` (+ `place.spec.ts`), `apps/server/src/app/query/exchange/estimate.ts` (+ `query.spec.ts`) |
| Defenses | `apps/server/src/core/defense/constant/{code,characteristic,order,faction}.ts`, `apps/server/src/core/defense/service.spec.ts`, `apps/server/src/core/pricing/constant/defense.ts`, `apps/server/src/core/requirement/constant/defense.ts`, `apps/server/src/app/command/defense/build.spec.ts`, `apps/server/src/app/query/defense/list.spec.ts` |
| Combat and reports | `apps/server/src/core/combat/combat-service.ts` (+ `confederation-combat.spec.ts`), `type/battle-stack.ts` (`decoy_absorbed`, `railgun_doubled`), `apps/server/src/adapter/database/repository/battle.ts`, `apps/server/src/app/command/communication/report/create-battle-defenses.spec.ts`, `apps/server/src/web/handler/admin/combat-simulator/post.ts`, `apps/server/src/app/command/player/system/combat-policy-defenses.spec.ts`, `packages/api-client/src/types/report-battle.ts`, `packages/api-client/src/endpoints/admin/combat-simulator.ts` |
| Migration | `apps/server/src/adapter/database/migrations/00021_confederation_identity.ts`, `apps/server/src/adapter/database/types.ts`. Verified locally: 3 cities → 3 `railgun` and 3 `holo_decoy` rows at count 0 (11 defense codes × 3 cities = 33 rows); `battle_round.decoy_absorbed` integer not null default 0, `battle_round.railgun_doubled` boolean not null default false |
| Web | `apps/web/src/modules/faction/translations.ts` (+ `confederation.test.ts`), `apps/web/src/modules/defense/translations.ts`, `image.ts`, `apps/web/src/modules/communication/report/translations.ts` (`confederationDefenseLines`), `details.tsx`, `apps/web/src/helpers/transform.ts` (`formatSpeed`), `apps/web/src/modules/movement/create/estimation/index.tsx`, `apps/web/src/modules/admin/combat-simulator/page.tsx` |
