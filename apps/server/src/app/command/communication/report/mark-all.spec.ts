import type { MockInstance } from 'vitest'
import { markAllCommunicationReports } from './mark-all'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { id } from '#shared/identification'
import assert from 'assert'

describe('markAllCommunicationReports', () => {
  const player_id = id()
  let markAllAsRead: MockInstance
  let repository: Pick<Repository, 'report'>

  beforeEach(() => {
    markAllAsRead = vi.fn().mockResolvedValue(undefined)

    repository = {
      report: {
        markAllAsRead,
      } as unknown as Repository['report']
    }

    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should mark all reports as read for the player', async () => {
    await markAllCommunicationReports({ player_id })

    assert.strictEqual(markAllAsRead.mock.calls.length, 1)
    assert.strictEqual(markAllAsRead.mock.calls[0][0], player_id)
  })
})
