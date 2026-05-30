import type { MockInstance } from 'vitest'
import { OutpostGetQuery } from '#app/query/outpost/get'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { Repository } from '#app/port/repository/generic'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostError } from '#core/outpost/error'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { testResourceStock } from '../../test-support/resource-stock'
import { id } from '#shared/identification'

describe('OutpostGetQuery', () => {
  const player_id = id()
  const other_player_id = id()
  const outpost_id = id()
  const cell_id = id()
  let outpost: OutpostEntity
  let cell: CellEntity
  let stock: ReturnType<typeof testResourceStock>
  let repository: Pick<Repository, 'outpost' | 'cell' | 'resource_stock'>

  const production = {
    earnings_per_second: {
      plastic: 0.5,
      mushroom: 0.3
    },
    pre_cell_earnings_per_second: {
      plastic: 0.6,
      mushroom: 0.4
    },
    cell_resource_coefficient: {
      plastic: 0.85,
      mushroom: 1.1
    }
  }

  beforeEach(() => {
    outpost = OutpostEntity.create({
      id: outpost_id,
      player_id,
      cell_id,
      type: OutpostType.TEMPORARY
    })
    stock = testResourceStock({
      cell_id,
      plastic: 10,
      mushroom: 20
    })
    cell = CellEntity.create({
      id: cell_id,
      coordinates: {
        x: 0,
        y: 0,
        sector: 1
      },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 0.85,
        mushroom: 1.1
      }
    })
    repository = {
      outpost: { getById: vi.fn().mockResolvedValue(outpost) } as unknown as Repository['outpost'],
      cell: { getById: vi.fn().mockResolvedValue(cell) } as unknown as Repository['cell'],
      resource_stock: { getByCellId: vi.fn().mockResolvedValue(stock) } as unknown as Repository['resource_stock']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(AppService, 'getOutpostProductionBreakdown').mockResolvedValue(production)
    vi.spyOn(AppService, 'getOutpostWarehousesCapacity').mockResolvedValue({
      plastic: 2000,
      mushroom: 1500
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when outpost is not owned by player', async () => {
    const other = OutpostEntity.create({
      ...outpost,
      player_id: other_player_id
    })
    ;(repository.outpost.getById as MockInstance).mockResolvedValue(other)

    await expect(new OutpostGetQuery().run({
      player_id,
      outpost_id
    })).rejects.toThrow(OutpostError.NOT_OWNER)
  })

  it('returns outpost, cell and production for temporary without simulating gather', async () => {
    const result = await new OutpostGetQuery().run({
      player_id,
      outpost_id
    })

    expect(result.outpost).toBe(outpost)
    expect(result.cell).toBe(cell)
    expect(result.resource_stock).toBe(stock)
    expect(result.earnings_per_second).toEqual(production.earnings_per_second)
    expect(result.pre_cell_earnings_per_second).toEqual(production.pre_cell_earnings_per_second)
    expect(result.cell_resource_coefficient).toEqual(production.cell_resource_coefficient)
    expect(result.warehouses_capacity).toEqual({
      plastic: 2000,
      mushroom: 1500
    })
    expect(result.warehouse_full_in_seconds).toEqual({
      plastic: (2000 - 10) / 0.5,
      mushroom: (1500 - 20) / 0.3
    })
    expect(repository.cell.getById).toHaveBeenCalledWith(outpost.cell_id)
  })

  it('simulates gather for permanent outposts', async () => {
    const permanent = OutpostEntity.create({
      id: outpost_id,
      player_id,
      cell_id,
      type: OutpostType.PERMANENT
    })
    ;(repository.outpost.getById as MockInstance).mockResolvedValue(permanent)

    const seeded = testResourceStock({
      cell_id,
      plastic: 10,
      mushroom: 20,
      last_plastic_gather: 0,
      last_mushroom_gather: 0
    })
    repository.resource_stock.getByCellId = vi.fn().mockResolvedValue(seeded)

    vi.spyOn(AppService, 'getOutpostProductionBreakdown').mockResolvedValue({
      ...production,
      earnings_per_second: {
        plastic: 1,
        mushroom: 2
      }
    })

    const result = await new OutpostGetQuery().run({
      player_id,
      outpost_id
    })

    expect(result.resource_stock.plastic).toBeGreaterThanOrEqual(10)
    expect(result.resource_stock.mushroom).toBeGreaterThanOrEqual(20)
  })
})
