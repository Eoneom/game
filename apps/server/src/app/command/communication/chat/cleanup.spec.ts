import type { MockInstance } from 'vitest'
import { cleanupCommunicationChat } from './cleanup'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { CHAT_CLEANUP_INTERVAL_MS } from '#app/scheduling/intervals'
import { CHAT_RETENTION_MS } from '#core/communication/constant/limits'
import * as time from '#shared/time'

describe('cleanupCommunicationChat', () => {
  const cleanup_at = 1_700_000_000_000
  let deleteOlderThan: MockInstance
  let deleteDeletedByBoth: MockInstance
  let scheduleChatCleanup: MockInstance

  beforeEach(() => {
    deleteOlderThan = vi.fn().mockResolvedValue(4)
    deleteDeletedByBoth = vi.fn().mockResolvedValue(2)
    scheduleChatCleanup = vi.fn().mockResolvedValue('job-id')

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      chat_message: { deleteOlderThan },
      mail: { deleteDeletedByBoth },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({ scheduleChatCleanup } as unknown as JobQueue)
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

  it('deletes chat older than 30 days, purges letters both sides deleted and reschedules daily', async () => {
    await cleanupCommunicationChat()

    expect(CHAT_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000)
    expect(deleteOlderThan).toHaveBeenCalledWith(cleanup_at - CHAT_RETENTION_MS)
    expect(deleteDeletedByBoth).toHaveBeenCalledTimes(1)
    expect(scheduleChatCleanup).toHaveBeenCalledWith({ execute_at: cleanup_at + CHAT_CLEANUP_INTERVAL_MS })
    expect(CHAT_CLEANUP_INTERVAL_MS).toBe(24 * 60 * 60 * 1000)
  })
})
