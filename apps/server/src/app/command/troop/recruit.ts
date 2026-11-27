import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  processTroopRecruitQueue,
  startTroopRecruitment
} from '#app/command/troop/start-recruit'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingService } from '#core/building/service'
import { CityError } from '#core/city/error'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import { TroopRecruitQueueEntity } from '#core/troop/recruit-queue-entity'
import { TroopService } from '#core/troop/service'
import { id } from '#shared/identification'
import { now } from '#shared/time'

export interface RecruitTroopParams {
  city_id: string
  troop_code: TroopCode
  count: number
  player_id: string
}

/** Loose validation only (ownership and roster are checked by the caller); requirements and resources wait for the start. */
async function enqueueTroopRecruitment({
  player_id,
  city_id,
  troop_code,
  count
}: RecruitTroopParams): Promise<void> {
  const repository = Factory.getRepository()

  const command_center_level = await repository.building.getLevel({
    city_id,
    code: BuildingCode.COMMAND_CENTER
  })
  const queue_limit = BuildingService.getRecruitQueueLimit({ command_center_level })
  if (queue_limit === 0) {
    throw new Error(TroopError.ALREADY_IN_PROGRESS)
  }

  const queue_count = await repository.troop_recruit_queue.countByCity({ city_id })
  if (queue_count >= queue_limit) {
    throw new Error(TroopError.QUEUE_FULL)
  }

  await repository.troop_recruit_queue.create(TroopRecruitQueueEntity.create({
    id: id(),
    player_id,
    city_id,
    troop_code,
    count,
    created_at: now()
  }))
}

export async function recruitTroop({
  city_id,
  player_id,
  troop_code,
  count,
}: RecruitTroopParams): Promise<void> {
  return runCommand('troop:recruit', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const [
      city,
      player
    ] = await Promise.all([
      repository.city.get(city_id),
      repository.player.get(player_id),
    ])
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }
    TroopService.assertInRoster({
      faction_code: player.faction_code,
      troop_code,
    })

    let pending_recruit = await job_queue.getPendingTroopRecruitProgress({ city_id })

    if (!pending_recruit) {
      // Unstick queue rows left behind by a failed progress job (no active batch).
      await processTroopRecruitQueue({
        player_id,
        city_id
      })
      pending_recruit = await job_queue.getPendingTroopRecruitProgress({ city_id })
    }

    if (!pending_recruit) {
      await startTroopRecruitment({
        player_id,
        city_id,
        troop_code,
        count,
        skip_in_progress_check: true
      })
      return
    }

    await enqueueTroopRecruitment({
      player_id,
      city_id,
      troop_code,
      count
    })
  })
}
