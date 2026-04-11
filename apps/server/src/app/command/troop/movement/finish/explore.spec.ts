import type { MockInstance } from 'vitest'
import assert from 'assert'
import { finishTroopExploreMovement } from '#app/command/troop/movement/finish/explore'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { now } from '#shared/time'
import { TroopEntity } from '#core/troop/entity'
import { ExplorationEntity } from '#core/world/exploration/entity'
import { id } from '#shared/identification'

describe('finishTroopExploreMovement', () => {
  const player_id = id()
  const other_player_id = id()
  const movement_id = id()
  const troop_id = id()
  const exploration_id = id()
  const already_explored_cell_id = id()
  const cell_id = id()
  const city_cell_id = id()
  let movement: MovementEntity
  let troop: TroopEntity
  let exploration: ExplorationEntity
  let movementDelete: MockInstance
  let movementCreate: MockInstance
  let troopUpdateOne: MockInstance
  let explorationUpdateOne: MockInstance
  let reportCreate: MockInstance
  let repository: Pick<Repository, 'troop' | 'movement' | 'exploration' | 'report'>

  beforeEach(() => {
    movement = MovementEntity.create({
      id: movement_id,
      player_id,
      action: MovementAction.EXPLORE,
      origin: {
        sector: 1,
        x: 2,
        y: 3,
      },
      destination: {
        sector: 4,
        x: 5,
        y: 6,
      },
      arrive_at: now() - 5000,
    })

    troop = TroopEntity.create({
      id: troop_id,
      code: TroopCode.EXPLORER,
      player_id,
      cell_id: city_cell_id,
      count: 1,
      ongoing_recruitment: null,
      movement_id: null,
    })

    exploration = ExplorationEntity.create({
      id: exploration_id,
      player_id,
      cell_ids: [ already_explored_cell_id ],
    })

    movementDelete = vi.fn().mockResolvedValue(undefined)
    movementCreate = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    explorationUpdateOne = vi.fn().mockResolvedValue(undefined)
    reportCreate = vi.fn().mockResolvedValue(undefined)

    repository = {
      troop: {
        listByMovement: vi.fn().mockResolvedValue([ troop ]),
        updateOne: troopUpdateOne,
      } as unknown as Repository['troop'],
      movement: {
        getById: vi.fn().mockResolvedValue(movement),
        delete: movementDelete,
        create: movementCreate,
      } as unknown as Repository['movement'],
      exploration: {
        get: vi.fn().mockResolvedValue(exploration),
        updateOne: explorationUpdateOne,
      } as unknown as Repository['exploration'],
      report: { create: reportCreate } as unknown as Repository['report'],
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(AppService, 'getExploredCellIds').mockResolvedValue([ cell_id ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent a player for finishing a movement of another player', async () => {
    repository.movement.getById = vi.fn().mockResolvedValue(MovementEntity.create({
      ...movement,
      player_id: other_player_id,
    }))

    await assert.rejects(
      () => finishTroopExploreMovement({
        player_id,
        movement_id,
      }),
      new RegExp(TroopError.MOVEMENT_NOT_OWNER)
    )
  })

  it('should prevent a player from finishing a movement when arrive at date is in the future', async () => {
    repository.movement.getById = vi.fn().mockResolvedValue(MovementEntity.create({
      ...movement,
      arrive_at: now() + 10000,
    }))

    await assert.rejects(
      () => finishTroopExploreMovement({
        player_id,
        movement_id,
      }),
      new RegExp(TroopError.MOVEMENT_NOT_ARRIVED)
    )
  })

  it('should mark the cell as explored', async () => {
    await finishTroopExploreMovement({
      player_id,
      movement_id,
    })

    const updated_exploration = explorationUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_exploration.cell_ids.length, 2)
    assert.ok(updated_exploration.cell_ids.some((c: string) => c))
  })

  it('should send the troop back to base at the origin', async () => {
    await finishTroopExploreMovement({
      player_id,
      movement_id,
    })

    const movement_to_create = movementCreate.mock.calls[0][0]
    assert.strictEqual(movementDelete.mock.calls[0][0], movement.id)
    assert.strictEqual(movement_to_create.action, MovementAction.BASE)
    const troops_updated = troopUpdateOne.mock.calls.map(([ t ]) => t)
    assert.strictEqual(troops_updated.length, 1)
    assert.strictEqual(troops_updated[0].movement_id, movement_to_create.id)
  })

  it('should create a report describing the explored cell', async () => {
    await finishTroopExploreMovement({
      player_id,
      movement_id,
    })

    const report = reportCreate.mock.calls[0][0]
    assert.strictEqual(report.troops.length, 1)
    assert.strictEqual(report.was_read, false)
    assert.strictEqual(report.troops[0].code, TroopCode.EXPLORER)
  })
})
