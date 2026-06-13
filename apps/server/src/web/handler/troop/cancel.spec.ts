import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { troopCancelHandler } from './cancel'
import { cancelTroop } from '#app/command/troop/cancel'

vi.mock('#app/command/troop/cancel')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('troopCancelHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { body: { city_id: 'c1' } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(cancelTroop as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.body = {}
    await troopCancelHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND 
    })
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('cancel error')
    ;(cancelTroop as MockInstance).mockRejectedValue(error)
    await troopCancelHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with correct args and returns ok', async () => {
    await troopCancelHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(cancelTroop).toHaveBeenCalledWith({
      player_id: 'p1',
      city_id: 'c1' 
    })
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
