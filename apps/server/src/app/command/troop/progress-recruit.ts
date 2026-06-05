import { Factory } from '#adapter/factory'
import { nextTroopRecruitProgressAt } from '#app/scheduling/troop-recruit'
import { runCommand } from '#command/run'
import { BuildingCode } from '#core/building/constant/code'
import { AppEvent } from '#core/events'
import { PricingService } from '#core/pricing/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import { now } from '#shared/time'

export interface ProgressTroopRecruitmentParams {
  player_id: string
  city_id: string
  troop_id: string
  remaining_count: number
  finish_at: number
  started_at: number
  last_progress: number
}

export interface ProgressTroopRecruitmentResult {
  recruit_count: number
}

export async function progressTroopRecruitment({
  player_id,
  city_id,
  troop_id,
  remaining_count,
  finish_at,
  started_at,
  last_progress,
}: ProgressTroopRecruitmentParams): Promise<ProgressTroopRecruitmentResult> {
  return runCommand('troop:progress-recruit', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()
    const logger = Factory.getLogger('app:command:troop:progress-recruit')

    const troop = await repository.troop.getById(troop_id)

    if (troop.player_id !== player_id) {
      logger.info('troop does not belong to player', {
        troop_id,
        player_id
      })
      return { recruit_count: 0 }
    }

    const progress_time = now()
    const progressed = TroopService.progressRecruitment({
      count: troop.count,
      recruitment: {
        remaining_count,
        finish_at,
        started_at,
        last_progress
      },
      progress_time
    })
    const recruit_count = progressed.count - troop.count

    await repository.troop.updateOne(TroopEntity.create({
      ...troop,
      count: progressed.count
    }))

    if (progressed.recruitment) {
      let next_finish_at = progressed.recruitment.finish_at

      if (recruit_count > 0) {
        const [
          cloning_factory_level,
          replication_catalyst_level,
        ] = await Promise.all([
          repository.building.getLevel({
            city_id,
            code: BuildingCode.CLONING_FACTORY,
          }),
          repository.technology.getLevel({
            player_id,
            code: TechnologyCode.REPLICATION_CATALYST,
          }),
        ])

        const { duration } = PricingService.getTroopCost({
          code: troop.code,
          count: progressed.recruitment.remaining_count,
          cloning_factory_level,
          replication_catalyst_level,
        })

        next_finish_at = progress_time + duration * 1000
      }

      await job_queue.scheduleTroopRecruitProgress({
        player_id,
        city_id,
        troop_id,
        remaining_count: progressed.recruitment.remaining_count,
        finish_at: next_finish_at,
        started_at: progressed.recruitment.started_at,
        last_progress: progressed.recruitment.last_progress,
        execute_at: nextTroopRecruitProgressAt({
          finish_at: next_finish_at,
          remaining_count: progressed.recruitment.remaining_count,
          now: progress_time
        })
      })
    }

    Factory.getEventBus().emit(AppEvent.TroopRecruitmentUpdated, {
      city_id,
      player_id
    })

    return { recruit_count }
  })
}
