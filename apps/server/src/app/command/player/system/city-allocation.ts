import { isCityWarehouseUnderPressure } from '#command/player/system/storage'
import type { Resource, WarehouseCapacity } from '#shared/resource'

export type SystemCityAllocationSignals = {
  production_energy_ratio: number
  resource_stock: Resource
  warehouses_capacity: WarehouseCapacity
  has_pending_recruitment: boolean
  garrison_troop_count: number
  recruit_priority_score: number
}

export function scoreCityForUpgradePriority(signals: SystemCityAllocationSignals): number {
  let score = 0
  if (signals.production_energy_ratio < 1) {
    score -= 40
  }
  if (isCityWarehouseUnderPressure({
    resource_stock: signals.resource_stock,
    warehouses_capacity: signals.warehouses_capacity,
  })) {
    score -= 30
  }
  return score
}

export function scoreCityForRecruitPriority(signals: SystemCityAllocationSignals): number {
  let score = signals.recruit_priority_score
  if (signals.has_pending_recruitment) {
    score += 500
  }
  if (signals.garrison_troop_count === 0) {
    score -= 10
  }
  return score
}

export function sortCitiesByScore<T extends { id: string }>(
  cities: T[],
  score_for_city: (city: T) => number,
): T[] {
  return [ ...cities ].sort((left, right) => {
    const diff = score_for_city(left) - score_for_city(right)
    if (diff !== 0) {
      return diff
    }
    return left.id.localeCompare(right.id)
  })
}
