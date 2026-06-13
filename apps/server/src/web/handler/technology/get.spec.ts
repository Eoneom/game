import { RequestError } from '@eoneom/api-client'
import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { technologyGetHandler } from './get'
import { TechnologyGetQuery } from '#query/technology/get'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  technology: {
    id: 't1',
    code: 'ARCHERY',
    level: 2,
  },
  cost: {
    resource: {
      plastic: 200,
      mushroom: 100 ,
      plasma: 0
    },
    duration: 7200 
  },
  requirement: {
    buildings: [],
    technologies: [] 
  }
}

describe('technologyGetHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      params: {
        city_id: 'c1',
        technology_code: 'ARCHERY' 
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(TechnologyGetQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.params = { technology_code: 'ARCHERY' }
    await technologyGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND 
    })
  })

  it('returns 400 when technology_code is missing', async () => {
    req.params = { city_id: 'c1' }
    await technologyGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.TECHNOLOGY_CODE_NOT_FOUND 
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TechnologyGetQuery.prototype, 'run').mockRejectedValue(error)
    await technologyGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns technology data on success', async () => {
    await technologyGetHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        id: 't1',
        code: 'ARCHERY',
        level: 2,
        research_cost: {
          plastic: 200,
          mushroom: 100,
          duration: 7200 
        },
        requirement: {
          buildings: [],
          technologies: [] 
        }
      }
    })
  })
})
