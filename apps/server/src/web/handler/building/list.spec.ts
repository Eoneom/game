import { RequestError } from '@eoneom/api-client'
import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { buildingListHandler } from './list'
import { BuildingListQuery } from '#query/building/list'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryData = {
  buildings: [
    {
      code: 'SAWMILL',
      level: 1
    }
  ],
  upgrade_queue: []
}

describe('buildingListHandler', () => {
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
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue(queryData as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.params = {}
    await buildingListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND 
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(BuildingListQuery.prototype, 'run').mockRejectedValue(error)
    await buildingListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns building list on success', async () => {
    await buildingListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: queryData 
    })
  })
})
