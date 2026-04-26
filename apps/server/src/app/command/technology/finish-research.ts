import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppEvent } from '#core/events'

export interface FinishTechnologyResearchParams {
  player_id: string
  technology_id: string
  level: number
}

export async function finishTechnologyResearch({
  player_id,
  technology_id,
  level,
}: FinishTechnologyResearchParams): Promise<void> {
  return runCommand('technology:finish-research', async () => {
    const repository = Factory.getRepository()
    const logger = Factory.getLogger('app:command:technology:finish-research')

    const technology_to_finish = await repository.technology.getById(technology_id)

    if (technology_to_finish.player_id !== player_id) {
      logger.info('technology does not belong to player', {
        technology_id,
        player_id
      })
      return
    }

    if (technology_to_finish.level !== level) {
      logger.info('technology already finished or level mismatch', {
        technology_id,
        expected_level: level,
        actual_level: technology_to_finish.level
      })
      return
    }

    await repository.technology.updateOne(technology_to_finish.finishResearch())

    Factory.getEventBus().emit(AppEvent.TechnologyResearchFinished, { player_id })
  })
}
