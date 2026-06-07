import { TroopMovementEstimateQuery } from '#app/query/troop/movement/estimate'
import * as shared from '#app/command/troop/movement/shared'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { TroopCode } from '#core/troop/constant/code'
import { WorldService } from '#core/world/service'
import { TroopService } from '#core/troop/service'
import { id } from '#shared/identification'

describe('TroopMovementEstimateQuery', () => {
  const origin = {
    x: 0,
    y: 0,
    sector: 1
  }
  const destination = {
    x: 1,
    y: 0,
    sector: 1
  }
  const player_id = 'player-1'
  const destination_cell_id = id()
  let repository: Pick<Repository, 'cell' | 'resource_stock'>
  let destination_cell: CellEntity

  beforeEach(() => {
    const origin_cell = CellEntity.create({
      id: id(),
      coordinates: origin,
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1
      },
      solar_coefficient: 1
    })
    destination_cell = CellEntity.create({
      id: destination_cell_id,
      coordinates: destination,
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1
      },
      solar_coefficient: 1
    })
    repository = {
      cell: {
        getCell: vi.fn().mockImplementation(async ({ coordinates }) => {
          if (coordinates.x === destination.x && coordinates.y === destination.y && coordinates.sector === destination.sector) {
            return destination_cell
          }
          return origin_cell
        })
      } as unknown as Repository['cell'],
      resource_stock: {
        getByCellId: vi.fn()
      } as unknown as Repository['resource_stock'],
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns distance, duration in seconds, and speed', async () => {
    const troop_codes = [ TroopCode.EXPLORER ]
    const distance = WorldService.getDistance({
      origin: destination,
      destination: origin
    })
    const duration_ms = TroopService.getMovementDuration({
      distance,
      troop_codes
    })
    const speed = TroopService.getSlowestSpeed({ troop_codes })

    const result = await new TroopMovementEstimateQuery().run({
      origin,
      destination,
      troop_codes,
      player_id,
    })

    expect(result.distance).toBe(distance)
    expect(result.speed).toBe(speed)
    expect(result.duration).toBe(duration_ms / 1000)
    expect(result.transport_capacity).toBe(TroopService.getTransportCapacity(TroopCode.EXPLORER))
    expect(result.destination_capacity_exceeded).toBe(false)
    expect(repository.cell.getCell).toHaveBeenCalledWith({ coordinates: origin })
    expect(repository.cell.getCell).toHaveBeenCalledWith({ coordinates: destination })
  })

  it('returns transport capacity from troop counts when provided', async () => {
    const result = await new TroopMovementEstimateQuery().run({
      origin,
      destination,
      troop_codes: [ TroopCode.LIGHT_TRANSPORTER ],
      troops: [
        {
          code: TroopCode.LIGHT_TRANSPORTER,
          count: 2
        }
      ],
      player_id,
    })

    expect(result.transport_capacity).toBe(
      TroopService.getTotalTransportCapacity({
        troops: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 2
          }
        ]
      })
    )
    expect(result.destination_capacity_exceeded).toBe(false)
  })

  it('returns destination_capacity_exceeded false when resources are empty', async () => {
    const resolve = vi.spyOn(shared, 'resolveOwnedDepositTarget')

    const result = await new TroopMovementEstimateQuery().run({
      origin,
      destination,
      troop_codes: [ TroopCode.EXPLORER ],
      player_id,
      resources: {
        plastic: 0,
        mushroom: 0
      },
    })

    expect(result.destination_capacity_exceeded).toBe(false)
    expect(resolve).not.toHaveBeenCalled()
  })

  it('returns destination_capacity_exceeded false when destination is not owned', async () => {
    vi.spyOn(shared, 'resolveOwnedDepositTarget').mockResolvedValue(null)

    const result = await new TroopMovementEstimateQuery().run({
      origin,
      destination,
      troop_codes: [ TroopCode.EXPLORER ],
      player_id,
      resources: {
        plastic: 100,
        mushroom: 0
      },
    })

    expect(result.destination_capacity_exceeded).toBe(false)
    expect(repository.resource_stock.getByCellId).not.toHaveBeenCalled()
  })

  it('returns destination_capacity_exceeded false when cargo fits remaining space', async () => {
    vi.spyOn(shared, 'resolveOwnedDepositTarget').mockResolvedValue({
      cell_id: destination_cell_id,
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000
      },
    })
    vi.mocked(repository.resource_stock.getByCellId).mockResolvedValue({
      plastic: 400,
      mushroom: 200,
    } as never)

    const result = await new TroopMovementEstimateQuery().run({
      origin,
      destination,
      troop_codes: [ TroopCode.EXPLORER ],
      player_id,
      resources: {
        plastic: 100,
        mushroom: 50
      },
    })

    expect(result.destination_capacity_exceeded).toBe(false)
    expect(repository.resource_stock.getByCellId).toHaveBeenCalledWith({ cell_id: destination_cell_id })
  })

  it('returns destination_capacity_exceeded true when cargo overflows remaining space', async () => {
    vi.spyOn(shared, 'resolveOwnedDepositTarget').mockResolvedValue({
      cell_id: destination_cell_id,
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000
      },
    })
    vi.mocked(repository.resource_stock.getByCellId).mockResolvedValue({
      plastic: 950,
      mushroom: 0,
    } as never)

    const result = await new TroopMovementEstimateQuery().run({
      origin,
      destination,
      troop_codes: [ TroopCode.EXPLORER ],
      player_id,
      resources: {
        plastic: 100,
        mushroom: 0
      },
    })

    expect(result.destination_capacity_exceeded).toBe(true)
  })
})
