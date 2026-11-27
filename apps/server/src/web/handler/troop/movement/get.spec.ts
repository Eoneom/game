import { RequestError } from '@eoneom/api-client'
import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { troopGetMovementHandler } from './get'
import { TroopMovementGetQuery } from '#query/troop/movement/get'
import { MovementEntity } from '#core/troop/movement/entity'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementKind } from '#core/troop/constant/movement-kind'
import { CombatStrategy } from '#core/combat/value/combat-strategy'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  movement: MovementEntity.create({
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
    } }),
  arrive_at: 1_744_000_000_000,
  battle_id: null,
  troops: [
    {
      code: 'WARRIOR',
      count: 8
    }
  ]
}

describe('troopGetMovementHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { params: { movement_id: 'm1' } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(TroopMovementGetQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when movement_id is missing', async () => {
    req.params = {}
    await troopGetMovementHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.MOVEMENT_ID_NOT_FOUND
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TroopMovementGetQuery.prototype, 'run').mockRejectedValue(error)
    await troopGetMovementHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns the kind and the strategy of a return trip and an attack (slice 045)', async () => {
    vi.spyOn(TroopMovementGetQuery.prototype, 'run').mockResolvedValue({
      ...queryResult,
      movement: MovementEntity.create({
        id: 'm2',
        player_id: 'p1',
        action: MovementAction.ATTACK,
        origin: {
          x: 0,
          y: 0
        },
        destination: {
          x: 3,
          y: 4
        },
        combat_strategy: CombatStrategy.SIEGE_ASSAULT,
      }),
    } as any)
    await troopGetMovementHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json.mock.calls[0][0].data).toMatchObject({
      kind: MovementKind.OUTGOING,
      combat_strategy: CombatStrategy.SIEGE_ASSAULT,
    })

    vi.spyOn(TroopMovementGetQuery.prototype, 'run').mockResolvedValue({
      ...queryResult,
      movement: MovementEntity.create({
        id: 'm3',
        player_id: 'p1',
        action: MovementAction.BASE,
        origin: {
          x: 3,
          y: 4
        },
        destination: {
          x: 0,
          y: 0
        },
        is_return: true,
      }),
    } as any)
    await troopGetMovementHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json.mock.calls[1][0].data).toMatchObject({
      kind: MovementKind.RETURN,
      combat_strategy: null,
    })
  })

  it('returns movement data on success', async () => {
    await troopGetMovementHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        action: MovementAction.EXPLORE,
        kind: MovementKind.OUTGOING,
        battle_id: null,
        combat_strategy: null,
        origin: {
          x: 0,
          y: 0
        },
        destination: {
          x: 3,
          y: 4
        },
        arrive_at: 1_744_000_000_000,
        resources: {
          plastic: 0,
          mushroom: 0,
          plasma: 0,
          water: 0 },
        troops: [
          {
            code: 'WARRIOR',
            count: 8
          }
        ]
      }
    })
  })
})
