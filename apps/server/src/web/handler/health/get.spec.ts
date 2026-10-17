import { vi } from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { healthGetHandler } from './get'

type MockRes = {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

describe('healthGetHandler', () => {
  let res: MockRes
  const next = vi.fn()

  beforeEach(() => {
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
  })

  it('returns 200 with status ok', () => {
    healthGetHandler(
      {} as Request,
      res as unknown as Response,
      next as NextFunction
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
    expect(next).not.toHaveBeenCalled()
  })
})
