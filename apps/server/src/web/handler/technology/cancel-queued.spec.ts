import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance
} from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { technologyCancelQueuedHandler } from './cancel-queued'
import { cancelQueuedTechnologyResearch } from '#command/technology/cancel-queued'

vi.mock('#command/technology/cancel-queued')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('technologyCancelQueuedHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { body: { queue_item_id: 'q1' } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(cancelQueuedTechnologyResearch as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when queue_item_id is missing', async () => {
    req.body = {}
    await technologyCancelQueuedHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.QUEUE_ITEM_ID_NOT_FOUND
    })
  })

  it('returns ok on success', async () => {
    await technologyCancelQueuedHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(cancelQueuedTechnologyResearch).toHaveBeenCalledWith({
      player_id: 'p1',
      queue_item_id: 'q1'
    })
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
