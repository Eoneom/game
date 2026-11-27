import { Factory } from '#adapter/factory'
import { resolveMovementArriveAt } from '#app/query/troop/movement/resolve-arrive-at'
import { GenericQuery } from '#query/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { DefenseCode } from '#core/defense/constant/code'
import { OutpostError } from '#core/outpost/error'
import { PricingService } from '#core/pricing/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'

type Location =
  | { type: 'city'; city_id: string }
  | { type: 'outpost'; outpost_id: string }

export interface LocationActivityRequest {
  player_id: string
  location: Location
}

export interface LocationActivityBuilding {
  code: BuildingCode
  level: number
  upgrade_at: number
  upgrade_started_at: number
}

export interface LocationActivityResearch {
  code: TechnologyCode
  level: number
  research_at: number
  research_started_at: number
  /** City whose research lab runs the job (research is player-wide, slice 041). */
  city_id: string
  city_name: string
}

export interface LocationActivityRecruitment {
  code: TroopCode
  remaining_count: number
  finish_at: number
  started_at: number
}

export interface LocationActivityFortification {
  code: DefenseCode
  remaining_count: number
  finish_at: number
  started_at: number
}

export interface LocationActivityQueryResponse {
  building: LocationActivityBuilding | null
  building_queue_depth: number
  research: LocationActivityResearch | null
  /** Player-wide research queue length (slice 041). */
  research_queue_depth: number
  recruitment: LocationActivityRecruitment | null
  /** 0 for an outpost (slice 041). */
  recruitment_queue_depth: number
  /** Running defense build batch of the city (slice 041); always null for an outpost. */
  fortification: LocationActivityFortification | null
  /** 0 for an outpost (slice 041). */
  fortification_queue_depth: number
  /** Enceinte level >= 1 (slice 041); always false for an outpost. */
  fortification_available: boolean
  movements: {
    count: number
    next_arrive_at: number | null
  }
}

export class LocationActivityQuery extends GenericQuery<
  LocationActivityRequest,
  LocationActivityQueryResponse
> {
  constructor() {
    super({ name: 'location:activity' })
  }

  protected async get({
    player_id,
    location,
  }: LocationActivityRequest): Promise<LocationActivityQueryResponse> {
    if (location.type === 'city') {
      const city = await this.repository.city.get(location.city_id)
      if (!city.isOwnedBy(player_id)) {
        throw new Error(CityError.NOT_OWNER)
      }
    } else {
      const outpost = await this.repository.outpost.getById(location.outpost_id)
      if (!outpost.isOwnedBy(player_id)) {
        throw new Error(OutpostError.NOT_OWNER)
      }
    }

    const city_id = location.type === 'city' ? location.city_id : null
    const job_queue = Factory.getJobQueue()

    const [
      pending_upgrade,
      upgrade_queue,
      pending_research,
      pending_recruit,
      movements,
      architecture,
      research_queue,
      recruit_queue,
      pending_defense_build,
      defense_build_queue,
      city_wall_level,
    ] = await Promise.all([
      city_id
        ? job_queue.getPendingBuildingUpgrade({ city_id })
        : Promise.resolve(null),
      city_id
        ? this.repository.building_upgrade_queue.listByCity({ city_id })
        : Promise.resolve([]),
      job_queue.getPendingTechnologyResearch({ player_id }),
      city_id
        ? job_queue.getPendingTroopRecruitProgress({ city_id })
        : Promise.resolve(null),
      this.repository.movement.list({ player_id }),
      this.repository.technology.get({
        player_id,
        code: TechnologyCode.ARCHITECTURE,
      }),
      this.repository.technology_research_queue.listByPlayer({ player_id }),
      city_id
        ? this.repository.troop_recruit_queue.listByCity({ city_id })
        : Promise.resolve([]),
      city_id
        ? job_queue.getPendingDefenseBuildProgress({ city_id })
        : Promise.resolve(null),
      city_id
        ? this.repository.defense_build_queue.listByCity({ city_id })
        : Promise.resolve([]),
      city_id
        ? this.repository.building.getLevel({
          city_id,
          code: BuildingCode.CITY_WALL,
        })
        : Promise.resolve(0),
    ])

    let building: LocationActivityBuilding | null = null
    if (pending_upgrade && city_id) {
      const building_entity = await this.repository.building.getById(pending_upgrade.building_id)
      const { duration } = PricingService.getBuildingLevelCost({
        level: building_entity.level + 1,
        code: building_entity.code,
        architecture_level: architecture.level,
      })
      const upgrade_at = pending_upgrade.execute_at
      building = {
        code: building_entity.code,
        level: building_entity.level,
        upgrade_at,
        upgrade_started_at: upgrade_at - duration * 1000,
      }
    }

    let research: LocationActivityResearch | null = null
    if (pending_research) {
      const [
        technology,
        research_lab_level,
        research_city,
      ] = await Promise.all([
        this.repository.technology.getById(pending_research.technology_id),
        this.repository.building.getLevel({
          city_id: pending_research.city_id,
          code: BuildingCode.RESEARCH_LAB,
        }),
        this.repository.city.get(pending_research.city_id),
      ])
      const { duration } = PricingService.getTechnologyLevelCost({
        code: technology.code,
        level: technology.level + 1,
        research_lab_level,
      })
      const research_at = pending_research.execute_at
      research = {
        code: technology.code,
        level: technology.level,
        research_at,
        research_started_at: research_at - duration * 1000,
        city_id: pending_research.city_id,
        city_name: research_city.name,
      }
    }

    let recruitment: LocationActivityRecruitment | null = null
    if (pending_recruit) {
      const troop = await this.repository.troop.getById(pending_recruit.troop_id)
      recruitment = {
        code: troop.code,
        remaining_count: pending_recruit.remaining_count,
        finish_at: pending_recruit.finish_at,
        started_at: pending_recruit.started_at,
      }
    }

    const fortification: LocationActivityFortification | null = pending_defense_build
      ? {
        code: pending_defense_build.defense_code,
        remaining_count: pending_defense_build.remaining_count,
        finish_at: pending_defense_build.finish_at,
        started_at: pending_defense_build.started_at,
      }
      : null

    const movement_entries = await Promise.all(movements.map(async (movement) => {
      return resolveMovementArriveAt({
        movement_id: movement.id,
        job_queue,
      })
    }))
    const arrive_ats = movement_entries.filter((v): v is number => v !== null)
    const next_arrive_at = arrive_ats.length ? Math.min(...arrive_ats) : null

    return {
      building,
      building_queue_depth: upgrade_queue.length,
      research,
      research_queue_depth: research_queue.length,
      recruitment,
      recruitment_queue_depth: recruit_queue.length,
      fortification,
      fortification_queue_depth: defense_build_queue.length,
      fortification_available: city_wall_level >= 1,
      movements: {
        count: arrive_ats.length,
        next_arrive_at,
      },
    }
  }
}
