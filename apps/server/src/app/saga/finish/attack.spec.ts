import assert from 'node:assert/strict'
import { beforeEach, describe, it, vi } from 'vitest'
import { Factory } from '#adapter/factory'
import { sagaFinishAttack } from '#app/saga/finish/attack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { TroopCode } from '#core/troop/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import { Repository } from '#app/port/repository/generic'
import { JobQueue } from '#app/port/job-queue'

describe('sagaFinishAttack', () => {
  let scheduleCombatRoundAdvance: ReturnType<typeof vi.fn>
  let battleCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scheduleCombatRoundAdvance = vi.fn().mockResolvedValue('job-id')
    battleCreate = vi.fn().mockResolvedValue('battle-id')

    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      scheduleCombatRoundAdvance,
    } as unknown as JobQueue)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      movement: {
        getById: vi.fn().mockResolvedValue(MovementEntity.create({
          id: 'movement-id',
          player_id: 'attacker-id',
          action: MovementAction.ATTACK,
          origin: { x: 1, y: 1 },
          destination: { x: 2, y: 2 },
          combat_strategy: CombatStrategy.BALANCED,
        })),
      },
      player: {
        get: vi.fn().mockImplementation((id: string) => Promise.resolve({
          faction_code: id === 'attacker-id'
            ? FactionCode.THE_CONFEDERATION
            : FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
        })),
      },
      cell: {
        getCell: vi.fn().mockResolvedValue({ id: 'dest-cell' }),
      },
      city: {
        searchByCell: vi.fn().mockResolvedValue(null),
      },
      outpost: {
        searchByCell: vi.fn().mockResolvedValue(null),
      },
      troop: {
        listByMovement: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 't1',
            player_id: 'attacker-id',
            cell_id: null,
            code: TroopCode.LEGIONNAIRE,
            count: 5,
            movement_id: 'movement-id',
          }),
        ]),
        listAllInCell: vi.fn().mockResolvedValue([
          TroopEntity.create({
            id: 't2',
            player_id: 'defender-id',
            cell_id: 'dest-cell',
            code: TroopCode.WAR_MACHINE,
            count: 3,
            movement_id: null,
          }),
        ]),
      },
      battle: {
        create: battleCreate,
      },
    } as unknown as Repository)
  })

  it('creates battle and schedules round 1 without reports', async () => {
    await sagaFinishAttack({
      player_id: 'attacker-id',
      movement_id: 'movement-id',
      arrived_at: 1_000,
    })

    assert.strictEqual(battleCreate.mock.calls.length, 1)
    const battle = battleCreate.mock.calls[0][0]
    assert.strictEqual(battle.target_kind, BattleTargetKind.FIELD)
    assert.strictEqual(scheduleCombatRoundAdvance.mock.calls.length, 1)
    assert.strictEqual(scheduleCombatRoundAdvance.mock.calls[0][0].round, 1)
  })
})
