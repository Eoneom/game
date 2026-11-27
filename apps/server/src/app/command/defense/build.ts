import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  processDefenseBuildQueue,
  startDefenseBuild
} from '#app/command/defense/start-build'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseError } from '#core/defense/error'
import { DefenseService } from '#core/defense/service'
import { id } from '#shared/identification'
import { now } from '#shared/time'

interface BuildDefenseParams {
  city_id: string
  defense_code: DefenseCode
  count: number
  player_id: string
}

/**
 * Starts a fortification batch, or queues it behind the running one (slice 029).
 * Loose validation at enqueue: ownership, faction roster (slice 036) and capacity; requirements and resources
 * wait for the start.
 */
export async function buildDefense({
  city_id,
  player_id,
  defense_code,
  count,
}: BuildDefenseParams): Promise<void> {
  return runCommand('defense:build', async () => {
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
    DefenseService.assertInRoster({
      faction_code: player.faction_code,
      defense_code,
    })

    const [
      city_wall_level,
      defenses,
      queue,
    ] = await Promise.all([
      repository.building.getLevel({
        city_id,
        code: BuildingCode.CITY_WALL,
      }),
      repository.defense.listByCity({ city_id }),
      repository.defense_build_queue.listByCity({ city_id }),
    ])
    let pending_build = await job_queue.getPendingDefenseBuildProgress({ city_id })

    DefenseService.assertCapacity({
      city_wall_level,
      used_points: DefenseService.getTotalPoints(defenses),
      queued_points: DefenseService.getTotalPoints([
        ...(pending_build ? [
          {
            code: pending_build.defense_code,
            count: pending_build.remaining_count 
          } 
        ] : []),
        ...queue.map(row => ({
          code: row.defense_code,
          count: row.count 
        })),
      ]),
      code: defense_code,
      count,
    })

    if (!pending_build) {
      // Unstick queue rows left behind by a failed progress job (no active batch).
      await processDefenseBuildQueue({
        player_id,
        city_id
      })
      pending_build = await job_queue.getPendingDefenseBuildProgress({ city_id })
    }

    if (!pending_build) {
      await startDefenseBuild({
        player_id,
        city_id,
        defense_code,
        count,
        skip_in_progress_check: true
      })
      return
    }

    const queue_limit = DefenseService.getBuildQueueLimit({ city_wall_level })
    if (queue_limit === 0) {
      throw new Error(DefenseError.ALREADY_IN_PROGRESS)
    }

    const queue_count = await repository.defense_build_queue.countByCity({ city_id })
    if (queue_count >= queue_limit) {
      throw new Error(DefenseError.QUEUE_FULL)
    }

    await repository.defense_build_queue.create(DefenseBuildQueueEntity.create({
      id: id(),
      player_id,
      city_id,
      defense_code,
      count,
      created_at: now()
    }))
  })
}
