import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { outpostGetHandler } from './get'
import { OutpostGetQuery } from '#query/outpost/get'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  outpost: {
    id: 'o1',
    type: 'permanent'
  },
  cell: {
    coordinates: {
      x: 3,
      y: 5,
      sector: 1
    }
  },
  resource_stock: {
    plastic: 150,
    mushroom: 75
  },
  earnings_per_second: {
    plastic: 0.12,
    mushroom: 0.1
  },
  pre_cell_earnings_per_second: {
    plastic: 0.12,
    mushroom: 0.1
  },
  cell_resource_coefficient: {
    plastic: 1,
    mushroom: 1
  }
}

describe('outpostGetHandler', () => {
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
    vi.spyOn(OutpostGetQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when outpost_id is missing', async () => {
    req.params = {}
    await outpostGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'outpost_id:not-found'
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(OutpostGetQuery.prototype, 'run').mockRejectedValue(error)
    await outpostGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns outpost data on success', async () => {
    await outpostGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        id: 'o1',
        coordinates: {
          x: 3,
          y: 5,
          sector: 1
        },
        type: 'permanent',
        plastic: 150,
        mushroom: 75,
        earnings_per_second: {
          plastic: 0.12,
          mushroom: 0.1
        },
        pre_cell_earnings_per_second: {
          plastic: 0.12,
          mushroom: 0.1
        },
        cell_resource_coefficient: {
          plastic: 1,
          mushroom: 1
        }
      }
    })
  })
})
