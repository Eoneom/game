import type {
  NextFunction, Request, Response
} from 'express'
import { createErrorMiddleware } from './error'
import { CommunicationError } from '#core/communication/error'

describe('createErrorMiddleware', () => {
  const run = (error_code: string) => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    const log = { error: vi.fn() }
    createErrorMiddleware(log as never)(new Error(error_code), {} as Request, res as unknown as Response, vi.fn() as NextFunction)
    return res
  }

  it('answers rate-limited errors with HTTP 429', () => {
    const res = run(CommunicationError.RATE_LIMITED)

    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: CommunicationError.RATE_LIMITED
    })
  })

  it('keeps HTTP 200 for other domain errors', () => {
    const res = run(CommunicationError.BODY_INVALID)

    expect(res.status).toHaveBeenCalledWith(200)
  })
})
