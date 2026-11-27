import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { TechnologyService } from '#core/technology/service'
import { PricingService } from '#core/pricing/service'
import { BuildingCode } from '#core/building/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import { CityError } from '#core/city/error'
import { LevelCostValue } from '#core/pricing/value/level'
import { RequirementService } from '#core/requirement/service'
import { RequirementValue } from '#core/requirement/value/requirement'

interface TechnologyListRequest {
  player_id: string
  /** When given (slice 043), entries carry `research_cost` priced with this city's research lab. */
  city_id?: string
}

interface TechnologyListEntryBase {
  id: string
  code: TechnologyCode
  level: number
  /** Level-scaled requirement of level + 1, as `TechnologyGetQuery`. */
  requirement: RequirementValue
  /** Cost of level + 1 with the research lab of `city_id`; absent without `city_id`. */
  research_cost?: LevelCostValue
}

export type TechnologyListEntry =
  | (TechnologyListEntryBase & {
      research_at: number
      research_started_at: number
    })
  | TechnologyListEntryBase

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

  protected async get({
    player_id,
    city_id
  }: TechnologyListRequest): Promise<TechnologyListQueryResponse> {
    const repository = Factory.getRepository()
    if (city_id) {
      const city = await repository.city.get(city_id)
      if (!city.isOwnedBy(player_id)) {
        throw new Error(CityError.NOT_OWNER)
      }
    }

    const [
      technologies,
      pending_research,
      research_queue,
      priced_research_lab_level,
    ] = await Promise.all([
      repository.technology.list({ player_id }),
      Factory.getJobQueue().getPendingTechnologyResearch({ player_id }),
      repository.technology_research_queue.listByPlayer({ player_id }),
      city_id
        ? repository.building.getLevel({
          city_id,
          code: BuildingCode.RESEARCH_LAB,
        })
        : Promise.resolve(null),
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
      const base: TechnologyListEntryBase = {
        id: technology.id,
        code: technology.code,
        level: technology.level,
        requirement: RequirementService.getTechnologyRequirement({
          technology_code: technology.code,
          technology_level: technology.level,
        }),
      }
      if (priced_research_lab_level !== null) {
        base.research_cost = PricingService.getTechnologyLevelCost({
          code: technology.code,
          level: technology.level + 1,
          research_lab_level: priced_research_lab_level,
        })
      }
      if (!pending_research || pending_research.technology_id !== technology.id) {
        return base
      }

      const { duration } = PricingService.getTechnologyLevelCost({
        code: technology.code,
        level: technology.level + 1,
        research_lab_level: research_lab_levels.get(pending_research.city_id) ?? 0,
      })
      const research_at = pending_research.execute_at
      return {
        ...base,
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
