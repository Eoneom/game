import { Factory } from '#adapter/factory'
import { TroopMovementGetActionQuery } from '#query/troop/movement/get-action'
import { sagaFinishBase } from '#app/saga/finish/base'
import { sagaFinishExplore } from '#app/saga/finish/explore'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopError } from '#core/troop/error'
import { AppEvent } from '#core/events'

export const sagaFinishOneMovement = async ({
  player_id,
  movement_id,
  arrived_at,
}: {
  player_id: string
  movement_id: string
  arrived_at: number
}): Promise<void> => {
  const logger = Factory.getLogger('app:saga:finish:movement')

  try {
    const { action } = await new TroopMovementGetActionQuery().run({ movement_id })

    let is_outpost_created = false

    switch (action) {
    case MovementAction.EXPLORE:
      await sagaFinishExplore({
        player_id,
        movement_id,
        arrived_at,
      })
      break
    case MovementAction.BASE:
      ({ is_outpost_created } = await sagaFinishBase({
        player_id,
        movement_id,
        arrived_at,
      }))
      break
    default:
      throw new Error(TroopError.MOVEMENT_ACTION_NOT_IMPLEMENTED)
    }

    Factory.getEventBus().emit(AppEvent.TroopMovementFinished, { player_id })

    if (is_outpost_created) {
      Factory.getEventBus().emit(AppEvent.OutpostCreated, { player_id })
    }
  } catch (err: unknown) {
    if ((err as Error).message === TroopError.MOVEMENT_NOT_FOUND) {
      logger.info('movement already finished or missing', { movement_id, player_id })
      return
    }

    throw err
  }
}
