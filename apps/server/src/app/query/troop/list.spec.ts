import type { MockInstance } from 'vitest'
import { TroopListQuery } from '#app/query/troop/list'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostError } from '#core/outpost/error'
import { BuildingCode } from '#core/building/constant/code'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { id } from '#shared/identification'

describe('TroopListQuery', () => {
  const player_id = id()
  const other_player_id = id()
  let city: CityEntity
  let cell: CellEntity
  let troop: TroopEntity
  let repository: Pick<Repository, 'city' | 'cell' | 'troop' | 'building' | 'technology' | 'outpost'>

  beforeEach(() => {
    city = CityEntity.initCity({
      name: 'c',
      player_id
    })
    cell = CellEntity.create({
      id: id(),
      coordinates: {
        x: 0,
        y: 0,
        sector: 1 
      },
      type: CellType.FOREST,
      resource_coefficient: {
        plastic: 1,
        mushroom: 1 
      },
      city_id: city.id
    })
    troop = TroopEntity.create({
      id: id(),
      code: TroopCode.EXPLORER,
      count: 2,
      player_id,
      cell_id: cell.id,
      movement_id: null
    })

    repository = {
      city: { get: vi.fn().mockResolvedValue(city) } as unknown as Repository['city'],
      cell: {
        getCityCell: vi.fn().mockResolvedValue(cell),
        getById: vi.fn()
      } as unknown as Repository['cell'],
      troop: { listInCell: vi.fn().mockResolvedValue([ troop ]) } as unknown as Repository['troop'],
      building: { getLevel: vi.fn().mockResolvedValue(1) } as unknown as Repository['building'],
      technology: { getLevel: vi.fn().mockResolvedValue(0) } as unknown as Repository['technology'],
      outpost: {} as unknown as Repository['outpost']
    }
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTroopRecruitProgress: vi.fn().mockResolvedValue(null)
    } as unknown as import('#adapter/job-queue').JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when city is not owned by player', async () => {
    const other_city = CityEntity.initCity({
      name: 'x',
      player_id: other_player_id
    })
    ;(repository.city.get as MockInstance).mockResolvedValue(other_city)

    await expect(new TroopListQuery().run({
      location: {
        type: 'city',
        city_id: other_city.id 
      },
      player_id
    })).rejects.toThrow(CityError.NOT_OWNER)
  })

  it('lists troops for city location', async () => {
    const result = await new TroopListQuery().run({
      location: {
        type: 'city',
        city_id: city.id
      },
      player_id
    })

    expect(result.troops.map(t => t.id)).toContain(troop.id)
    expect(result.costs[TroopCode.EXPLORER]).toBeDefined()
    expect(repository.troop.listInCell).toHaveBeenCalledWith({
      cell_id: cell.id,
      player_id
    })
    expect(repository.building.getLevel).toHaveBeenCalledWith({
      city_id: city.id,
      code: BuildingCode.CLONING_FACTORY
    })
  })

  it('hydrates ongoing recruitment from pending job', async () => {
    const finish_at = 10_000
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTroopRecruitProgress: vi.fn().mockResolvedValue({
        player_id,
        city_id: city.id,
        troop_id: troop.id,
        remaining_count: 3,
        finish_at,
        started_at: 0,
        last_progress: 0,
        execute_at: 5_000,
        job_id: 'job-1'
      })
    } as unknown as import('#adapter/job-queue').JobQueue)

    const result = await new TroopListQuery().run({
      location: {
        type: 'city',
        city_id: city.id
      },
      player_id
    })

    expect(result.pending_recruitment).toEqual({
      troop_id: troop.id,
      finish_at,
      remaining_count: 3,
      last_progress: 0,
      started_at: 0
    })
  })

  it('throws when outpost is not owned by player', async () => {
    const outpost = OutpostEntity.create({
      id: id(),
      player_id: other_player_id,
      cell_id: id(),
      type: OutpostType.TEMPORARY
    })
    repository.outpost = { getById: vi.fn().mockResolvedValue(outpost) } as unknown as Repository['outpost']

    await expect(new TroopListQuery().run({
      location: {
        type: 'outpost',
        outpost_id: outpost.id 
      },
      player_id
    })).rejects.toThrow(OutpostError.NOT_OWNER)
  })

  it('lists troops for outpost location', async () => {
    const outpost = OutpostEntity.create({
      id: id(),
      player_id,
      cell_id: cell.id,
      type: OutpostType.TEMPORARY
    })
    repository.outpost = { getById: vi.fn().mockResolvedValue(outpost) } as unknown as Repository['outpost']
    ;(repository.cell.getById as MockInstance).mockResolvedValue(cell)

    const result = await new TroopListQuery().run({
      location: {
        type: 'outpost',
        outpost_id: outpost.id 
      },
      player_id
    })

    expect(result.troops.map(t => t.id)).toContain(troop.id)
    expect(repository.cell.getById).toHaveBeenCalledWith(outpost.cell_id)
  })
})
