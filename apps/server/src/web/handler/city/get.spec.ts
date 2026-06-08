import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { cityGetHandler } from './get'
import { CityGetQuery } from '#query/city/get'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  city: {
    id: 'c1',
    name: 'Aliceton' 
  },
  maximum_building_levels: 10,
  building_levels_used: 3,
  earnings_per_second: {
    plastic: 1.5,
    mushroom: 2.0 ,
    plasma: 0
  },
  pre_cell_earnings_per_second: {
    plastic: 1.0,
    mushroom: 1.5 ,
    plasma: 0
  },
  cell_resource_coefficient: {
    plastic: 1.2,
    mushroom: 1.0 ,
    plasma: 0
  },
  cell: {
    coordinates: {
      x: 1,
      y: 2,
      sector: 0 
    } 
  },
  resource_stock: {
    plastic: 500,
    mushroom: 300 ,
    plasma: 0
  },
  warehouses_capacity: {
    plastic: 2000,
    mushroom: 2000
  },
  warehouse_space_remaining: {
    plastic: 1500,
    mushroom: 1700
  },
  warehouse_full_in_seconds: {
    plastic: 1000,
    mushroom: 850
  },
  energy: 15,
  pre_cell_energy: 15,
  neutral_photovoltaic_energy: 15,
  cell_solar_coefficient: 1,
  photovoltaic_optimization_level: 0,
  energy_consumption: 4,
  production_energy_ratio: 1
}

describe('cityGetHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { params: { city_id: 'c1' } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.params = {}
    await cityGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'city_id:not-found' 
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(CityGetQuery.prototype, 'run').mockRejectedValue(error)
    await cityGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns city data on success', async () => {
    await cityGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        id: 'c1',
        name: 'Aliceton',
        plastic: 500,
        mushroom: 300,
        plasma: 0,
        maximum_building_levels: 10,
        building_levels_used: 3,
        earnings_per_second: {
          plastic: 1.5,
          mushroom: 2.0 ,
          plasma: 0
        },
        pre_cell_earnings_per_second: {
          plastic: 1.0,
          mushroom: 1.5 ,
          plasma: 0
        },
        cell_resource_coefficient: {
          plastic: 1.2,
          mushroom: 1.0
        },
        warehouses_capacity: {
          plastic: 2000,
          mushroom: 2000
        },
        warehouse_space_remaining: {
          plastic: 1500,
          mushroom: 1700
        },
        warehouse_full_in_seconds: {
          plastic: 1000,
          mushroom: 850
        },
        energy: 15,
        pre_cell_energy: 15,
        neutral_photovoltaic_energy: 15,
        cell_solar_coefficient: 1,
        photovoltaic_optimization_level: 0,
        energy_consumption: 4,
        production_energy_ratio: 1,
        coordinates: {
          x: 1,
          y: 2,
          sector: 0 
        }
      }
    })
  })
})
