import { Factory } from '#adapter/factory'
import { nextTroopRecruitProgressAt } from '#app/scheduling/troop-recruit'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { PricingService } from '#core/pricing/service'
import { RequirementService } from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import { TroopService } from '#core/troop/service'
import { now } from '#shared/time'

export interface RecruitTroopParams {
  city_id: string
  troop_code: TroopCode
  count: number
  player_id: string
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
    TroopService.assertInRoster({
      faction_code: player.faction_code,
      troop_code,
    })
    const city_cell = await repository.cell.getById(city.cell_id)

    const pending_recruit = await job_queue.getPendingTroopRecruitProgress({ city_id })
    if (pending_recruit) {
      throw new Error(TroopError.ALREADY_IN_PROGRESS)
    }

    const [
      cloning_factory_level,
      replication_catalyst_level,
      levels,
      troop,
    ] = await Promise.all([
      repository.building.getLevel({
        city_id,
        code: BuildingCode.CLONING_FACTORY,
      }),
      repository.technology.getLevel({
        player_id,
        code: TechnologyCode.REPLICATION_CATALYST,
      }),
      AppService.getTroopRequirementLevels({
        city_id,
        player_id,
        troop_code,
      }),
      repository.troop.getInCell({
        cell_id: city_cell.id,
        code: troop_code,
      }),
    ])

    RequirementService.checkTroopRequirement({
      troop_code: troop.code,
      levels,
    })

    const {
      resource, duration
    } = PricingService.getTroopCost({
      code: troop.code,
      count,
      cloning_factory_level,
      replication_catalyst_level,
    })

    const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
    AppService.assertCityResourceStockContext({
      city,
      city_cell,
      stock,
      player_id
    })
    const updated_stock = stock.purchase({ resource })

    const recruitment_time = now()
    const finish_at = recruitment_time + duration * 1000
    const execute_at = nextTroopRecruitProgressAt({
      finish_at,
      remaining_count: count,
      now: recruitment_time
    })

    await repository.resource_stock.updateOne(updated_stock)

    await job_queue.scheduleTroopRecruitProgress({
      player_id,
      city_id,
      troop_id: troop.id,
      remaining_count: count,
      finish_at,
      started_at: recruitment_time,
      last_progress: recruitment_time,
      execute_at
    })
  })
}
