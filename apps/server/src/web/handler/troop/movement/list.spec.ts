import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { troopListMovementHandler } from './list'
import { TroopMovementListQuery } from '#query/troop/movement/list'
import { MovementEntity } from '#core/troop/movement/entity'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementKind } from '#core/troop/constant/movement-kind'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'

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
    x: 0,
    y: 0
  },
  destination: {
    x: 3,
    y: 4
  } 
})

const queryResult = {
  movements: [
    {
      movement,
      arrive_at: 1_744_000_000_000,
      battle_id: null,
      troops: [
        TroopEntity.create({
          id: 't1',
          code: TroopCode.EXPLORER,
          count: 2,
          player_id: 'p1',
          cell_id: null,
          movement_id: 'm1',
        }),
      ] 
    },
    {
      movement: MovementEntity.create({
        id: 'm2',
        player_id: 'p1',
        action: MovementAction.BASE,
        origin: {
          x: 5,
          y: 5
        },
        destination: {
          x: 1,
          y: 1
        },
        exchange_trade_id: 'trade-1',
        is_return: true,
      }),
      arrive_at: 1_744_000_100_000,
      battle_id: null,
      troops: [] 
    },
    {
      movement: MovementEntity.create({
        id: 'm3',
        player_id: 'p1',
        action: MovementAction.ATTACK,
        origin: {
          x: 0,
          y: 0
        },
        destination: {
          x: 2,
          y: 2
        },
      }),
      arrive_at: 1_743_999_000_000,
      battle_id: 'b1',
      troops: [] 
    },
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
            kind: MovementKind.OUTGOING,
            origin: {
              x: 0,
              y: 0
            },
            destination: {
              x: 3,
              y: 4
            },
            arrive_at: 1_744_000_000_000,
            battle_id: null,
            resources: {
              plastic: 0,
              mushroom: 0,
              plasma: 0,
              water: 0 
            },
            troops: [
              {
                code: TroopCode.EXPLORER,
                count: 2
              }
            ] 
          },
          expect.objectContaining({
            id: 'm2',
            kind: MovementKind.CONVOY,
            battle_id: null,
            troops: [],
          }),
          expect.objectContaining({
            id: 'm3',
            kind: MovementKind.OUTGOING,
            battle_id: 'b1',
          }),
        ]
      }
    })
  })
})
