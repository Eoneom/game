import { BattleRepository } from '#app/port/battle-repository'
import { JobQueue } from '#app/port/job-queue'

export async function resolveMovementArriveAt({
  movement_id,
  job_queue,
  battle_repository,
}: {
  movement_id: string
  job_queue: JobQueue
  battle_repository: BattleRepository
}): Promise<number | null> {
  const pending = await job_queue.getPendingTroopMovementFinish({ movement_id })
  if (pending) {
    return pending.execute_at
  }

  const battle = await battle_repository.getByMovementId(movement_id)
  if (!battle) {
    return null
  }

  if (battle.status === 'in_progress') {
    return battle.started_at
  }

  // Outcomes still applying: movement row exists until applyBattleOutcomes deletes it.
  if (battle.status === 'finished') {
    return battle.finished_at ?? battle.started_at
  }

  return null
}
