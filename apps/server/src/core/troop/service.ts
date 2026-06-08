import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { troop_order } from '#core/troop/constant/order'
import { troop_characteristics } from '#core/troop/constant/characteristic'
import { troop_earnings } from '#core/troop/constant/earnings'
import { resource_transport_weight } from '#core/troop/constant/transport-weight'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { MovementEntity } from '#core/troop/movement/entity'
import { Coordinates } from '#core/world/value/coordinates'
import { gameTimeScale, scaleGameDurationMs } from '#shared/game-time-scale'
import { id } from '#shared/identification'
import { Resource } from '#shared/resource'
import {
  OngoingRecruitment,
  TroopCount
} from '#core/troop/type'

export class TroopService {
  static launchRecruitment({
    duration,
    count,
    recruitment_time,
  }: {
    duration: number
    count: number
    recruitment_time: number
  }): OngoingRecruitment {
    return {
      finish_at: recruitment_time + duration * 1000,
      remaining_count: count,
      last_progress: recruitment_time,
      started_at: recruitment_time
    }
  }

  static progressRecruitment({
    count,
    recruitment,
    progress_time,
  }: {
    count: number
    recruitment: OngoingRecruitment
    progress_time: number
  }): {
    count: number
    recruitment: OngoingRecruitment | null
  } {
    if (progress_time >= recruitment.finish_at) {
      return {
        count: count + recruitment.remaining_count,
        recruitment: null
      }
    }

    const remaining_time = recruitment.finish_at - recruitment.last_progress
    const count_per_ms = recruitment.remaining_count / remaining_time
    const time_elapsed = progress_time - recruitment.last_progress
    const count_since_last = Math.floor(count_per_ms * time_elapsed)

    return {
      count: count + count_since_last,
      recruitment: {
        finish_at: recruitment.finish_at,
        remaining_count: recruitment.remaining_count - count_since_last,
        last_progress: count_since_last ? progress_time : recruitment.last_progress,
        started_at: recruitment.started_at
      }
    }
  }

  static init({
    player_id,
    cell_id
  }: {
    player_id: string
    cell_id: string
  }): TroopEntity[] {
    const troops = Object.values(TroopCode).map(code => TroopEntity.init({
      cell_id,
      player_id,
      code
    }))

    return troops
  }

  static haveEnoughTroops({
    origin_troops,
    move_troops
  }: {
    origin_troops: TroopCount[]
    move_troops: TroopCount[]
  }): boolean {
    const is_missing_troop = move_troops.some(move_troop => {
      const origin_troop = origin_troops.find(troop => troop.code === move_troop.code)
      return (origin_troop?.count ?? 0) < move_troop.count
    })

    return !is_missing_troop
  }

  static splitTroops({
    origin_troops,
    troops_to_split
  }: {
    origin_troops: TroopEntity[]
    troops_to_split: TroopCount[]
  }): {
    updated_origin_troops: TroopEntity[]
    split_troops: TroopEntity[]
  } {
    const updated_origin_troops: TroopEntity[] = []
    const split_troops: TroopEntity[] = []

    origin_troops.forEach(origin_troop => {
      const troop_to_split = troops_to_split.find(t => t.code === origin_troop.code)
      if (!troop_to_split) {
        updated_origin_troops.push(origin_troop)
        return
      }

      updated_origin_troops.push(TroopEntity.create({
        ...origin_troop,
        count: origin_troop.count - troop_to_split.count
      }))

      split_troops.push(TroopEntity.create({
        id: id(),
        code: origin_troop.code,
        player_id: origin_troop.player_id,
        cell_id: origin_troop.cell_id,
        count: troop_to_split.count,
        movement_id: null
      }))
    })

    return {
      updated_origin_troops,
      split_troops
    }
  }

  static mergeTroops({
    movement_troops,
    destination_troops,
  }: {
    movement_troops: TroopEntity[]
    destination_troops: TroopEntity[]
  }): TroopEntity[] {
    const merged_troops = [ ...destination_troops ]

    movement_troops.forEach(movement_troop => {
      const destination_troop_index = merged_troops.findIndex(merged_troop => merged_troop.code === movement_troop.code)
      if (destination_troop_index === -1) {
        merged_troops.push(movement_troop)
      } else {
        const merged_troop_in_destination = TroopEntity.create({
          ...merged_troops[destination_troop_index],
          count: merged_troops[destination_troop_index].count + movement_troop.count,
        })

        merged_troops[destination_troop_index] = merged_troop_in_destination
      }
    })

    return merged_troops
  }

  static mergeTroopsInCell({
    movement_troops,
    destination_troops,
    cell_id
  }: {
    movement_troops: TroopEntity[]
    destination_troops: TroopEntity[]
    cell_id: string
  }) {
    const merged_troops = this.mergeTroops({
      movement_troops,
      destination_troops
    })

    return this.assignToCell({
      troops: merged_troops,
      cell_id
    })
  }

  static createMovement({
    troops,
    start_at,
    distance,
    origin,
    destination,
    player_id,
    action,
    resources = { plastic: 0, mushroom: 0, plasma: 0 },
  }: {
    troops: TroopCount[]
    start_at: number
    distance: number
    origin: Coordinates
    destination: Coordinates
    player_id: string
    action: MovementAction
    resources?: Resource
  }): { movement: MovementEntity; arrive_at: number } {
    const duration = this.getMovementDuration({
      distance,
      troop_codes: troops.map(troop => troop.code)
    })

    const arrive_at = start_at + duration
    const movement = MovementEntity.create({
      id: id(),
      player_id,
      action,
      origin,
      destination,
      resources,
    })

    return { movement, arrive_at }
  }

  static getTotalTransportCapacity({ troops }: { troops: TroopCount[] }): number {
    return troops.reduce((total, troop) => {
      return total + this.getTransportCapacity(troop.code) * troop.count
    }, 0)
  }

  static getTransportLoad({ resources }: { resources: Resource }): number {
    return (
      resources.plastic * resource_transport_weight.plastic
      + resources.mushroom * resource_transport_weight.mushroom
      + resources.plasma * resource_transport_weight.plasma
    )
  }

  static assertTransportResources({
    action,
    resources,
    move_troops,
  }: {
    action: MovementAction
    resources: Resource
    move_troops: TroopCount[]
  }): void {
    const total = resources.plastic + resources.mushroom + resources.plasma
    const load = this.getTransportLoad({ resources })
    const has_resources = total > 0
    const has_negative = resources.plastic < 0 || resources.mushroom < 0 || resources.plasma < 0

    if (has_negative) {
      throw new Error(TroopError.TRANSPORT_RESOURCES_REQUIRED)
    }

    if (action === MovementAction.TRANSPORT) {
      if (!has_resources) {
        throw new Error(TroopError.TRANSPORT_RESOURCES_REQUIRED)
      }
      const capacity = this.getTotalTransportCapacity({ troops: move_troops })
      if (load > capacity) {
        throw new Error(TroopError.TRANSPORT_CAPACITY_EXCEEDED)
      }
      return
    }

    if (has_resources) {
      throw new Error(TroopError.TRANSPORT_RESOURCES_NOT_ALLOWED)
    }
  }

  static sortTroops({ troops } : { troops: TroopEntity[] }): TroopEntity[] {
    return troops.sort((a, b) => this.getOrder(a.code) - this.getOrder(b.code))
  }

  static getMovementDuration({
    distance,
    troop_codes
  }: {
    distance: number
    troop_codes: TroopCode[]
  }): number {
    const slowest_speed = this.getSlowestSpeed({ troop_codes })
    return scaleGameDurationMs(distance / slowest_speed)
  }

  static getSlowestSpeed({ troop_codes }: { troop_codes: TroopCode[] }): number {
    return troop_codes.reduce((acc, code) => {
      const speed = this.getSpeed(code)
      if (speed < acc) {
        return speed
      }

      return acc
    }, Infinity)
  }

  static assignToCell({
    troops,
    cell_id
  }: {
    troops: TroopEntity[]
    cell_id: string
  }): TroopEntity[] {
    return troops.map(troop => troop.assignToCell({ cell_id }))
  }

  static assignToMovement({
    troops,
    movement_id
  }: {
    troops: TroopEntity[]
    movement_id: string
  }): TroopEntity[] {
    return troops.map(troop => troop.assignToMovement({ movement_id }))
  }

  static areTroopsEmpty({ troops }: {
    troops: TroopEntity[]
  }): boolean {
    return !troops.some(troop => troop.count)
  }

  static getTransportCapacity(code: TroopCode): number {
    return troop_characteristics[code].transport_capacity
  }

  static getSpeed(code: TroopCode): number {
    return troop_characteristics[code].speed
  }

  static getOrder(code: TroopCode): number {
    return troop_order[code]
  }

  static getEarningsBySecond({
    code,
    count,
    coefficients,
  }: {
    code: TroopCode.FARMER | TroopCode.RECYCLER
    count: number
    coefficients: Resource
  }): number {
    if (count <= 0) {
      return 0
    }

    const base = troop_earnings[code]
    const coefficient = code === TroopCode.FARMER
      ? coefficients.mushroom
      : coefficients.plastic
    const per_game_second = Math.round(base * count * coefficient * 100) / 100
    return Math.round(per_game_second * gameTimeScale * 100) / 100
  }
}
