import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { technologyListHandler } from './list'
import { TechnologyListQuery } from '#query/technology/list'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  technologies: [
    {
      id: 't1',
      code: 'ARCHERY',
      level: 2,
    },
    {
      id: 't2',
      code: 'METALLURGY',
      level: 1,
      research_at: 1_700_000_000_000,
      research_started_at: 1_699_993_600_000
    }
  ]
}

describe('technologyListHandler', () => {
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
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockRejectedValue(error)
    await technologyListHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls next with error when player_id is not in context', async () => {
    res.locals = {}
    await technologyListHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('returns technology list on success', async () => {
    await technologyListHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        technologies: [
          {
            id: 't1',
            code: 'ARCHERY',
            level: 2 
          },
          {
            id: 't2',
            code: 'METALLURGY',
            level: 1,
            research_at: 1_700_000_000_000,
            research_started_at: 1_699_993_600_000
          }
        ]
      }
    })
  })
})
