import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { cityListHandler } from './list'
import { CityListQuery } from '#query/city/list'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  cities: [
    {
      id: 'c1',
      name: 'Aliceton' 
    },
    {
      id: 'c2',
      name: 'Bobburg' 
    }
  ],
  cells: [
    {
      coordinates: {
        x: 3,
        y: 4
      }
    },
    {
      coordinates: {
        x: 10,
        y: 12
      }
    }
  ],
  count_limit: 5
}

describe('cityListHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {}
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(CityListQuery.prototype, 'run').mockRejectedValue(error)
    await cityListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls next with error when player_id is not in context', async () => {
    res.locals = {}
    await cityListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('returns city list on success', async () => {
    await cityListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        cities: [
          {
            id: 'c1',
            name: 'Aliceton',
            coordinates: {
              x: 3,
              y: 4
            }
          },
          {
            id: 'c2',
            name: 'Bobburg',
            coordinates: {
              x: 10,
              y: 12
            }
          }
        ],
        count_limit: 5
      }
    })
  })
})
