import { RequestError } from '@eoneom/api-client'
import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { troopListOutpostHandler } from './outpost'
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
      id: 't2',
      code: 'ARCHER',
      count: 3,
    }
  ],
  costs: { ARCHER: { duration: 90 } },
  pending_recruitment: null
}

describe('troopListOutpostHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { params: { outpost_id: 'o1' } }
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

  it('returns 400 when outpost_id is missing', async () => {
    req.params = {}
    await troopListOutpostHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.OUTPOST_ID_NOT_FOUND 
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TroopListQuery.prototype, 'run').mockRejectedValue(error)
    await troopListOutpostHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls query with outpost location and returns mapped troops', async () => {
    await troopListOutpostHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(TroopListQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      location: {
        type: 'outpost',
        outpost_id: 'o1' 
      }
    })
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        troops: [
          {
            id: 't2',
            code: 'ARCHER',
            count: 3,
            ongoing_recruitment: undefined
          }
        ]
      }
    })
  })
})
