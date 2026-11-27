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

const requirement = {
  buildings: [
    {
      code: 'research_lab',
      level: 2
    }
  ],
  technologies: []
}

const queryData = {
  buildings: [
    {
      id: 'b1',
      code: 'SAWMILL',
      level: 1,
      upgrade_cost: {
        code: 'SAWMILL',
        level: 2,
        resource: {
          plastic: 10,
          mushroom: 20,
          plasma: 3,
          water: 0
        },
        duration: 60
      },
      requirement
    },
    {
      id: 'b2',
      code: 'MINE',
      level: 4,
      upgrade_cost: {
        code: 'MINE',
        level: 5,
        resource: {
          plastic: 1,
          mushroom: 2,
          plasma: 0,
          water: 0
        },
        duration: 30
      },
      requirement,
      upgrade_at: 2_000,
      upgrade_started_at: 1_000
    }
  ],
  upgrade_queue: [
    {
      id: 'q1',
      building_code: 'MINE',
      duration_seconds: 40,
      start_at: 2_000,
      finish_at: 42_000
    }
  ]
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

  it('returns building list on success with cost, requirement and queue timing', async () => {
    await buildingListHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        buildings: [
          {
            id: 'b1',
            code: 'SAWMILL',
            level: 1,
            upgrade_cost: {
              plastic: 10,
              mushroom: 20,
              plasma: 3,
              duration: 60
            },
            requirement
          },
          {
            id: 'b2',
            code: 'MINE',
            level: 4,
            upgrade_cost: {
              plastic: 1,
              mushroom: 2,
              plasma: 0,
              duration: 30
            },
            requirement,
            upgrade_at: 2_000,
            upgrade_started_at: 1_000
          }
        ],
        upgrade_queue: [
          {
            id: 'q1',
            building_code: 'MINE',
            duration_seconds: 40,
            start_at: 2_000,
            finish_at: 42_000
          }
        ]
      }
    })
    const [ [ body ] ] = res.json.mock.calls
    expect(body.data.buildings[0]).not.toHaveProperty('upgrade_at')
  })
})
