import type { MockInstance } from 'vitest'
import { createTroopMovement } from '#app/command/troop/movement/create'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { AppEvent } from '#core/events'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'
import assert from 'assert'

describe('createTroopMovement', () => {
  const player_id = id()
  const cell_id = id()
  const origin = {
    x: 1,
    y: 2,
    sector: 3
  }
  const destination = {
    x: 4,
    y: 5,
    sector: 6
  }

  let origin_troop: TroopEntity
  let cell: CellEntity
  let troopCreate: MockInstance
  let troopUpdateOne: MockInstance
  let troopDelete: MockInstance
  let movementCreate: MockInstance
  let outpostDelete: MockInstance
  let searchByCell: MockInstance
  let listInCell: MockInstance
  let scheduleTroopMovementFinish: MockInstance
  let repository: Pick<Repository, 'cell' | 'troop' | 'outpost' | 'movement'>

  beforeEach(() => {
    origin_troop = TroopEntity.create({
      id: id(),
      code: TroopCode.EXPLORER,
      count: 10,
      player_id,
      cell_id,
      movement_id: null
    })

    cell = CellEntity.create({
      id: cell_id,
      coordinates: origin,
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 0.1,
        mushroom: 0.1,
        plasma: 0
      },
      solar_coefficient: 1,
    })

    troopCreate = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    troopDelete = vi.fn().mockResolvedValue(undefined)
    movementCreate = vi.fn().mockResolvedValue(undefined)
    outpostDelete = vi.fn().mockResolvedValue(undefined)
    searchByCell = vi.fn().mockResolvedValue(null)
    listInCell = vi.fn().mockResolvedValue([ origin_troop ])
    scheduleTroopMovementFinish = vi.fn().mockResolvedValue('job-id')

    repository = {
      cell: { getCell: vi.fn().mockResolvedValue(cell) } as unknown as Repository['cell'],
      troop: {
        listInCell,
        create: troopCreate,
        updateOne: troopUpdateOne,
        delete: troopDelete,
      } as unknown as Repository['troop'],
      outpost: {
        searchByCell,
        delete: outpostDelete,
      } as unknown as Repository['outpost'],
      movement: { create: movementCreate } as unknown as Repository['movement'],
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopMovementFinish } as unknown as JobQueue)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit: vi.fn() } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function callCreate(move_troops: { code: TroopCode; count: number }[]) {
    return createTroopMovement({
      player_id,
      origin,
      destination,
      action: MovementAction.EXPLORE,
      move_troops,
    })
  }

  it('should reject when origin does not have enough troops', async () => {
    listInCell = vi.fn().mockResolvedValue([
      TroopEntity.create({
        ...origin_troop,
        count: 3,
      }),
    ])
    repository.troop = {
      ...repository.troop,
      listInCell,
    } as unknown as Repository['troop']

    await assert.rejects(
      () => callCreate([
        {
          code: TroopCode.EXPLORER,
          count: 5
        }
      ]),
      new RegExp(TroopError.NOT_ENOUGH_TROOPS)
    )

    assert.strictEqual(movementCreate.mock.calls.length, 0)
    assert.strictEqual(troopCreate.mock.calls.length, 0)
    assert.strictEqual(scheduleTroopMovementFinish.mock.calls.length, 0)
  })

  it('should create movement and update origin troops on partial move without outpost', async () => {
    const result = await callCreate([
      {
        code: TroopCode.EXPLORER,
        count: 5
      }
    ])

    assert.strictEqual(result.deleted_outpost_id, undefined)
    assert.strictEqual(movementCreate.mock.calls.length, 1)

    const movement = movementCreate.mock.calls[0][0]
    assert.strictEqual(movement.player_id, player_id)
    assert.strictEqual(movement.action, MovementAction.EXPLORE)
    assert.deepStrictEqual(movement.origin, origin)
    assert.deepStrictEqual(movement.destination, destination)

    assert.strictEqual(troopCreate.mock.calls.length, 1)
    const created_troop = troopCreate.mock.calls[0][0]
    assert.strictEqual(created_troop.movement_id, movement.id)
    assert.strictEqual(created_troop.code, TroopCode.EXPLORER)
    assert.strictEqual(created_troop.count, 5)

    assert.strictEqual(troopUpdateOne.mock.calls.length, 1)
    const [ updated_origin ] = troopUpdateOne.mock.calls[0]
    assert.strictEqual(updated_origin.id, origin_troop.id)
    assert.strictEqual(updated_origin.count, 5)

    assert.strictEqual(outpostDelete.mock.calls.length, 0)
    assert.strictEqual(troopDelete.mock.calls.length, 0)

    assert.strictEqual(scheduleTroopMovementFinish.mock.calls.length, 1)
    const scheduled = scheduleTroopMovementFinish.mock.calls[0][0]
    assert.strictEqual(scheduled.player_id, player_id)
    assert.strictEqual(scheduled.movement_id, movement.id)
    assert.ok(typeof scheduled.execute_at === 'number')
  })

  it('should delete temporary outpost and origin troops when cell is fully emptied', async () => {
    const outpost_id = id()
    const temporary_outpost = OutpostEntity.create({
      id: outpost_id,
      player_id,
      cell_id,
      type: OutpostType.TEMPORARY,
    })
    searchByCell = vi.fn().mockResolvedValue(temporary_outpost)
    repository.outpost = {
      searchByCell,
      delete: outpostDelete,
    } as unknown as Repository['outpost']

    const result = await callCreate([
      {
        code: TroopCode.EXPLORER,
        count: 10
      }
    ])

    assert.strictEqual(result.deleted_outpost_id, outpost_id)
    assert.strictEqual(outpostDelete.mock.calls[0][0], outpost_id)
    assert.strictEqual(troopDelete.mock.calls[0][0], origin_troop.id)
    assert.strictEqual(troopUpdateOne.mock.calls.length, 0)
  })

  it('should emit OutpostDeleted event when temporary outpost is deleted', async () => {
    const outpost_id = id()
    const mockEmit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit: mockEmit } as any)

    const temporary_outpost = OutpostEntity.create({
      id: outpost_id,
      player_id,
      cell_id,
      type: OutpostType.TEMPORARY,
    })
    searchByCell = vi.fn().mockResolvedValue(temporary_outpost)
    repository.outpost = {
      searchByCell,
      delete: outpostDelete,
    } as unknown as Repository['outpost']

    await callCreate([
      {
        code: TroopCode.EXPLORER,
        count: 10
      }
    ])

    assert.strictEqual(mockEmit.mock.calls.length, 1)
    assert.strictEqual(mockEmit.mock.calls[0][0], AppEvent.OutpostDeleted)
    assert.deepStrictEqual(mockEmit.mock.calls[0][1], {
      player_id,
      outpost_id
    })
  })

  it('should not emit OutpostDeleted event when no outpost is deleted', async () => {
    const mockEmit = vi.fn()
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit: mockEmit } as any)

    await callCreate([
      {
        code: TroopCode.EXPLORER,
        count: 5
      }
    ])

    assert.strictEqual(mockEmit.mock.calls.length, 0)
  })

  it('should not delete outpost when temporary outpost remains garrisoned after partial move', async () => {
    const temporary_outpost = OutpostEntity.create({
      id: id(),
      player_id,
      cell_id,
      type: OutpostType.TEMPORARY,
    })
    searchByCell = vi.fn().mockResolvedValue(temporary_outpost)
    repository.outpost = {
      searchByCell,
      delete: outpostDelete,
    } as unknown as Repository['outpost']

    await callCreate([
      {
        code: TroopCode.EXPLORER,
        count: 5
      }
    ])

    assert.strictEqual(outpostDelete.mock.calls.length, 0)
    assert.strictEqual(troopDelete.mock.calls.length, 0)
    assert.strictEqual(troopUpdateOne.mock.calls.length, 1)
  })

  it('should not delete permanent outpost when cell is fully emptied', async () => {
    const permanent_outpost = OutpostEntity.create({
      id: id(),
      player_id,
      cell_id,
      type: OutpostType.PERMANENT,
    })
    searchByCell = vi.fn().mockResolvedValue(permanent_outpost)
    repository.outpost = {
      searchByCell,
      delete: outpostDelete,
    } as unknown as Repository['outpost']

    const result = await callCreate([
      {
        code: TroopCode.EXPLORER,
        count: 10
      }
    ])

    assert.strictEqual(result.deleted_outpost_id, undefined)
    assert.strictEqual(outpostDelete.mock.calls.length, 0)
    assert.strictEqual(troopDelete.mock.calls.length, 0)
    assert.strictEqual(troopUpdateOne.mock.calls.length, 1)
  })

  describe('transport', () => {
    let stockUpdateOne: MockInstance
    let stock: ReturnType<typeof import('#core/resources/resource-stock/entity').ResourceStockEntity.create>

    beforeEach(async () => {
      const { ResourceStockEntity } = await import('#core/resources/resource-stock/entity')
      const { now } = await import('#shared/time')
      stock = ResourceStockEntity.create({
        id: id(),
        cell_id,
        plastic: 5000,
        mushroom: 5000,
        plasma: 0,
        last_plastic_gather: now(),
        last_mushroom_gather: now(),
      })
      stockUpdateOne = vi.fn().mockResolvedValue(undefined)
      repository = {
        ...repository,
        resource_stock: {
          getByCellId: vi.fn().mockResolvedValue(stock),
          updateOne: stockUpdateOne,
        },
      } as unknown as typeof repository
      vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    })

    it('should reject transport without resources', async () => {
      await assert.rejects(
        () => createTroopMovement({
          player_id,
          origin,
          destination,
          action: MovementAction.TRANSPORT,
          move_troops: [
            {
              code: TroopCode.LIGHT_TRANSPORTER,
              count: 1
            }
          ],
          resources: {
            plastic: 0,
            mushroom: 0,
            plasma: 0
          },
        }),
        new RegExp(TroopError.TRANSPORT_RESOURCES_REQUIRED)
      )
    })

    it('should reject when cargo exceeds transport capacity', async () => {
      await assert.rejects(
        () => createTroopMovement({
          player_id,
          origin,
          destination,
          action: MovementAction.TRANSPORT,
          move_troops: [
            {
              code: TroopCode.EXPLORER,
              count: 1
            }
          ],
          resources: {
            plastic: 201,
            mushroom: 0,
            plasma: 0
          },
        }),
        new RegExp(TroopError.TRANSPORT_CAPACITY_EXCEEDED)
      )
    })

    it('should reject resources on non-transport actions', async () => {
      await assert.rejects(
        () => createTroopMovement({
          player_id,
          origin,
          destination,
          action: MovementAction.EXPLORE,
          move_troops: [
            {
              code: TroopCode.EXPLORER,
              count: 1
            }
          ],
          resources: {
            plastic: 10,
            mushroom: 0,
            plasma: 0
          },
        }),
        new RegExp(TroopError.TRANSPORT_RESOURCES_NOT_ALLOWED)
      )
    })

    it('should deduct stock and store cargo on transport create', async () => {
      origin_troop = TroopEntity.create({
        ...origin_troop,
        code: TroopCode.LIGHT_TRANSPORTER,
        count: 1,
      })
      listInCell = vi.fn().mockResolvedValue([ origin_troop ])
      repository.troop = {
        ...repository.troop,
        listInCell,
      } as unknown as Repository['troop']

      await createTroopMovement({
        player_id,
        origin,
        destination,
        action: MovementAction.TRANSPORT,
        move_troops: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 1
          }
        ],
        resources: {
          plastic: 1000,
          mushroom: 500,
          plasma: 0
        },
      })

      assert.strictEqual(movementCreate.mock.calls.length, 1)
      const movement = movementCreate.mock.calls[0][0]
      assert.strictEqual(movement.action, MovementAction.TRANSPORT)
      assert.deepStrictEqual(movement.resources, {
        plastic: 1000,
        mushroom: 500,
        plasma: 0
      })
      assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
      const updated = stockUpdateOne.mock.calls[0][0]
      assert.strictEqual(updated.plastic, 4000)
      assert.strictEqual(updated.mushroom, 4500)
    })

    it('should reject when origin stock is insufficient', async () => {
      const { ResourceStockEntity } = await import('#core/resources/resource-stock/entity')
      const { now } = await import('#shared/time')
      const { CityError } = await import('#core/city/error')
      stock = ResourceStockEntity.create({
        id: id(),
        cell_id,
        plastic: 10,
        mushroom: 10,
        plasma: 0,
        last_plastic_gather: now(),
        last_mushroom_gather: now(),
      })
      repository = {
        ...repository,
        resource_stock: {
          getByCellId: vi.fn().mockResolvedValue(stock),
          updateOne: stockUpdateOne,
        },
      } as unknown as typeof repository
      vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)

      origin_troop = TroopEntity.create({
        ...origin_troop,
        code: TroopCode.LIGHT_TRANSPORTER,
        count: 1,
      })
      listInCell = vi.fn().mockResolvedValue([ origin_troop ])
      repository.troop = {
        ...repository.troop,
        listInCell,
      } as unknown as Repository['troop']

      await assert.rejects(
        () => createTroopMovement({
          player_id,
          origin,
          destination,
          action: MovementAction.TRANSPORT,
          move_troops: [
            {
              code: TroopCode.LIGHT_TRANSPORTER,
              count: 1
            }
          ],
          resources: {
            plastic: 100,
            mushroom: 0,
            plasma: 0
          },
        }),
        new RegExp(CityError.NOT_ENOUGH_RESOURCES)
      )
    })
  })
})
