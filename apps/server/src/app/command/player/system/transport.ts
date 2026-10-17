import { systemExpansionOutpostResourceScore } from '#core/player/system/expansion-cell'
import { TroopCode } from '#core/troop/constant/code'
import { resource_transport_weight } from '#core/troop/constant/transport-weight'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import { TroopCount } from '#core/troop/type'
import { Coordinates } from '#core/world/value/coordinates'
import type { CellEntity } from '#core/world/cell/entity'
import { OutpostEntity } from '#core/outpost/entity'
import { Resource, WarehouseCapacity } from '#shared/resource'
import {
  isStorageResourcePressured,
  resourcesForTransportToDestination,
} from '#command/player/system/storage'

export function isPermanentOutpostStockWorthTransport({
  stock,
  warehouses_capacity,
}: {
  stock: Resource
  warehouses_capacity: WarehouseCapacity
}): boolean {
  if (stock.plasma > 0) {
    return true
  }
  return isStorageResourcePressured({
    stock: stock.plastic,
    capacity: warehouses_capacity.plastic,
  })
    || isStorageResourcePressured({
      stock: stock.mushroom,
      capacity: warehouses_capacity.mushroom,
    })
}

export function clampResourcesToTransportCapacity({
  resources,
  capacity,
}: {
  resources: Resource
  capacity: number
}): Resource {
  if (capacity <= 0) {
    return {
      plastic: 0,
      mushroom: 0,
      plasma: 0,
    }
  }

  const plasma = Math.min(
    resources.plasma,
    Math.floor(capacity / resource_transport_weight.plasma),
  )
  let remaining = capacity - plasma * resource_transport_weight.plasma

  const mushroom = Math.min(resources.mushroom, remaining)
  remaining -= mushroom * resource_transport_weight.mushroom

  const plastic = Math.min(resources.plastic, remaining)

  return {
    plastic,
    mushroom,
    plasma,
  }
}

export function carrierTroopsForTransportLoad({
  hauler,
  load,
}: {
  hauler: TroopEntity
  load: number
}): TroopCount[] {
  if (load <= 0 || hauler.count < 1) {
    return []
  }
  const unit_capacity = TroopService.getTransportCapacity(hauler.code)
  const needed = Math.min(
    hauler.count,
    Math.max(1, Math.ceil(load / unit_capacity)),
  )
  return [
    {
      code: hauler.code,
      count: needed,
    },
  ]
}

export function deliverableResourceTotal({
  origin_stock,
  destination_space_remaining,
}: {
  origin_stock: Resource
  destination_space_remaining: WarehouseCapacity
}): number {
  const resources = resourcesForTransportToDestination({
    origin_stock,
    destination_space_remaining,
  })
  return resources.plastic + resources.mushroom + resources.plasma
}

export type SystemTransportCityCandidate = {
  city_id: string
  city_name: string
  coordinates: Coordinates
  warehouse_space_remaining: WarehouseCapacity
}

export function pickCityForSystemTransport({
  origin_stock,
  cities,
}: {
  origin_stock: Resource
  cities: SystemTransportCityCandidate[]
}): SystemTransportCityCandidate | null {
  let best: SystemTransportCityCandidate | null = null
  let best_score = 0

  for (const city of cities) {
    const score = deliverableResourceTotal({
      origin_stock,
      destination_space_remaining: city.warehouse_space_remaining,
    })
    if (score > best_score) {
      best_score = score
      best = city
    }
  }

  return best_score > 0 ? best : null
}

export type SystemTransportOutpostCandidate = {
  outpost: OutpostEntity
  cell: CellEntity
  stock: Resource
}

export function sortOutpostsForSystemTransport(
  candidates: SystemTransportOutpostCandidate[],
): SystemTransportOutpostCandidate[] {
  return [ ...candidates ].sort((left, right) => {
    const left_total = left.stock.plastic + left.stock.mushroom + left.stock.plasma
    const right_total = right.stock.plastic + right.stock.mushroom + right.stock.plasma
    if (right_total !== left_total) {
      return right_total - left_total
    }
    const score_delta = systemExpansionOutpostResourceScore(right.cell)
      - systemExpansionOutpostResourceScore(left.cell)
    if (score_delta !== 0) {
      return score_delta
    }
    if (left.cell.coordinates.x !== right.cell.coordinates.x) {
      return left.cell.coordinates.x - right.cell.coordinates.x
    }
    return left.cell.coordinates.y - right.cell.coordinates.y
  })
}

export function hasTransportableStock(stock: Resource): boolean {
  return stock.plastic + stock.mushroom + stock.plasma > 0
}
