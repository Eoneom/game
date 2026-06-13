import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { citySettleHandler } from './settle'
import { citySettle } from '#app/command/city/settle'

vi.mock('#app/command/city/settle')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('citySettleHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        outpost_id: 'o1',
        city_name: 'New City' 
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.mocked(citySettle).mockResolvedValue({ city_id: 'new-city' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when outpost_id is missing', async () => {
    req.body = { city_name: 'New City' }
    await citySettleHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.OUTPOST_ID_NOT_FOUND 
    })
  })

  it('returns 400 when city_name is missing', async () => {
    req.body = { outpost_id: 'o1' }
    await citySettleHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.CITY_NAME_NOT_FOUND 
    })
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('settle error')
    vi.mocked(citySettle).mockRejectedValue(error)
    await citySettleHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns city_id on success', async () => {
    await citySettleHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(citySettle).toHaveBeenCalledWith({
      outpost_id: 'o1',
      player_id: 'p1',
      city_name: 'New City' 
    })
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: { city_id: 'new-city' } 
    })
  })
})
