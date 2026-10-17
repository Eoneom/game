# Data model — 024 Player combat (PvP) (Phase 1)

**Date**: 2026-10-17  
**Spec**: [`spec.md`](./spec.md)

Entities, migrations, and enums for PvP. Wire names match api-client re-exports from `apps/server/src/core/**`.

## Enums (domain)

### `MovementAction` (extend)

| Member | Wire | Notes |
| --- | --- | --- |
| `ATTACK` | `attack` | `apps/server/src/core/troop/constant/movement-action.ts` |

### `TroopCode` (extend)

| Member | Wire | Faction |
| --- | --- | --- |
| `LEGIONNAIRE` | `legionnaire` | `the_confederation` |
| `INTERCEPTOR` | `interceptor` | `the_confederation` |
| `WAR_MACHINE` | `war_machine` | `the_technological_singularity` |
| `DISRUPTOR` | `disruptor` | `the_technological_singularity` |

### `CombatRole` (new)

Distinct from legacy `TroopRole` (founder/cultivator). Stored in characteristics map.

| Value | Movement `attack` | Battle pools |
| --- | --- | --- |
| `combat` | required ≥1 in army | full attack/life capacities |
| `carrier` | escort allowed | 0 attack; 50% defense as life |
| `civilian` | vulnerable escort | 0 attack; 25% defense as life |
| `scout` | **not** on attack movement | 25% attack / 50% defense if on cell |

### `CombatTroopClass` (new)

Values: `legionnaire` | `interceptor` | `war_machine` | `disruptor` — 1:1 with combat `TroopCode` wire string.

### `CombatStrategy` (new)

| Member | Wire |
| --- | --- |
| `BALANCED` | `balanced` |
| `OPENING_STRIKE` | `opening_strike` |
| `HOLD_THE_LINE` | `hold_the_line` |

Multiplier tables: `core/combat/constant/strategy.ts` (rounds 1–5 × four classes × attack/life %).

### `ReportType` (extend)

| Member | Wire |
| --- | --- |
| `BATTLE` | `battle` |

### Battle outcome enums (new)

- `BattleWinner`: `attacker` | `defender` | `draw`
- `BattleTargetKind`: `field` | `city` | `outpost`
- `ReportPerspective`: `attacker` | `defender`

## Extended troop characteristics (in code, not separate table)

`TroopCharacteristic` interface extension (`characteristic.ts`):

| Field | Type | When |
| --- | --- | --- |
| `attack_capacity` | number | all codes |
| `defense_capacity` | number | all codes |
| `life_capacity` | number | `combat_role = combat` |
| `combat_troop_class` | `CombatTroopClass` | combat only |
| `combat_role` | `CombatRole` | all codes |

Backfill existing ten codes per spec roster table in [`spec.md`](./spec.md#extended-troop_characteristics-schema).

## Persistence entities

### `BattleEntity` (new table `battle`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `movement_id` | uuid FK → `movement.id` | unique; 1:1 with attack movement |
| `attacker_player_id` | uuid FK → `player.id` | |
| `defender_player_id` | uuid FK → `player.id` | |
| `cell_id` | uuid FK → `cell.id` | battle cell |
| `target_kind` | text | `field` \| `city` \| `outpost` |
| `target_id` | uuid nullable | `city_id` or `outpost_id` when applicable |
| `attacker_strategy` | text | locked at start |
| `defender_strategy` | text | garrison default or `balanced` |
| `current_round` | int | 0 before round 1; 1–5 during |
| `status` | text | `in_progress` \| `finished` |
| `winner` | text nullable | set on finish |
| `state_json` | jsonb | snapshot stacks per side, cumulative casualties, `round_summaries[]` |
| `started_at` | timestamptz | movement arrival |
| `finished_at` | timestamptz nullable | |

Indexes: `movement_id` unique; `status` for admin queries optional.

**Alternative**: normalize rounds to `battle_round` rows — optional if `state_json.round_summaries` suffices for v1 reports.

### `movement` (alter)

| Column | Type | Notes |
| --- | --- | --- |
| `combat_strategy` | text nullable | required when `action = attack`; null for peaceful |

### `city` / `outpost` (alter)

| Column | Type | Notes |
| --- | --- | --- |
| `default_combat_strategy` | text nullable | defender default; null → `balanced` |

### `report_battle` (new)

FK `report_id` → `report.id` ON DELETE CASCADE. One row per report (attacker and defender each get a report + metadata row).

| Column | Type |
| --- | --- |
| `report_id` | uuid PK |
| `battle_id` | uuid FK → `battle.id` |
| `movement_id` | uuid |
| `perspective` | text |
| `attacker_player_id` | uuid |
| `defender_player_id` | uuid |
| `attacker_faction_code` | text |
| `defender_faction_code` | text |
| `target_kind` | text |
| `target_id` | uuid nullable |
| `winner` | text |
| `attacker_strategy` | text |
| `defender_strategy` | text |
| `rounds_played` | int |
| `outcome_json` | jsonb | `{ occupied, destroyed_temp_outpost, loot_applied, attacker_retreated }` |
| `casualties_attacker_json` | jsonb | `[{ code, count }]` |
| `casualties_defender_json` | jsonb | `[{ code, count }]` |
| `round_summaries_json` | jsonb | array per spec `ReportBattleMetadata.round_summaries` |

### `report` (unchanged columns)

Battle rows use existing columns:

- `troops` — **this player’s losses** (casualties)
- `resources` — loot gained (attacker report only)
- `origin` / `destination` — attack origin → battle cell
- `type` — `battle`

Troop lines for reports still stored via existing report repository pattern (`report_troop` or embedded — follow brownfield).

## Requirement & pricing rows (code constants)

Per [`spec.md`](./spec.md#recruitment-requirements--pricing):

- `TroopRequirement` entries for four combat codes (`cloning_factory` + `replication_catalyst` only).
- `troop_costs` plastic/mushroom/duration per code.

No new DB tables — seeded in TypeScript like existing troops.

## Job payloads (pg-boss)

| Queue | Data |
| --- | --- |
| `troop.movement.finish` | unchanged |
| `combat.round.advance` (proposed) | `{ battle_id: string, round: number }` |

## TypeScript metadata interface (api-client)

Mirror in `packages/api-client` (shared with server core or duplicated export):

```typescript
interface ReportBattleMetadata {
  battle_id: string
  movement_id: string
  perspective: 'attacker' | 'defender'
  attacker_player_id: string
  defender_player_id: string
  attacker_faction_code: string
  defender_faction_code: string
  target_kind: 'field' | 'city' | 'outpost'
  target_id?: string
  winner: 'attacker' | 'defender' | 'draw'
  attacker_strategy: CombatStrategy
  defender_strategy: CombatStrategy
  rounds_played: number
  outcome: {
    occupied: boolean
    destroyed_temp_outpost: boolean
    loot_applied: boolean
    attacker_retreated: boolean
  }
  casualties_attacker: { code: TroopCode; count: number }[]
  casualties_defender: { code: TroopCode; count: number }[]
  round_summaries: {
    round: number
    attacker_attack_pool: number
    defender_attack_pool: number
    attacker_life_pool: number
    defender_life_pool: number
    attacker_losses: { code: TroopCode; count: number }[]
    defender_losses: { code: TroopCode; count: number }[]
  }[]
}
```

## Migration file (proposed)

`apps/server/src/adapter/database/migrations/00006_player_combat_pvp.ts`:

1. `ALTER movement ADD combat_strategy text`
2. `ALTER city ADD default_combat_strategy text`
3. `ALTER outpost ADD default_combat_strategy text`
4. `CREATE TABLE battle (...)` 
5. `CREATE TABLE report_battle (...)`
6. Down migration drops new tables/columns

## Domain services (no tables)

- `CombatService` — pure round resolution (pools, casualties, early end).
- `CombatStrategyService` — multiplier lookup for round + class.
- `FactionService` / existing player faction — gating `attacker.faction_code !== defender.faction_code`.
