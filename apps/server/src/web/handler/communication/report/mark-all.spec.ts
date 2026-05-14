import {
  vi, type MockInstance 
} from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { communicationMarkAllReportsHandler } from './mark-all'
import { markAllCommunicationReports } from '#app/command/communication/report/mark-all'

vi.mock('#app/command/communication/report/mark-all')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('communicationMarkAllReportsHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = {}
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    ;(markAllCommunicationReports as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('mark-all error')
    ;(markAllCommunicationReports as MockInstance).mockRejectedValue(error)
    await communicationMarkAllReportsHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with correct args and returns ok', async () => {
    await communicationMarkAllReportsHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(markAllCommunicationReports).toHaveBeenCalledWith({
      player_id: 'p1',
    })
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
