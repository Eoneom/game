import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { technologyResearchHandler } from './research'
import { researchTechnology } from '#app/command/technology/research'

vi.mock('#app/command/technology/research')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('technologyResearchHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        city_id: 'c1',
        technology_code: 'ARCHERY' 
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(researchTechnology as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.body = { technology_code: 'ARCHERY' }
    await technologyResearchHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.CITY_ID_NOT_FOUND 
    })
  })

  it('returns 400 when technology_code is missing', async () => {
    req.body = { city_id: 'c1' }
    await technologyResearchHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.TECHNOLOGY_CODE_NOT_FOUND 
    })
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('research error')
    ;(researchTechnology as MockInstance).mockRejectedValue(error)
    await technologyResearchHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with correct args and returns ok', async () => {
    await technologyResearchHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(researchTechnology).toHaveBeenCalledWith({
      city_id: 'c1',
      player_id: 'p1',
      technology_code: 'ARCHERY' 
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
