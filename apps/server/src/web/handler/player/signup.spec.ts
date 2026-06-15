import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { signupHandler } from './signup'
import { signupAuth } from '#command/auth/signup'

vi.mock('#command/auth/signup')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('signupHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        player_name: 'alice',
        city_name: 'Aliceton',
        faction_code: 'the_confederation'
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: {}
    }
    next = vi.fn()
    vi.mocked(signupAuth).mockResolvedValue({
      player_id: 'p1',
      city_id: 'c1' 
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when player_name is missing', async () => {
    req.body = {
      city_name: 'Aliceton',
      faction_code: 'the_confederation'
    }
    await signupHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.PLAYER_NAME_NOT_FOUND 
    })
  })

  it('returns 400 when city_name is missing', async () => {
    req.body = {
      player_name: 'alice',
      faction_code: 'the_confederation'
    }
    await signupHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.CITY_NAME_NOT_FOUND 
    })
  })

  it('returns 400 when faction_code is missing', async () => {
    req.body = {
      player_name: 'alice',
      city_name: 'Aliceton'
    }
    await signupHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.FACTION_CODE_NOT_FOUND
    })
  })

  it('calls next with error when signupAuth throws', async () => {
    const error = new Error('signup error')
    vi.mocked(signupAuth).mockRejectedValue(error)
    await signupHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns player_id and city_id on success', async () => {
    await signupHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(signupAuth).toHaveBeenCalledWith({
      player_name: 'alice',
      city_name: 'Aliceton',
      faction_code: 'the_confederation'
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        player_id: 'p1',
        city_id: 'c1' 
      } 
    })
  })
})
