import type { MockInstance } from 'vitest'
import assert from 'assert'
import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { now } from '#shared/time'
import { TroopEntity } from '#core/troop/entity'
import { Coordinates } from '#core/world/value/coordinates'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostError } from '#core/outpost/error'
import { id } from '#shared/identification'

describe('finishTroopBaseMovement', () => {
  const player_id = id()
  const other_player_id = id()
  const movement_id = id()
  const movement_troop_id = id()
  const city_troop_id = id()
  const city_id = id()
  const origin: Coordinates = {
    sector: 1,
    x: 2,
    y: 3,
  }
  const destination_cell_id = id()
  const destination: Coordinates = {
    sector: 4,
    x: 5,
    y: 6,
  }
  let movement: MovementEntity
  let movement_troop_explorer: TroopEntity
  let movement_troop_settler: TroopEntity
  let destination_troop_explorer: TroopEntity

  let movementDelete: MockInstance
  let troopUpdateOne: MockInstance
  let troopDelete: MockInstance
  let reportCreate: MockInstance
  let outpostCreate: MockInstance
  let ensureWorldStockForCell: MockInstance
  let repository: Pick<
    Repository,
    'troop' | 'movement' | 'cell' | 'outpost' | 'report' | 'resource_stock'
  >

  function mountRepository({
    city_exists,
    outpost_exists,
    existing_outposts_count,
  }: {
    city_exists: boolean
    outpost_exists: boolean
    existing_outposts_count: number
  }) {
    movementDelete = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    troopDelete = vi.fn().mockResolvedValue(undefined)
    reportCreate = vi.fn().mockResolvedValue(undefined)
    outpostCreate = vi.fn().mockResolvedValue(undefined)
    ensureWorldStockForCell = vi.fn().mockResolvedValue(undefined)

    repository = {
      troop: {
        listByMovement: vi.fn().mockResolvedValue([
          movement_troop_explorer,
          movement_troop_settler,
        ]),
        listInCell: vi.fn().mockResolvedValue([ destination_troop_explorer ]),
        updateOne: troopUpdateOne,
        delete: troopDelete,
      } as unknown as Repository['troop'],
      movement: {
        getById: vi.fn().mockResolvedValue(movement),
        delete: movementDelete,
      } as unknown as Repository['movement'],
      cell: {
        getCell: vi.fn().mockResolvedValue({
          id: destination_cell_id,
          coordinates: destination,
          city_id: city_exists ? city_id : undefined,
        }),
      } as unknown as Repository['cell'],
      outpost: {
        existsOnCell: vi.fn().mockResolvedValue(outpost_exists),
        countForPlayer: vi.fn().mockResolvedValue(existing_outposts_count),
        create: outpostCreate,
      } as unknown as Repository['outpost'],
      report: { create: reportCreate } as unknown as Repository['report'],
      resource_stock: { ensureWorldStockForCell } as unknown as Repository['resource_stock'],
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  }

  beforeEach(() => {
    movement = MovementEntity.create({
      id: movement_id,
      player_id,
      action: MovementAction.BASE,
      origin,
      destination,
      arrive_at: now() - 5000,
    })

    movement_troop_settler = TroopEntity.create({
      id: movement_troop_id,
      code: TroopCode.SETTLER,
      player_id,
      cell_id: null,
      count: 1,
      ongoing_recruitment: null,
      movement_id: movement.id,
    })

    movement_troop_explorer = TroopEntity.create({
      id: movement_troop_id,
      code: TroopCode.EXPLORER,
      player_id,
      cell_id: null,
      count: 2,
      ongoing_recruitment: null,
      movement_id: movement.id,
    })

    destination_troop_explorer = TroopEntity.create({
      id: city_troop_id,
      code: TroopCode.EXPLORER,
      player_id,
      cell_id: destination_cell_id,
      count: 1,
      ongoing_recruitment: null,
      movement_id: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent a player for finishing a movement of another player', async () => {
    mountRepository({
      city_exists: false,
      outpost_exists: false,
      existing_outposts_count: 0,
    })
    repository.movement.getById = vi.fn().mockResolvedValue(MovementEntity.create({
      ...movement,
      player_id: other_player_id,
    }))

    await assert.rejects(
      () => finishTroopBaseMovement({
        player_id,
        movement_id,
      }),
      new RegExp(TroopError.NOT_OWNER)
    )
  })

  it('should prevent a player from finishing a movement when arrive at date is in the future', async () => {
    mountRepository({
      city_exists: false,
      outpost_exists: false,
      existing_outposts_count: 0,
    })
    repository.movement.getById = vi.fn().mockResolvedValue(MovementEntity.create({
      ...movement,
      arrive_at: now() + 10000,
    }))

    await assert.rejects(
      () => finishTroopBaseMovement({
        player_id,
        movement_id,
      }),
      new RegExp(TroopError.MOVEMENT_NOT_ARRIVED)
    )
  })

  it('should not create a temporary outpost if there is an existing city', async () => {
    mountRepository({
      city_exists: true,
      outpost_exists: false,
      existing_outposts_count: 0,
    })

    await finishTroopBaseMovement({
      player_id,
      movement_id,
    })

    assert.strictEqual(outpostCreate.mock.calls.length, 0)
  })

  it('should not create a temporary outpost if there is an existing outpost', async () => {
    mountRepository({
      city_exists: false,
      outpost_exists: true,
      existing_outposts_count: 0,
    })

    await finishTroopBaseMovement({
      player_id,
      movement_id,
    })

    assert.strictEqual(outpostCreate.mock.calls.length, 0)
  })

  it('should throw an error when we should create temporary outpost and limit is reached', async () => {
    mountRepository({
      city_exists: false,
      outpost_exists: false,
      existing_outposts_count: 1000,
    })

    await assert.rejects(
      () => finishTroopBaseMovement({
        player_id,
        movement_id,
      }),
      new RegExp(OutpostError.LIMIT_REACHED)
    )
  })

  it('should create a temporary outpost if there is no city or outpost', async () => {
    mountRepository({
      city_exists: false,
      outpost_exists: false,
      existing_outposts_count: 0,
    })

    await finishTroopBaseMovement({
      player_id,
      movement_id,
    })

    assert.strictEqual(outpostCreate.mock.calls.length, 1)
    const outpost = outpostCreate.mock.calls[0][0]
    assert.strictEqual(outpost.type, OutpostType.TEMPORARY)
    assert.strictEqual(outpost.player_id, player_id)
    assert.strictEqual(outpost.cell_id, destination_cell_id)
  })

  it('should create all troops of the temporary outpost if there is not city or outpost', async () => {
    mountRepository({
      city_exists: false,
      outpost_exists: false,
      existing_outposts_count: 0,
    })

    await finishTroopBaseMovement({
      player_id,
      movement_id,
    })

    const delete_ids = troopDelete.mock.calls.map(([ idArg ]) => idArg)
    assert.strictEqual(delete_ids.length, 2)
    assert.strictEqual(delete_ids[0], movement_troop_id)

    assert.strictEqual(troopUpdateOne.mock.calls.length, Object.values(TroopCode).length)

    const updated_troops = troopUpdateOne.mock.calls.map(([ t ]) => t)
    const updated_explorer = updated_troops.find(t => t.code === TroopCode.EXPLORER)
    const updated_settler = updated_troops.find(t => t.code === TroopCode.SETTLER)
    assert.ok(updated_explorer)
    assert.ok(updated_settler)

    assert.strictEqual(updated_explorer.count, movement_troop_explorer.count)
    assert.strictEqual(updated_settler.count, movement_troop_settler.count)
    updated_troops.forEach(troop => {
      assert.strictEqual(troop.cell_id, destination_cell_id)
    })

    assert.strictEqual(movementDelete.mock.calls[0][0], movement.id)
  })

  it('should move troops to the destination when there is a city', async () => {
    mountRepository({
      city_exists: true,
      outpost_exists: false,
      existing_outposts_count: 0,
    })

    await finishTroopBaseMovement({
      player_id,
      movement_id,
    })

    const delete_ids = troopDelete.mock.calls.map(([ idArg ]) => idArg)
    assert.strictEqual(delete_ids.length, 2)
    assert.strictEqual(delete_ids[0], movement_troop_id)

    const updated_troops = troopUpdateOne.mock.calls.map(([ t ]) => t)
    assert.strictEqual(updated_troops.length, 2)

    const updated_explorer = updated_troops.find(t => t.code === TroopCode.EXPLORER)
    const updated_settler = updated_troops.find(t => t.code === TroopCode.SETTLER)
    assert.ok(updated_explorer)
    assert.ok(updated_settler)

    assert.strictEqual(
      updated_explorer.count,
      destination_troop_explorer.count + movement_troop_explorer.count
    )
    assert.strictEqual(updated_settler.count, movement_troop_settler.count)
    updated_troops.forEach(troop => {
      assert.strictEqual(troop.cell_id, destination_cell_id)
    })

    assert.strictEqual(movementDelete.mock.calls[0][0], movement.id)
  })

  it('should move troops to the destination when there is an outpost', async () => {
    mountRepository({
      city_exists: false,
      outpost_exists: true,
      existing_outposts_count: 0,
    })

    await finishTroopBaseMovement({
      player_id,
      movement_id,
    })

    const delete_ids = troopDelete.mock.calls.map(([ idArg ]) => idArg)
    assert.strictEqual(delete_ids.length, 2)

    const updated_troops = troopUpdateOne.mock.calls.map(([ t ]) => t)
    assert.strictEqual(updated_troops.length, 2)

    const updated_explorer = updated_troops.find(t => t.code === TroopCode.EXPLORER)
    const updated_settler = updated_troops.find(t => t.code === TroopCode.SETTLER)
    assert.ok(updated_explorer)
    assert.ok(updated_settler)

    assert.strictEqual(
      updated_explorer.count,
      destination_troop_explorer.count + movement_troop_explorer.count
    )
    assert.strictEqual(updated_settler.count, movement_troop_settler.count)
    updated_troops.forEach(troop => {
      assert.strictEqual(troop.cell_id, destination_cell_id)
    })

    assert.strictEqual(movementDelete.mock.calls[0][0], movement.id)
  })

  it('should create a report describing the explored cell', async () => {
    mountRepository({
      city_exists: false,
      outpost_exists: false,
      existing_outposts_count: 0,
    })

    await finishTroopBaseMovement({
      player_id,
      movement_id,
    })

    const report = reportCreate.mock.calls[0][0]
    assert.strictEqual(report.troops.length, 2)
    assert.strictEqual(report.was_read, false)

    const report_explorer = report.troops.find((t: { code: TroopCode }) => t.code === TroopCode.EXPLORER)
    const report_settler = report.troops.find((t: { code: TroopCode }) => t.code === TroopCode.SETTLER)
    assert.ok(report_explorer)
    assert.ok(report_settler)

    assert.strictEqual(report_explorer.count, movement_troop_explorer.count)
    assert.strictEqual(report_settler.count, movement_troop_settler.count)
  })
})
