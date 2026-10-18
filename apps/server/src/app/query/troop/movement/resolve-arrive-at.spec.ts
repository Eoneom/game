import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { id } from '#shared/identification'

describe('resolveMovementArriveAt', () => {
  const movement_id = id()

  it('returns execute_at from pending finish job', async () => {
    const arrive_at = await resolveMovementArriveAt({
      movement_id,
      job_queue: {
        getPendingTroopMovementFinish: vi.fn().mockResolvedValue({
          movement_id,
          execute_at: 42_000,
        }),
      },
    })

    expect(arrive_at).toBe(42_000)
  })

  it('returns null when finish job is gone (arrived, in combat, or orphan row)', async () => {
    const arrive_at = await resolveMovementArriveAt({
      movement_id,
      job_queue: {
        getPendingTroopMovementFinish: vi.fn().mockResolvedValue(null),
      },
    })

    expect(arrive_at).toBeNull()
  })
})
