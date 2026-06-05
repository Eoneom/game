import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { TechnologyService } from '#core/technology/service'
import { PricingService } from '#core/pricing/service'
import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'

interface TechnologyListRequest {
  player_id: string
}

export type TechnologyListEntry =
  | {
      id: string
      code: TechnologyCode
      level: number
      research_at: number
      research_started_at: number
    }
  | {
      id: string
      code: TechnologyCode
      level: number
    }

export interface TechnologyListQueryResponse {
  technologies: TechnologyListEntry[]
}

export class TechnologyListQuery extends GenericQuery<TechnologyListRequest, TechnologyListQueryResponse> {
  constructor() {
    super({ name: 'technology:list' })
  }

  protected async get({ player_id }: TechnologyListRequest): Promise<TechnologyListQueryResponse> {
    const repository = Factory.getRepository()
    const [
      technologies,
      pending_research,
    ] = await Promise.all([
      repository.technology.list({ player_id }),
      Factory.getJobQueue().getPendingTechnologyResearch({ player_id }),
    ])

    const sorted = TechnologyService.sortTechnologies({ technologies })

    let research_lab_level = 0
    if (pending_research) {
      research_lab_level = await repository.building.getLevel({
        city_id: pending_research.city_id,
        code: BuildingCode.RESEARCH_LAB
      })
    }

    const response_technologies: TechnologyListEntry[] = sorted.map(technology => {
      if (!pending_research || pending_research.technology_id !== technology.id) {
        return {
          id: technology.id,
          code: technology.code,
          level: technology.level,
        }
      }

      const { duration } = PricingService.getTechnologyLevelCost({
        code: technology.code,
        level: technology.level + 1,
        research_lab_level
      })
      const research_at = pending_research.execute_at
      return {
        id: technology.id,
        code: technology.code,
        level: technology.level,
        research_at,
        research_started_at: research_at - duration * 1000
      }
    })

    return { technologies: response_technologies }
  }
}
