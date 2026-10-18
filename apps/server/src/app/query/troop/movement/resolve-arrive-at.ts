import { JobQueue } from '#app/port/job-queue'

/**
 * Active troop movements are those still traveling: a queued `troop.movement.finish` job exists.
 * Attack arrivals consume that job while the movement row remains until battle outcomes; combat is
 * not shown as an ongoing movement.
 */
export async function resolveMovementArriveAt({
  movement_id,
  job_queue,
}: {
  movement_id: string
  job_queue: JobQueue
}): Promise<number | null> {
  const pending = await job_queue.getPendingTroopMovementFinish({ movement_id })
  if (!pending) {
    return null
  }

  return pending.execute_at
}
