# Contract — Troop movement (`attack`)

**Slice**: 024 | **Status**: Planned (not on `main`)  
**Aligns with**: [`010-troop-movement-combat`](../010-troop-movement-combat/spec.md), `packages/api-client/src/endpoints/troop/movement/*`

## `POST /troop/movement`

**Auth**: session required (same as peaceful movement).

### Request body (extended)

```typescript
interface TroopMovementCreateRequest {
  origin: { x: number; y: number }
  destination: { x: number; y: number }
  action: MovementAction // + 'attack'
  combat_strategy?: CombatStrategy // required when action === 'attack'
  troops: { code: TroopCode; count: number }[]
  resources?: { plastic: number; mushroom: number; plasma: number } // must be zero / omitted for attack
}
```

### Validation rules

| Rule | HTTP | `error_code` (proposed) |
| --- | --- | --- |
| Missing `origin` / `destination` / `troops` / `action` | 400 | existing `RequestError.*` |
| `action === attack` and missing `combat_strategy` | 400 | `RequestError.COMBAT_STRATEGY_NOT_FOUND` or `CombatError.STRATEGY_REQUIRED` |
| `resources` non-zero on attack | 400 | `TroopError.TRANSPORT_RESOURCES_NOT_ALLOWED` |
| Attacker and defender same `faction_code` | 4xx | `CombatError.SAME_FACTION_ATTACK` |
| No enemy defender at destination | 4xx | `CombatError.NO_VALID_TARGET` |
| Army has zero `combat_role = combat` | 4xx | `CombatError.COMBAT_TROOP_REQUIRED` |
| Scout codes in `troops` | 4xx | `CombatError.SCOUT_NOT_ALLOWED_ON_ATTACK` |
| Insufficient stacks / troops in movement | 4xx | `TroopError.NOT_ENOUGH_TROOPS` |

### Success response

Unchanged shape:

```typescript
type TroopMovementCreateResponse = GenericResponse<{
  deleted_outpost_id?: string
}>
```

Attack may still delete temporary origin outpost when last troops leave (existing `createTroopMovement` behavior).

### Side effects

1. Persist `movement` with `action = attack`, `combat_strategy`.
2. Deduct troops; set `movement_id` on stacks.
3. Schedule `troop.movement.finish` at ETA (slowest selected `speed`).

**No** `battle` report at create or at movement finish — only at battle end (see [`communication-report-battle.md`](./communication-report-battle.md)).

## `POST /troop/movement/estimate`

### Request

Same body as create (including `action: 'attack'` and `combat_strategy` when attack).

### Response

Existing estimate DTO (`TroopMovementEstimateDataResponse`): `duration_ms`, `arrive_at` — computed from distance and slowest troop speed (combat troops included).

## `GET /troop/movement/:movement_id`

No schema change required; `action` may return `attack`. Optional future field `battle_id` if battle is linked before finish (implementation choice; not required for v1 if battle is only queryable via reports).

## Handler mapping

| Layer | Path |
| --- | --- |
| HTTP | `apps/server/src/web/handler/troop/movement/create.ts` — pass `combat_strategy` |
| Command | `apps/server/src/app/command/troop/movement/create.ts` |
| Saga | `apps/server/src/app/saga/finish/attack.ts` on `troop.movement.finish` |

## api-client changes

- `packages/api-client/src/endpoints/troop/movement/create.ts` — add `combat_strategy?: CombatStrategy`
- `packages/api-client/src/endpoints/troop/movement/estimate.ts` — same
- Export `CombatStrategy` from `packages/api-client/src/index.ts`
