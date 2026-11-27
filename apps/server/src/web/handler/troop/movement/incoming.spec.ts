import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { troopListIncomingMovementHandler } from './incoming'
import { TroopMovementIncomingQuery } from '#query/troop/movement/incoming'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { TroopCode } from '#core/troop/constant/code'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('troopListIncomingMovementHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance
  const target = {
    kind: BattleTargetKind.OUTPOST,
    id: 'outpost-id',
    name: null,
    coordinates: {
      x: 1,
      y: 2 
    },
  }

  beforeEach(() => {
    req = {}
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(TroopMovementIncomingQuery.prototype, 'run').mockResolvedValue({
      movements: [
        {
          id: 'm1',
          target,
          arrive_at: 1_000,
        },
        {
          id: 'm2',
          target,
          arrive_at: 2_000,
          origin: {
            x: 9,
            y: 9
          },
          departure_at: 500,
          unit_count: 30,
          troops: [
            {
              code: TroopCode.LEGIONNAIRE,
              count: 27 
            } 
          ],
        },
      ]
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns only the fields revealed by detection', async () => {
    await troopListIncomingMovementHandler(req as Request, res as unknown as Response, next as NextFunction)

    expect(TroopMovementIncomingQuery.prototype.run).toHaveBeenCalledWith({ player_id: 'p1' })
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        movements: [
          {
            id: 'm1',
            target,
            arrive_at: 1_000,
          },
          {
            id: 'm2',
            target,
            arrive_at: 2_000,
            // From detection 2 (slice 044).
            origin: {
              x: 9,
              y: 9
            },
            departure_at: 500,
            unit_count: 30,
            troops: [
              {
                code: TroopCode.LEGIONNAIRE,
                count: 27 
              } 
            ],
          },
        ]
      }
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TroopMovementIncomingQuery.prototype, 'run').mockRejectedValue(error)

    await troopListIncomingMovementHandler(req as Request, res as unknown as Response, next as NextFunction)

    expect(next).toHaveBeenCalledWith(error)
  })
})
