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

const requirement = {
  buildings: [
    {
      code: 'research_lab',
      level: 3
    }
  ],
  technologies: []
}

const queryResult = {
  research_queue: [],
  technologies: [
    {
      id: 't1',
      code: 'ARCHERY',
      level: 2,
      requirement,
      research_cost: {
        code: 'ARCHERY',
        level: 3,
        resource: {
          plastic: 100,
          mushroom: 50,
          plasma: 5,
          water: 0
        },
        duration: 600
      }
    },
    {
      id: 't2',
      code: 'METALLURGY',
      level: 1,
      requirement,
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
    req = { query: {} }
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

  it('passes city_id from the query string', async () => {
    req = { query: { city_id: 'c1' } }
    await technologyListHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(TechnologyListQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      city_id: 'c1'
    })
  })

  it('omits city_id when absent', async () => {
    req = { query: {} }
    await technologyListHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(TechnologyListQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      city_id: undefined
    })
  })

  it('returns technology list on success', async () => {
    await technologyListHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        research_queue: [],
        technologies: [
          {
            id: 't1',
            code: 'ARCHERY',
            level: 2,
            requirement,
            research_cost: {
              plastic: 100,
              mushroom: 50,
              plasma: 5,
              duration: 600
            }
          },
          {
            id: 't2',
            code: 'METALLURGY',
            level: 1,
            requirement,
            research_at: 1_700_000_000_000,
            research_started_at: 1_699_993_600_000
          }
        ]
      }
    })
    const [ [ body ] ] = res.json.mock.calls
    expect(body.data.technologies[1]).not.toHaveProperty('research_cost')
  })
})
