import type { MockInstance } from 'vitest'
import { cleanupOldReadReports, REPORT_READ_RETENTION_MS } from './cleanup-old-read'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { REPORT_CLEANUP_INTERVAL_MS } from '#app/scheduling/intervals'
import { Repository } from '#app/port/repository/generic'
import * as time from '#shared/time'
import assert from 'assert'

describe('cleanupOldReadReports', () => {
  let deleteReadOlderThan: MockInstance
  let scheduleReportCleanup: MockInstance
  let repository: Pick<Repository, 'report'>
  const cleanup_at = 1_700_000_000_000

  beforeEach(() => {
    deleteReadOlderThan = vi.fn().mockResolvedValue(3)
    scheduleReportCleanup = vi.fn().mockResolvedValue('job-id')

    repository = {
      report: {
        deleteReadOlderThan,
      } as unknown as Repository['report']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      scheduleReportCleanup,
    } as unknown as JobQueue)
    vi.spyOn(Factory, 'getLogger').mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as never)
    vi.spyOn(time, 'now').mockReturnValue(cleanup_at)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should delete read reports older than retention and reschedule', async () => {
    await cleanupOldReadReports()

    assert.strictEqual(deleteReadOlderThan.mock.calls.length, 1)
    assert.strictEqual(
      deleteReadOlderThan.mock.calls[0][0],
      cleanup_at - REPORT_READ_RETENTION_MS
    )
    assert.strictEqual(scheduleReportCleanup.mock.calls.length, 1)
    assert.deepStrictEqual(scheduleReportCleanup.mock.calls[0][0], {
      execute_at: cleanup_at + REPORT_CLEANUP_INTERVAL_MS
    })
  })
})
