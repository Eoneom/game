import type { MockInstance } from 'vitest'
import {
  NextFunction, Request, Response
} from 'express'
import { RequestError } from '@eoneom/api-client'
import { communicationCreateAbuseReportHandler } from './create'
import * as command from '#app/command/communication/abuse-report/create'

describe('communicationCreateAbuseReportHandler', () => {
  let create: MockInstance
  let res: { json: MockInstance, status: MockInstance, locals: Record<string, unknown> }
  let next: MockInstance

  beforeEach(() => {
    create = vi.spyOn(command, 'createCommunicationAbuseReport').mockResolvedValue(undefined)
    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects an unknown kind', async () => {
    await communicationCreateAbuseReportHandler({
      body: {
        kind: 'report',
        message_id: 'm1'
      } 
    } as Request, res as unknown as Response, next as unknown as NextFunction)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: RequestError.KIND_NOT_FOUND
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('forwards the report', async () => {
    await communicationCreateAbuseReportHandler({
      body: {
        kind: 'chat',
        message_id: 'm1',
        reason: 'spam'
      } 
    } as Request, res as unknown as Response, next as unknown as NextFunction)

    expect(create).toHaveBeenCalledWith({
      reporter_id: 'p1',
      kind: 'chat',
      message_id: 'm1',
      reason: 'spam'
    })
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
})
