import { RequestError } from '@eoneom/api-client'
import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { troopListCityHandler } from './city'
import { TroopListQuery } from '#query/troop/list'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  troops: [
    {
      id: 't1',
      code: 'WARRIOR',
      count: 5,
    }
  ],
  costs: { WARRIOR: { duration: 120 } },
  pending_recruitment: null
}

describe('troopListCityHandler', () => {
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
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.params = {}
    await troopListCityHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND 
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TroopListQuery.prototype, 'run').mockRejectedValue(error)
    await troopListCityHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls query with city location and returns mapped troops', async () => {
    await troopListCityHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(TroopListQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      location: {
        type: 'city',
        city_id: 'c1' 
      }
    })
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        troops: [
          {
            id: 't1',
            code: 'WARRIOR',
            count: 5,
            ongoing_recruitment: undefined
          }
        ]
      }
    })
  })
})
