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

export interface TechnologyResearchQueueEntry {
  id: string
  technology_code: TechnologyCode
  city_id: string
  city_name: string
  duration_seconds: number
  start_at: number
  finish_at: number
}

export interface TechnologyListQueryResponse {
  technologies: TechnologyListEntry[]
  research_queue: TechnologyResearchQueueEntry[]
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
      research_queue,
    ] = await Promise.all([
      repository.technology.list({ player_id }),
      Factory.getJobQueue().getPendingTechnologyResearch({ player_id }),
      repository.technology_research_queue.listByPlayer({ player_id }),
    ])

    const sorted = TechnologyService.sortTechnologies({ technologies })

    const city_ids = [
      ...new Set([
        ...research_queue.map(item => item.city_id),
        ...(pending_research ? [ pending_research.city_id ] : []),
      ]),
    ]
    const cities = await Promise.all(city_ids.map(city_id => repository.city.get(city_id)))
    const city_names = new Map(cities.map(city => [
      city.id,
      city.name
    ]))
    const research_lab_levels = new Map<string, number>()
    await Promise.all(city_ids.map(async (city_id) => {
      const level = await repository.building.getLevel({
        city_id,
        code: BuildingCode.RESEARCH_LAB,
      })
      research_lab_levels.set(city_id, level)
    }))

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
        research_lab_level: research_lab_levels.get(pending_research.city_id) ?? 0,
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

    const projected_levels = new Map<TechnologyCode, number>()
    for (const technology of sorted) {
      const level_after_active = pending_research?.technology_id === technology.id
        ? technology.level + 1
        : technology.level
      projected_levels.set(technology.code, level_after_active)
    }

    let schedule_cursor = pending_research?.execute_at ?? Date.now()
    const research_queue_response: TechnologyResearchQueueEntry[] = research_queue.map(item => {
      const target_level = (projected_levels.get(item.technology_code) ?? 0) + 1
      projected_levels.set(item.technology_code, target_level)
      const { duration } = PricingService.getTechnologyLevelCost({
        code: item.technology_code,
        level: target_level,
        research_lab_level: research_lab_levels.get(item.city_id) ?? 0,
      })
      const start_at = schedule_cursor
      const finish_at = schedule_cursor + duration * 1000
      schedule_cursor = finish_at
      return {
        id: item.id,
        technology_code: item.technology_code,
        city_id: item.city_id,
        city_name: city_names.get(item.city_id) ?? '',
        duration_seconds: duration,
        start_at,
        finish_at,
      }
    })

    return {
      technologies: response_technologies,
      research_queue: research_queue_response,
    }
  }
}
