import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { troopListMovementHandler } from './list'
import { TroopMovementListQuery } from '#query/troop/movement/list'
import { MovementEntity } from '#core/troop/movement/entity'
import { MovementAction } from '#core/troop/constant/movement-action'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const movement = MovementEntity.create({
  id: 'm1',
  player_id: 'p1',
  action: MovementAction.EXPLORE,
  origin: {
    sector: 0,
    x: 0,
    y: 0
  },
  destination: {
    sector: 0,
    x: 3,
    y: 4
  },
})

const queryResult = {
  movements: [
    {
      movement,
      arrive_at: 1_744_000_000_000,
    }
  ]
}

describe('troopListMovementHandler', () => {
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
    vi.spyOn(TroopMovementListQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TroopMovementListQuery.prototype, 'run').mockRejectedValue(error)
    await troopListMovementHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls next with error when player_id is not in context', async () => {
    res.locals = {}
    await troopListMovementHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('returns mapped movement list on success', async () => {
    await troopListMovementHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        movements: [
          {
            id: 'm1',
            action: MovementAction.EXPLORE,
            origin: {
              sector: 0,
              x: 0,
              y: 0
            },
            destination: {
              sector: 0,
              x: 3,
              y: 4
            },
            arrive_at: 1_744_000_000_000,
            resources: {
              plastic: 0,
              mushroom: 0,
            },
          }
        ]
      }
    })
  })
})
