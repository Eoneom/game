import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { PricingService } from '#core/pricing/service'
import { RequirementService } from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import { now } from '#shared/time'
import assert from 'assert'

export interface RecruitTroopParams {
  city_id: string
  troop_code: TroopCode
  count: number
  player_id: string
}

export interface RecruitTroopResult {
  recruit_at: number
}

export async function recruitTroop({
  city_id,
  player_id,
  troop_code,
  count,
}: RecruitTroopParams): Promise<RecruitTroopResult> {
  return runCommand('troop:recruit', async () => {
    const repository = Factory.getRepository()

    const city_cell = await repository.cell.getCityCell({ city_id })

    const is_recruitment_in_progress = await repository.troop.isInProgress({ cell_id: city_cell.id })
    if (is_recruitment_in_progress) {
      throw new Error(TroopError.ALREADY_IN_PROGRESS)
    }

    const [
      city,
      cloning_factory_level,
      replication_catalyst_level,
      levels,
      troop,
    ] = await Promise.all([
      repository.city.get(city_id),
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

    const updated_troop = troop.launchRecruitment({
      count,
      duration,
      recruitment_time: now(),
    })

    await Promise.all([
      repository.troop.updateOne(updated_troop),
      repository.resource_stock.updateOne(updated_stock),
    ])

    assert(updated_troop.ongoing_recruitment)
    return { recruit_at: updated_troop.ongoing_recruitment.finish_at }
  })
}
