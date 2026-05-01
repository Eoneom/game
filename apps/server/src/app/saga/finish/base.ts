import { finishTroopBaseMovement } from '#app/command/troop/movement/finish/base'
import { rebaseTroopMovement } from '#app/command/troop/movement/rebase'
import { OutpostError } from '#core/outpost/error'

export const sagaFinishBase = async ({
  player_id,
  movement_id,
  arrived_at,
}: {
  player_id: string
  movement_id: string
  arrived_at: number
}): Promise<{ is_outpost_created: boolean }> => {
  try {
    return await finishTroopBaseMovement({
      player_id,
      movement_id,
      arrived_at,
    })
  } catch (err: unknown) {
    if ((err as Error).message === OutpostError.LIMIT_REACHED) {
      await rebaseTroopMovement({
        player_id,
        movement_id,
        arrived_at,
      })
      return { is_outpost_created: false }
    }

    throw err
  }
}
