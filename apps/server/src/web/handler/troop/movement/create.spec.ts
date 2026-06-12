import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { troopCreateMovementHandler } from './create'
import { createTroopMovement } from '#app/command/troop/movement/create'

vi.mock('#app/command/troop/movement/create')

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
  x: 1,
  y: 1 }
const troops = { WARRIOR: 5 }

describe('troopCreateMovementHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        origin,
        destination,
        troops,
        action: 'ATTACK' 
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.mocked(createTroopMovement).mockResolvedValue({ deleted_outpost_id: undefined })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when origin is missing', async () => {
    req.body = {
      destination,
      troops,
      action: 'ATTACK' 
    }
    await troopCreateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'origin:not-found' 
    })
  })

  it('returns 400 when destination is missing', async () => {
    req.body = {
      origin,
      troops,
      action: 'ATTACK' 
    }
    await troopCreateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'destination:not-found' 
    })
  })

  it('returns 400 when troops is missing', async () => {
    req.body = {
      origin,
      destination,
      action: 'ATTACK' 
    }
    await troopCreateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'troops:not-found' 
    })
  })

  it('returns 400 when action is missing', async () => {
    req.body = {
      origin,
      destination,
      troops 
    }
    await troopCreateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'action:not-found' 
    })
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('movement error')
    vi.mocked(createTroopMovement).mockRejectedValue(error)
    await troopCreateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with correct args and returns ok', async () => {
    await troopCreateMovementHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(createTroopMovement).toHaveBeenCalledWith({
      player_id: 'p1',
      action: 'ATTACK',
      origin,
      destination,
      move_troops: troops
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: { deleted_outpost_id: undefined } 
    })
  })
})
