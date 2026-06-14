import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { PricingService } from '#core/pricing/service'
import { TroopEntity } from '#core/troop/entity'
import { CountCostValue } from '#core/pricing/value/count'
import { RequirementValue } from '#core/requirement/value/requirement'
import { RequirementService } from '#core/requirement/service'
import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopError } from '#core/troop/error'
import { OngoingRecruitment } from '#core/troop/type'

export interface TroopGetQueryRequest {
  troop_id: string
  player_id: string
}

export interface TroopGetQueryResponse {
  troop: TroopEntity
  cost: CountCostValue
  requirement: RequirementValue
  ongoing_recruitment: OngoingRecruitment | null
}

export class TroopGetQuery extends GenericQuery<TroopGetQueryRequest, TroopGetQueryResponse> {
  constructor() {
    super({ name: 'troop:get' })
  }

  protected async get({
    troop_id,
    player_id
  }: TroopGetQueryRequest): Promise<TroopGetQueryResponse> {
    const troop = await this.repository.troop.getById(troop_id)
    if (!troop.isOwnedBy(player_id)) {
      throw new Error(TroopError.NOT_OWNER)
    }

    const [
      cloning_factory_level,
      replication_catalyst_level,
      pending_recruit
    ] = await Promise.all([
      this.getCloningFactoryLevel(troop.cell_id),
      this.repository.technology.getLevel({
        player_id,
        code: TechnologyCode.REPLICATION_CATALYST
      }),
      this.getPendingRecruitment(troop.cell_id)
    ])

    const cost = PricingService.getTroopCost({
      code: troop.code,
      count: 1,
      cloning_factory_level,
      replication_catalyst_level
    })

    const requirement = RequirementService.getTroopRequirement({ troop_code: troop.code })

    const ongoing_recruitment = pending_recruit && pending_recruit.troop_id === troop.id
      ? {
        finish_at: pending_recruit.finish_at,
        remaining_count: pending_recruit.remaining_count,
        last_progress: pending_recruit.last_progress,
        started_at: pending_recruit.started_at
      }
      : null

    return {
      troop,
      cost,
      requirement,
      ongoing_recruitment
    }
  }

  private async getCloningFactoryLevel(cell_id: string | null): Promise<number> {
    if (!cell_id) {
      return 0
    }

    const city = await this.repository.city.searchByCell({ cell_id })
    if (!city) {
      return 0
    }

    return this.repository.building.getLevel({
      city_id: city.id,
      code: BuildingCode.CLONING_FACTORY
    })
  }

  private async getPendingRecruitment(cell_id: string | null) {
    if (!cell_id) {
      return null
    }

    const city = await this.repository.city.searchByCell({ cell_id })
    if (!city) {
      return null
    }

    return Factory.getJobQueue().getPendingTroopRecruitProgress({ city_id: city.id })
  }
}
