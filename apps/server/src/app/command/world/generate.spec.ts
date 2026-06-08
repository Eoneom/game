import type { MockInstance } from 'vitest'
import { generateWorld } from './generate'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CellEntity } from '#core/world/cell/entity'
import { WorldError } from '#core/world/error'
import { WorldService } from '#core/world/service'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'

describe('generateWorld', () => {
  const cell_id = id()
  const persisted_cell_id = id()
  const cell = CellEntity.create({
    id: cell_id,
    coordinates: {
      x: 1,
      y: 1,
      sector: 1 
    },
    type: CellType.FOREST,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1 ,
      plasma: 0
    },
    solar_coefficient: 1
  })

  let isInitialized: MockInstance
  let cellCreate: MockInstance
  let stockCreate: MockInstance
  let repository: Pick<Repository, 'cell' | 'resource_stock'>

  beforeEach(() => {
    isInitialized = vi.fn()
    cellCreate = vi.fn().mockResolvedValue(persisted_cell_id)
    stockCreate = vi.fn().mockResolvedValue(undefined)
    repository = {
      cell: {
        isInitialized,
        create: cellCreate
      } as unknown as Repository['cell'],
      resource_stock: { create: stockCreate } as unknown as Repository['resource_stock']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(WorldService, 'generate').mockReturnValue([ cell ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when the world is already initialized', async () => {
    isInitialized.mockResolvedValue(true)

    await expect(generateWorld()).rejects.toThrow(WorldError.ALREADY_EXISTS)
    expect(cellCreate).not.toHaveBeenCalled()
    expect(isInitialized).toHaveBeenCalledTimes(1)
  })

  it('creates each cell and matching stock when the world is not initialized', async () => {
    isInitialized.mockResolvedValue(false)

    await generateWorld()

    expect(isInitialized).toHaveBeenCalledTimes(1)
    expect(cellCreate).toHaveBeenCalledTimes(1)
    expect(cellCreate).toHaveBeenCalledWith(cell)
    expect(stockCreate).toHaveBeenCalledTimes(1)
    const stock_arg = stockCreate.mock.calls[0][0]
    expect(stock_arg.cell_id).toBe(persisted_cell_id)
  })
})
