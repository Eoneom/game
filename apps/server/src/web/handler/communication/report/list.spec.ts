import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { communicationListReportHandler } from './list'
import { CommunicationListReportQuery } from '#query/communication/report/list'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const report = {
  id: 'r1',
  type: 'BATTLE',
  recorded_at: '2026-03-31T10:00:00.000Z',
  was_read: false,
  origin: 'origin-coords',
  destination: 'dest-coords'
}

const queryResult = {
  reports: [ report ],
  total: 1 
}

describe('communicationListReportHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { query: {} }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(CommunicationListReportQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(CommunicationListReportQuery.prototype, 'run').mockRejectedValue(error)
    await communicationListReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls next with error when player_id is not in context', async () => {
    res.locals = {}
    await communicationListReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('defaults to page 1 when page query param is absent', async () => {
    req.query = {}
    await communicationListReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(CommunicationListReportQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      page: 1 
    })
  })

  it('parses valid page query param', async () => {
    req.query = { page: '3' }
    await communicationListReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(CommunicationListReportQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      page: 3 
    })
  })

  it('parses was_read=true query param', async () => {
    req.query = { was_read: 'true' }
    await communicationListReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(CommunicationListReportQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      page: 1,
      was_read: true
    })
  })

  it('parses was_read=false query param', async () => {
    req.query = { was_read: 'false' }
    await communicationListReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(CommunicationListReportQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      page: 1,
      was_read: false
    })
  })

  it('ignores invalid was_read query param', async () => {
    req.query = { was_read: 'maybe' }
    await communicationListReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(CommunicationListReportQuery.prototype.run).toHaveBeenCalledWith({
      player_id: 'p1',
      page: 1
    })
  })

  it('returns mapped report list on success', async () => {
    await communicationListReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        reports: [ report ],
        total: 1,
        page_size: 10
      }
    })
  })
})
