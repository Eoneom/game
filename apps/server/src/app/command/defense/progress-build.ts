import { Factory } from '#adapter/factory'
import { nextTroopRecruitProgressAt } from '#app/scheduling/troop-recruit'
import { runCommand } from '#command/run'
import { processDefenseBuildQueue } from '#app/command/defense/start-build'
import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { AppEvent } from '#core/events'
import { PricingService } from '#core/pricing/service'
import { TroopService } from '#core/troop/service'
import { now } from '#shared/time'

interface ProgressDefenseBuildParams {
  player_id: string
  city_id: string
  defense_code: DefenseCode
  remaining_count: number
  finish_at: number
  started_at: number
  last_progress: number
}

interface ProgressDefenseBuildResult {
  built_count: number
}

/** Units appear progressively, exactly like troop recruitment (`troop.recruit.progress`). */
export async function progressDefenseBuild({
  player_id,
  city_id,
  defense_code,
  remaining_count,
  finish_at,
  started_at,
  last_progress,
}: ProgressDefenseBuildParams): Promise<ProgressDefenseBuildResult> {
  return runCommand('defense:progress-build', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()
    const logger = Factory.getLogger('app:command:defense:progress-build')

    const city = await repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      logger.info('city does not belong to player anymore', {
        city_id,
        player_id
      })
      return { built_count: 0 }
    }

    const progress_time = now()
    const progressed = TroopService.progressRecruitment({
      count: 0,
      recruitment: {
        remaining_count,
        finish_at,
        started_at,
        last_progress
      },
      progress_time
    })
    const built_count = progressed.count

    if (built_count > 0) {
      await repository.defense.addCount({
        player_id,
        city_id,
        code: defense_code,
        count: built_count
      })
    }

    if (progressed.recruitment) {
      let next_finish_at = progressed.recruitment.finish_at

      if (built_count > 0) {
        const city_wall_level = await repository.building.getLevel({
          city_id,
          code: BuildingCode.CITY_WALL,
        })

        const { duration } = PricingService.getDefenseCost({
          code: defense_code,
          count: progressed.recruitment.remaining_count,
          city_wall_level,
        })

        next_finish_at = progress_time + duration * 1000
      }

      await job_queue.scheduleDefenseBuildProgress({
        player_id,
        city_id,
        defense_code,
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
    } else {
      await processDefenseBuildQueue({
        player_id,
        city_id,
        started_at: progress_time
      })
    }

    Factory.getEventBus().emit(AppEvent.DefenseBuildUpdated, {
      city_id,
      player_id
    })

    return { built_count }
  })
}
