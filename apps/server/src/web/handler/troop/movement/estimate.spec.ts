import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { troopEstimateMovementHandler } from './estimate'
import { TroopMovementEstimateQuery } from '#query/troop/movement/estimate'
import * as helpers from '#web/helpers'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const origin = {
  x: 0,
  y: 0 }
const destination = {
  x: 3,
  y: 4 }
const troop_codes = [ 'WARRIOR' ]

describe('troopEstimateMovementHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        origin,
        destination,
        troop_codes
      }
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(helpers, 'getPlayerIdFromContext').mockReturnValue('p1')
    vi.spyOn(TroopMovementEstimateQuery.prototype, 'run').mockResolvedValue({
      distance: 5,
      speed: 2,
      duration: 150,
      transport_capacity: 200,
      destination_capacity_exceeded: false } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when origin is missing', async () => {
    req.body = {
      destination,
      troop_codes
    }
    await troopEstimateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'origin:not-found'
    })
  })

  it('returns 400 when destination is missing', async () => {
    req.body = {
      origin,
      troop_codes
    }
    await troopEstimateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'destination:not-found'
    })
  })

  it('returns 400 when troop_codes is missing', async () => {
    req.body = {
      origin,
      destination
    }
    await troopEstimateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'troop_codes:not-found'
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(TroopMovementEstimateQuery.prototype, 'run').mockRejectedValue(error)
    await troopEstimateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns estimate data on success', async () => {
    req.body = {
      origin,
      destination,
      troop_codes,
      resources: {
        plastic: 10,
        mushroom: 5,
        plasma: 0
      },
      troops: [
        {
          code: 'WARRIOR',
          count: 1
        }
      ] }
    await troopEstimateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(helpers.getPlayerIdFromContext).toHaveBeenCalledWith(res)
    expect(TroopMovementEstimateQuery.prototype.run).toHaveBeenCalledWith({
      origin,
      destination,
      troop_codes,
      troops: [
        {
          code: 'WARRIOR',
          count: 1
        }
      ],
      player_id: 'p1',
      resources: {
        plastic: 10,
        mushroom: 5,
        plasma: 0
      } })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        distance: 5,
        speed: 2,
        duration: 150,
        transport_capacity: 200,
        destination_capacity_exceeded: false }
    })
  })
})
