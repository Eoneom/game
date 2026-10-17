import type { JobQueueContext } from '#adapter/job-queue/context'

export const COMBAT_ROUND_ADVANCE_QUEUE = 'combat.round.advance'

export type CombatRoundAdvanceJobData = {
  battle_id: string
  round: number
}

export const scheduleCombatRoundAdvance = async (
  ctx: JobQueueContext,
  {
    battle_id,
    round,
    execute_at,
  }: {
    battle_id: string
    round: number
    execute_at: number
  }
): Promise<string | null> => {
  const data: CombatRoundAdvanceJobData = {
    battle_id,
    round,
  }

  ctx.logger.info('schedule combat round advance', {
    battle_id,
    round,
    execute_at,
  })

  return ctx.boss.send(COMBAT_ROUND_ADVANCE_QUEUE, data, {
    startAfter: new Date(execute_at),
    singletonKey: `${battle_id}:${round}`,
  })
}
