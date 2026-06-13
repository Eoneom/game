import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance
} from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { buildingCancelQueuedHandler } from './cancel-queued'
import { cancelQueuedBuildingUpgrade } from '#command/building/cancel-queued'

vi.mock('#command/building/cancel-queued')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('buildingCancelQueuedHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        city_id: 'c1',
        queue_item_id: 'q1'
      }
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(cancelQueuedBuildingUpgrade as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.body = { queue_item_id: 'q1' }
    await buildingCancelQueuedHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND
    })
  })

  it('returns 400 when queue_item_id is missing', async () => {
    req.body = { city_id: 'c1' }
    await buildingCancelQueuedHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.QUEUE_ITEM_ID_NOT_FOUND
    })
  })

  it('calls next with error when cancelQueuedBuildingUpgrade throws', async () => {
    const error = new Error('cancel error')
    ;(cancelQueuedBuildingUpgrade as MockInstance).mockRejectedValue(error)
    await buildingCancelQueuedHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns ok on success', async () => {
    await buildingCancelQueuedHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(cancelQueuedBuildingUpgrade).toHaveBeenCalledWith({
      player_id: 'p1',
      city_id: 'c1',
      queue_item_id: 'q1'
    })
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
