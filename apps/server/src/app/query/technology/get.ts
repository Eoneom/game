import { GenericQuery } from '#query/generic'
import { PricingService } from '#core/pricing/service'
import { LevelCostValue } from '#core/pricing/value/level'
import { TechnologyCode } from '#core/technology/constant/code'
import { BuildingCode } from '#core/building/constant/code'
import { RequirementValue } from '#core/requirement/value/requirement'
import { RequirementService } from '#core/requirement/service'
import { Factory } from '#adapter/factory'
import { TechnologyEntity } from '#core/technology/entity'

export interface TechnologyGetQueryRequest {
  city_id: string
  technology_code: TechnologyCode
  player_id: string
}

export interface TechnologyGetQueryResponse {
  technology: TechnologyEntity
  cost: LevelCostValue
  requirement: RequirementValue
  research_at?: number
  research_started_at?: number
}

export class TechnologyGetQuery extends GenericQuery<TechnologyGetQueryRequest, TechnologyGetQueryResponse> {
  constructor() {
    super({ name: 'technology:get' })
  }

  protected async get({
    technology_code,
    city_id,
    player_id
  }: TechnologyGetQueryRequest): Promise<TechnologyGetQueryResponse> {
    const repository = Factory.getRepository()
    const [
      technology,
      research_lab_level,
      pending_research,
    ] = await Promise.all([
      repository.technology.get({
        player_id,
        code: technology_code
      }),
      repository.building.getLevel({
        city_id,
        code: BuildingCode.RESEARCH_LAB
      }),
      Factory.getJobQueue().getPendingTechnologyResearch({ player_id }),
    ])

    const cost = PricingService.getTechnologyLevelCost({
      code: technology.code,
      level: technology.level + 1,
      research_lab_level: research_lab_level
    })
    const requirement = RequirementService.getTechnologyRequirement({
      technology_code,
      technology_level: technology.level
    })

    const is_researching = pending_research?.technology_id === technology.id
    const research_at = is_researching ? pending_research.execute_at : undefined

    return {
      technology,
      cost,
      requirement,
      research_at,
      research_started_at:
        research_at != null ? research_at - cost.duration * 1000 : undefined,
    }
  }
}
