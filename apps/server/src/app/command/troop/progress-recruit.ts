import { Factory } from '#adapter/factory'
import { nextTroopRecruitProgressAt } from '#adapter/job-queue'
import { runCommand } from '#command/run'
import { AppEvent } from '#core/events'
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
      await job_queue.scheduleTroopRecruitProgress({
        player_id,
        city_id,
        troop_id,
        remaining_count: progressed.recruitment.remaining_count,
        finish_at: progressed.recruitment.finish_at,
        started_at: progressed.recruitment.started_at,
        last_progress: progressed.recruitment.last_progress,
        execute_at: nextTroopRecruitProgressAt({
          finish_at: progressed.recruitment.finish_at,
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
