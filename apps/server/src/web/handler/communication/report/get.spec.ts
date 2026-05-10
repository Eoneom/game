import type { MockInstance } from 'vitest'
import {
  Request, Response, NextFunction 
} from 'express'
import { communicationGetReportHandler } from './get'
import { CommunicationGetReportQuery } from '#query/communication/report/get'

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

const queryResult = {
  report: {
    id: 'r1',
    type: 'BATTLE',
    destination: 'dest-coords',
    origin: 'origin-coords',
    recorded_at: '2026-03-31T10:00:00.000Z',
    was_read: false,
    troops: [
      {
        code: 'WARRIOR',
        count: 5 
      } 
    ],
    resources: {
      plastic: 100,
      mushroom: 50,
    },
    remaining_resources: {
      plastic: 25,
      mushroom: 0,
    },
  }
}

describe('communicationGetReportHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance

  beforeEach(() => {
    req = { params: { report_id: 'r1' } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    vi.spyOn(CommunicationGetReportQuery.prototype, 'run').mockResolvedValue(queryResult as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when report_id is missing', async () => {
    req.params = {}
    await communicationGetReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'report_id:not-found' 
    })
  })

  it('calls next with error when query throws', async () => {
    const error = new Error('query error')
    vi.spyOn(CommunicationGetReportQuery.prototype, 'run').mockRejectedValue(error)
    await communicationGetReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('returns mapped report on success', async () => {
    await communicationGetReportHandler(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        id: 'r1',
        type: 'BATTLE',
        destination: 'dest-coords',
        origin: 'origin-coords',
        recorded_at: '2026-03-31T10:00:00.000Z',
        was_read: false,
        troops: [
          {
            code: 'WARRIOR',
            count: 5 
          } 
        ],
        resources: {
          plastic: 100,
          mushroom: 50,
        },
        remaining_resources: {
          plastic: 25,
          mushroom: 0,
        },
      }
    })
  })
})
