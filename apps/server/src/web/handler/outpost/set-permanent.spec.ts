import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { outpostSetPermanentHandler } from './set-permanent'
import { outpostSetPermanent } from '#app/command/outpost/set-permanent'

vi.mock('#app/command/outpost/set-permanent')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('outpostSetPermanentHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { body: { outpost_id: 'o1' } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(outpostSetPermanent as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when outpost_id is missing', async () => {
    req.body = {}
    await outpostSetPermanentHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.OUTPOST_ID_NOT_FOUND 
    })
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('command error')
    ;(outpostSetPermanent as MockInstance).mockRejectedValue(error)
    await outpostSetPermanentHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with correct args and returns ok', async () => {
    await outpostSetPermanentHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(outpostSetPermanent).toHaveBeenCalledWith({
      outpost_id: 'o1',
      player_id: 'p1' 
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
