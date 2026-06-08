import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { buildingGetHandler } from './get'
import { BuildingGetQuery } from '#query/building/get'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  building: {
    code: 'SAWMILL',
    level: 1
  },
  cost: {
    resource: {
      plastic: 100,
      mushroom: 50,
      plasma: 0
    },
    duration: 3600
  },
  requirement: {
    buildings: [],
    technologies: []
  },
  metadata: { name: 'Sawmill' },
  upgrade_at: undefined,
  upgrade_started_at: undefined
}

describe('buildingGetHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      params: {
        city_id: 'c1',
        building_code: 'SAWMILL' 
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(BuildingGetQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.params = { building_code: 'SAWMILL' }
    await buildingGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'city_id:not-found' 
    })
  })

  it('returns 400 when building_code is missing', async () => {
    req.params = { city_id: 'c1' }
    await buildingGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'building_code:not-found' 
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(BuildingGetQuery.prototype, 'run').mockRejectedValue(error)
    await buildingGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns building data on success', async () => {
    await buildingGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        code: 'SAWMILL',
        level: 1,
        upgrade_cost: {
          plastic: 100,
          mushroom: 50,
          duration: 3600 
        },
        requirement: {
          buildings: [],
          technologies: [] 
        },
        metadata: { name: 'Sawmill' }
      }
    })
  })
})
