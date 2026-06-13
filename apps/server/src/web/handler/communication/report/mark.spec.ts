import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { communicationMarkReportHandler } from './mark'
import { markCommunicationReport } from '#app/command/communication/report/mark'

vi.mock('#app/command/communication/report/mark')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('communicationMarkReportHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {
      body: {
        report_id: 'r1',
        was_read: true 
      } 
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(markCommunicationReport as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when report_id is missing', async () => {
    req.body = { was_read: true }
    await communicationMarkReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.REPORT_ID_NOT_FOUND 
    })
  })

  it('returns 400 when was_read is undefined', async () => {
    req.body = {
      report_id: 'r1',
      was_read: undefined 
    }
    await communicationMarkReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.WAS_READ_NOT_FOUND 
    })
  })

  it('returns 400 when was_read is null', async () => {
    req.body = {
      report_id: 'r1',
      was_read: null 
    }
    await communicationMarkReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.WAS_READ_NOT_FOUND 
    })
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('mark error')
    ;(markCommunicationReport as MockInstance).mockRejectedValue(error)
    await communicationMarkReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with correct args and returns ok', async () => {
    await communicationMarkReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(markCommunicationReport).toHaveBeenCalledWith({
      player_id: 'p1',
      report_id: 'r1',
      was_read: true 
    })
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
