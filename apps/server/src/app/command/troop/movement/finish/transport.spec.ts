import type { MockInstance } from 'vitest'
import assert from 'assert'
import { finishTroopTransportMovement } from '#app/command/troop/movement/finish/transport'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { TroopEntity } from '#core/troop/entity'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { ResourceStockEntity } from '#core/resources/resource-stock/entity'
import { ReportType } from '#core/communication/value/report-type'
import { now } from '#shared/time'
import { id } from '#shared/identification'

describe('finishTroopTransportMovement', () => {
  const player_id = id()
  const other_player_id = id()
  const movement_id = id()
  const troop_id = id()
  const destination_cell_id = id()
  const city_id = id()
  const arrived_at = now() - 5000

  let movement: MovementEntity
  let troop: TroopEntity
  let destination_stock: ResourceStockEntity
  let movementDelete: MockInstance
  let movementCreate: MockInstance
  let troopUpdateOne: MockInstance
  let reportCreate: MockInstance
  let stockUpdateOne: MockInstance
  let scheduleTroopMovementFinish: MockInstance
  let repository: Pick<Repository, 'troop' | 'movement' | 'cell' | 'city' | 'outpost' | 'report' | 'resource_stock'>

  beforeEach(() => {
    movement = MovementEntity.create({
      id: movement_id,
      player_id,
      action: MovementAction.TRANSPORT,
      origin: {
        x: 2,
        y: 3 },
      destination: {
        x: 5,
        y: 6 },
      resources: {
        plastic: 1000,
        mushroom: 500,
        plasma: 0 } })

    troop = TroopEntity.create({
      id: troop_id,
      code: TroopCode.LIGHT_TRANSPORTER,
      player_id,
      cell_id: null,
      count: 1,
      movement_id })

    destination_stock = ResourceStockEntity.create({
      id: id(),
      cell_id: destination_cell_id,
      plastic: 2900,
      mushroom: 0,
      plasma: 0,
      last_plastic_gather: now(),
      last_mushroom_gather: now() })

    movementDelete = vi.fn().mockResolvedValue(undefined)
    movementCreate = vi.fn().mockResolvedValue(undefined)
    troopUpdateOne = vi.fn().mockResolvedValue(undefined)
    reportCreate = vi.fn().mockResolvedValue(undefined)
    stockUpdateOne = vi.fn().mockResolvedValue(undefined)
    scheduleTroopMovementFinish = vi.fn().mockResolvedValue('job-id')

    repository = {
      troop: {
        listByMovement: vi.fn().mockResolvedValue([ troop ]),
        updateOne: troopUpdateOne } as unknown as Repository['troop'],
      movement: {
        getById: vi.fn().mockResolvedValue(movement),
        delete: movementDelete,
        create: movementCreate } as unknown as Repository['movement'],
      cell: {
        getCell: vi.fn().mockResolvedValue({
          id: destination_cell_id,
          city_id }) } as unknown as Repository['cell'],
      city: {
        get: vi.fn().mockResolvedValue(CityEntity.create({
          id: city_id,
          player_id,
          name: 'Home' })) } as unknown as Repository['city'],
      outpost: {
        searchByCell: vi.fn().mockResolvedValue(null) } as unknown as Repository['outpost'],
      report: { create: reportCreate } as unknown as Repository['report'],
      resource_stock: {
        getByCellId: vi.fn().mockResolvedValue(destination_stock),
        updateOne: stockUpdateOne } as unknown as Repository['resource_stock'] }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleTroopMovementFinish } as unknown as JobQueue)
    vi.spyOn(AppService, 'getCityWarehousesCapacity').mockResolvedValue({
      plastic: 3000,
      mushroom: 4000,
      plasma: 0 })
    vi.spyOn(AppService, 'getOutpostWarehousesCapacity').mockResolvedValue({
      plastic: 10000,
      mushroom: 10000,
      plasma: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should prevent finishing another player transport', async () => {
    repository.movement.getById = vi.fn().mockResolvedValue(MovementEntity.create({
      ...movement,
      player_id: other_player_id }))

    await assert.rejects(
      () => finishTroopTransportMovement({
        player_id,
        movement_id,
        arrived_at }),
      new RegExp(TroopError.MOVEMENT_NOT_OWNER)
    )
  })

  it('should deposit up to warehouse capacity and return overflow on BASE', async () => {
    const result = await finishTroopTransportMovement({
      player_id,
      movement_id,
      arrived_at })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 1)
    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, 3000)
    assert.strictEqual(updated_stock.mushroom, 500)

    assert.strictEqual(movementCreate.mock.calls.length, 1)
    const base_movement = movementCreate.mock.calls[0][0]
    assert.strictEqual(base_movement.action, MovementAction.BASE)
    assert.deepStrictEqual(base_movement.resources, {
      plastic: 900,
      mushroom: 0,
      plasma: 0 })
    assert.strictEqual(result.base_movement.id, base_movement.id)
    assert.strictEqual(reportCreate.mock.calls[0][0].type, ReportType.TRANSPORT)
    assert.deepStrictEqual(reportCreate.mock.calls[0][0].resources, {
      plastic: 100,
      mushroom: 500,
      plasma: 0 })
    assert.deepStrictEqual(reportCreate.mock.calls[0][0].remaining_resources, {
      plastic: 900,
      mushroom: 0,
      plasma: 0 })
  })

  it('should deposit full cargo into owned outpost', async () => {
    repository.cell.getCell = vi.fn().mockResolvedValue({
      id: destination_cell_id,
      city_id: undefined })
    repository.city.get = vi.fn()
    repository.outpost.searchByCell = vi.fn().mockResolvedValue(OutpostEntity.create({
      id: id(),
      player_id,
      cell_id: destination_cell_id,
      type: OutpostType.PERMANENT }))

    await finishTroopTransportMovement({
      player_id,
      movement_id,
      arrived_at })

    const updated_stock = stockUpdateOne.mock.calls[0][0]
    assert.strictEqual(updated_stock.plastic, 3900)
    assert.strictEqual(updated_stock.mushroom, 500)

    const base_movement = movementCreate.mock.calls[0][0]
    assert.deepStrictEqual(base_movement.resources, {
      plastic: 0,
      mushroom: 0,
      plasma: 0 })
    assert.deepStrictEqual(reportCreate.mock.calls[0][0].resources, {
      plastic: 1000,
      mushroom: 500,
      plasma: 0 })
    assert.deepStrictEqual(reportCreate.mock.calls[0][0].remaining_resources, {
      plastic: 0,
      mushroom: 0,
      plasma: 0 })
  })

  it('should bounce full cargo when destination is empty', async () => {
    repository.cell.getCell = vi.fn().mockResolvedValue({
      id: destination_cell_id,
      city_id: undefined })
    repository.city.get = vi.fn()
    repository.outpost.searchByCell = vi.fn().mockResolvedValue(null)

    await finishTroopTransportMovement({
      player_id,
      movement_id,
      arrived_at })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    const base_movement = movementCreate.mock.calls[0][0]
    assert.deepStrictEqual(base_movement.resources, {
      plastic: 1000,
      mushroom: 500,
      plasma: 0 })
    assert.deepStrictEqual(reportCreate.mock.calls[0][0].resources, {
      plastic: 0,
      mushroom: 0,
      plasma: 0 })
    assert.deepStrictEqual(reportCreate.mock.calls[0][0].remaining_resources, {
      plastic: 1000,
      mushroom: 500,
      plasma: 0 })
  })

  it('should bounce full cargo when destination is not owned', async () => {
    repository.city.get = vi.fn().mockResolvedValue(CityEntity.create({
      id: city_id,
      player_id: other_player_id,
      name: 'Enemy' }))

    await finishTroopTransportMovement({
      player_id,
      movement_id,
      arrived_at })

    assert.strictEqual(stockUpdateOne.mock.calls.length, 0)
    const base_movement = movementCreate.mock.calls[0][0]
    assert.deepStrictEqual(base_movement.resources, {
      plastic: 1000,
      mushroom: 500,
      plasma: 0 })
    assert.deepStrictEqual(reportCreate.mock.calls[0][0].resources, {
      plastic: 0,
      mushroom: 0,
      plasma: 0 })
    assert.deepStrictEqual(reportCreate.mock.calls[0][0].remaining_resources, {
      plastic: 1000,
      mushroom: 500,
      plasma: 0 })
  })
})
