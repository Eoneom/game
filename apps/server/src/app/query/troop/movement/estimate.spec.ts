import { TroopMovementEstimateQuery } from '#app/query/troop/movement/estimate'
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
  let repository: Pick<Repository, 'cell'>

  beforeEach(() => {
    const cell = CellEntity.create({
      id: id(),
      coordinates: origin,
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1 
      }
    })
    repository = { cell: { getCell: vi.fn().mockResolvedValue(cell) } as unknown as Repository['cell'] }
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
      troop_codes
    })

    expect(result.distance).toBe(distance)
    expect(result.speed).toBe(speed)
    expect(result.duration).toBe(duration_ms / 1000)
    expect(repository.cell.getCell).toHaveBeenCalledWith({ coordinates: origin })
    expect(repository.cell.getCell).toHaveBeenCalledWith({ coordinates: destination })
  })
})
