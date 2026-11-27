import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { troopMovementCapacityHandler } from './capacity'
import { TroopMovementCapacityQuery } from '#query/troop/movement/capacity'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('troopMovementCapacityHandler', () => {
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
    vi.spyOn(TroopMovementCapacityQuery.prototype, 'run').mockResolvedValue({
      used: 3,
      limit: 7
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns used and limit for the player', async () => {
    await troopMovementCapacityHandler(req as Request, res as unknown as Response, next as NextFunction)

    expect(TroopMovementCapacityQuery.prototype.run).toHaveBeenCalledWith({ player_id: 'p1' })
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        used: 3,
        limit: 7
      }
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TroopMovementCapacityQuery.prototype, 'run').mockRejectedValue(error)

    await troopMovementCapacityHandler(req as Request, res as unknown as Response, next as NextFunction)

    expect(next).toHaveBeenCalledWith(error)
  })
})
