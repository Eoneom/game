import {
  vi, type MockInstance
} from 'vitest'
import {
  Request, Response, NextFunction
} from 'express'
import { troopProgressRecruitHandler } from './progress-recruit'
import { progressTroopRecruitment } from '#app/command/troop/progress-recruit'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#adapter/job-queue'
import { TroopError } from '#core/troop/error'

vi.mock('#app/command/troop/progress-recruit')

type MockRes = {
  status: MockInstance
  json: MockInstance
  send: MockInstance
  locals: Record<string, unknown>
}

describe('troopProgressRecruitHandler', () => {
  let req: Partial<Request>
  let res: MockRes
  let next: MockInstance
  let getPendingTroopRecruitProgress: MockInstance

  beforeEach(() => {
    req = { body: { city_id: 'c1' } }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      locals: { player_id: 'p1' }
    }
    next = vi.fn()
    getPendingTroopRecruitProgress = vi.fn().mockResolvedValue({
      player_id: 'p1',
      city_id: 'c1',
      troop_id: 't1',
      remaining_count: 10,
      finish_at: 1000,
      started_at: 0,
      last_progress: 0,
      execute_at: 500,
      job_id: 'j1'
    })
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingTroopRecruitProgress
    } as unknown as JobQueue)
    vi.mocked(progressTroopRecruitment).mockResolvedValue({ recruit_count: 5 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when city_id is missing', async () => {
    req.body = {}
    await troopProgressRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'nok',
      error_code: 'city_id:not-found'
    })
  })

  it('calls next with error when no pending recruitment', async () => {
    getPendingTroopRecruitProgress.mockResolvedValue(null)
    await troopProgressRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0] as Error
    expect(err.message).toBe(TroopError.NOT_IN_PROGRESS)
  })

  it('calls next with error when command throws', async () => {
    const error = new Error('recruit error')
    vi.mocked(progressTroopRecruitment).mockRejectedValue(error)
    await troopProgressRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('calls command with pending job data and returns recruit_count', async () => {
    await troopProgressRecruitHandler(req as unknown as Request, res as unknown as Response, next as NextFunction)
    expect(progressTroopRecruitment).toHaveBeenCalledWith({
      player_id: 'p1',
      city_id: 'c1',
      troop_id: 't1',
      remaining_count: 10,
      finish_at: 1000,
      started_at: 0,
      last_progress: 0,
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: { recruit_count: 5 }
    })
  })
})
