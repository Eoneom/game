import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { troopRecruitHandler } from './recruit'
import { recruitTroop } from '#app/command/troop/recruit'

vi.mock('#app/command/troop/recruit')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('troopRecruitHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        city_id: 'c1',
        count: 10,
        troop_code: 'WARRIOR' 
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(recruitTroop as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.body = {
      count: 10,
      troop_code: 'WARRIOR' 
    }
    await troopRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'city_id:not-found' 
    })
  })

  it('returns 400 when count is missing', async () => {
    req.body = {
      city_id: 'c1',
      troop_code: 'WARRIOR' 
    }
    await troopRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'count:not-found' 
    })
  })

  it('returns 400 when troop_code is missing', async () => {
    req.body = {
      city_id: 'c1',
      count: 10 
    }
    await troopRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'troop_code:not-found' 
    })
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('recruit error')
    ;(recruitTroop as MockInstance).mockRejectedValue(error)
    await troopRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with correct args and returns ok', async () => {
    await troopRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(recruitTroop).toHaveBeenCalledWith({
      city_id: 'c1',
      count: 10,
      player_id: 'p1',
      troop_code: 'WARRIOR' 
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
