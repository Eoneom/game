import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { BuildingCode } from '#core/building/constant/code'
import { CityError } from '#core/city/error'
import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseEntity } from '#core/defense/entity'
import { DefenseService } from '#core/defense/service'
import { PricingService } from '#core/pricing/service'
import { CountCostValue } from '#core/pricing/value/count'
import { RequirementService } from '#core/requirement/service'
import { RequirementValue } from '#core/requirement/value/requirement'
import { OngoingRecruitment } from '#core/troop/type'

interface DefenseListQueryRequest {
  city_id: string
  player_id: string
}

export interface DefenseListPendingBuild extends OngoingRecruitment {
  defense_code: DefenseCode
}

export interface DefenseListQueryResponse {
  /** One entry per defense type the player's faction can build (count 0 when the city has none), catalogue order. */
  defenses: DefenseEntity[]
  /** Per-unit cost with the city's Enceinte duration reduction. */
  costs: Record<DefenseCode, CountCostValue<DefenseCode>>
  requirements: Record<DefenseCode, RequirementValue>
  city_wall_level: number
  capacity: {
    total: number
    used: number
    queued: number
  }
  pending_build: DefenseListPendingBuild | null
  build_queue: DefenseBuildQueueEntity[]
  build_queue_limit: number
}

export class DefenseListQuery extends GenericQuery<DefenseListQueryRequest, DefenseListQueryResponse> {
  constructor() {
    super({ name: 'defense:list' })
  }

  protected async get({
    city_id,
    player_id
  }: DefenseListQueryRequest): Promise<DefenseListQueryResponse> {
    const city = await this.repository.city.get(city_id)
    if (!city.isOwnedBy(player_id)) {
      throw new Error(CityError.NOT_OWNER)
    }

    const [
      player,
      rows,
      city_wall_level,
      pending,
      build_queue,
    ] = await Promise.all([
      this.repository.player.get(player_id),
      this.repository.defense.listByCity({ city_id }),
      this.repository.building.getLevel({
        city_id,
        code: BuildingCode.CITY_WALL
      }),
      Factory.getJobQueue().getPendingDefenseBuildProgress({ city_id }),
      this.repository.defense_build_queue.listByCity({ city_id }),
    ])

    const defenses = DefenseService.sortDefenses({
      // Faction defenses of another faction are hidden (slice 036); costs and requirements stay complete.
      defenses: DefenseService.codesForFaction(player.faction_code).map(code => rows.find(row => row.code === code)
        ?? DefenseEntity.init({
          player_id,
          city_id,
          code
        }))
    })

    const costs = {} as Record<DefenseCode, CountCostValue<DefenseCode>>
    const requirements = {} as Record<DefenseCode, RequirementValue>
    for (const code of Object.values(DefenseCode)) {
      costs[code] = PricingService.getDefenseCost({
        code,
        count: 1,
        city_wall_level
      })
      requirements[code] = RequirementService.getDefenseRequirement({ defense_code: code })
    }

    const queued_points = DefenseService.getTotalPoints([
      ...(pending ? [
        {
          code: pending.defense_code,
          count: pending.remaining_count 
        } 
      ] : []),
      ...build_queue.map(row => ({
        code: row.defense_code,
        count: row.count 
      })),
    ])

    return {
      defenses,
      costs,
      requirements,
      city_wall_level,
      capacity: {
        total: DefenseService.getCapacity({ city_wall_level }),
        used: DefenseService.getTotalPoints(defenses),
        queued: queued_points,
      },
      pending_build: pending
        ? {
          defense_code: pending.defense_code,
          finish_at: pending.finish_at,
          remaining_count: pending.remaining_count,
          last_progress: pending.last_progress,
          started_at: pending.started_at
        }
        : null,
      build_queue,
      build_queue_limit: DefenseService.getBuildQueueLimit({ city_wall_level })
    }
  }
}
