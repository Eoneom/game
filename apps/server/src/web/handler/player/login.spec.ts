import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { loginHandler } from './login'
import { loginAuth } from '#command/auth/login'

vi.mock('#command/auth/login')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('loginHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { body: { player_name: 'alice' } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: {}
    }
    next = vi.fn()
    vi.mocked(loginAuth).mockResolvedValue({ token: 'tok123' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when player_name is missing', async () => {
    req.body = {}
    await loginHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.PLAYER_NAME_NOT_FOUND 
    })
  })

  it('calls next with error when loginAuth throws', async () => {
    const error = new Error('auth error')
    vi.mocked(loginAuth).mockRejectedValue(error)
    await loginHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns token on success', async () => {
    await loginHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({
      status: 'ok',
      data: { token: 'tok123' } 
    })
  })
})
