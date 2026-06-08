import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { outpostListHandler } from './list'
import { OutpostListQuery } from '#query/outpost/list'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  outposts: [
    {
      id: 'o1',
      type: 'STANDARD',
      cell_id: 'cell1' 
    } 
  ],
  cells: [
    {
      id: 'cell1',
      coordinates: {
        x: 2,
        y: 4,
        sector: 0 
      } 
    } 
  ],
  resource_stocks: [
    {
      cell_id: 'cell1',
      plastic: 200,
      mushroom: 100 ,
      plasma: 0
    } 
  ],
  count_limit: 15
}

describe('outpostListHandler', () => {
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
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(OutpostListQuery.prototype, 'run').mockRejectedValue(error)
    await outpostListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls next with error when player_id is not in context', async () => {
    res.locals = {}
    await outpostListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('returns mapped outpost list on success', async () => {
    await outpostListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        outposts: [
          {
            id: 'o1',
            coordinates: {
              x: 2,
              y: 4,
              sector: 0 
            },
            type: 'STANDARD',
            plastic: 200,
            mushroom: 100,
            plasma: 0
          }
        ],
        count_limit: 15
      }
    })
  })
})
