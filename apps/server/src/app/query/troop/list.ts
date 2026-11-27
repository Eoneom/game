import { Factory } from '#adapter/factory'
import { GenericQuery } from '#query/generic'
import { TroopEntity } from '#core/troop/entity'
import { CityError } from '#core/city/error'
import { TroopService } from '#core/troop/service'
import { CellEntity } from '#core/world/cell/entity'
import { OutpostError } from '#core/outpost/error'
import { CountCostValue } from '#core/pricing/value/count'
import { TroopCode } from '#core/troop/constant/code'
import { TechnologyCode } from '#core/technology/constant/code'
import { BuildingCode } from '#core/building/constant/code'
import { PricingService } from '#core/pricing/service'
import { OngoingRecruitment } from '#core/troop/type'
import { TroopRecruitQueueEntity } from '#core/troop/recruit-queue-entity'
import { BuildingService } from '#core/building/service'

type Location = { type: 'city', city_id: string} | { type: 'outpost', outpost_id: string }

export interface TroopListQueryRequest {
  location: Location
  player_id: string
}

export interface TroopListPendingRecruitment extends OngoingRecruitment {
  troop_id: string
}

export interface TroopListQueryResponse {
  troops: TroopEntity[]
  costs: Record<TroopCode, CountCostValue>
  pending_recruitment: TroopListPendingRecruitment | null
  /** Waiting batches of the city (oldest first); always empty for outposts. */
  recruit_queue: TroopRecruitQueueEntity[]
  /** Waiting slots available in the city (0 until its command center is built). */
  recruit_queue_limit: number
}

export class TroopListQuery extends GenericQuery<TroopListQueryRequest, TroopListQueryResponse> {
  constructor() {
    super({ name: 'troop:list' })
  }

  protected async get({
    location,
    player_id
  }: TroopListQueryRequest): Promise<TroopListQueryResponse> {
    const cell = await this.getCellOfLocation({
      player_id,
      location
    })

    const [
      troops,
      cloning_factory_level,
      replication_catalyst_level,
      pending_recruit,
      recruit_queue,
      command_center_level
    ] = await Promise.all([
      this.repository.troop.listInCell({
        cell_id: cell.id,
        player_id
      }),
      location.type === 'city' ? this.repository.building.getLevel({
        city_id: location.city_id,
        code: BuildingCode.CLONING_FACTORY
      }): 0,
      this.repository.technology.getLevel({
        player_id,
        code: TechnologyCode.REPLICATION_CATALYST
      }),
      location.type === 'city'
        ? Factory.getJobQueue().getPendingTroopRecruitProgress({ city_id: location.city_id })
        : Promise.resolve(null),
      location.type === 'city'
        ? this.repository.troop_recruit_queue.listByCity({ city_id: location.city_id })
        : Promise.resolve([]),
      location.type === 'city'
        ? this.repository.building.getLevel({
          city_id: location.city_id,
          code: BuildingCode.COMMAND_CENTER
        })
        : Promise.resolve(0)
    ])

    const costs = troops.reduce((acc, troop) => {
      const cost = PricingService.getTroopCost({
        code: troop.code,
        count: 1,
        cloning_factory_level,
        replication_catalyst_level
      })

      return {
        ...acc,
        [troop.code]: cost
      }
    }, {} as Record<TroopCode, CountCostValue>)

    return {
      troops: TroopService.sortTroops({ troops }),
      costs,
      pending_recruitment: pending_recruit
        ? {
          troop_id: pending_recruit.troop_id,
          finish_at: pending_recruit.finish_at,
          remaining_count: pending_recruit.remaining_count,
          last_progress: pending_recruit.last_progress,
          started_at: pending_recruit.started_at
        }
        : null,
      recruit_queue,
      recruit_queue_limit: BuildingService.getRecruitQueueLimit({ command_center_level })
    }
  }

  private async getCellOfLocation({
    player_id,
    location
  }: {
    player_id: string
    location: Location
  }): Promise<CellEntity> {
    if (location.type === 'city') {
      const city = await this.repository.city.get(location.city_id)
      if (!city.isOwnedBy(player_id)) {
        throw new Error(CityError.NOT_OWNER)
      }

      return this.repository.cell.getById(city.cell_id)
    }

    const outpost = await this.repository.outpost.getById(location.outpost_id)
    if (!outpost.isOwnedBy(player_id)) {
      throw new Error(OutpostError.NOT_OWNER)
    }

    return this.repository.cell.getById(outpost.cell_id)
  }
}
