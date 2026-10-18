import { systemExpansionOutpostResourceScore } from '#core/player/system/expansion-cell'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { TroopRole } from '#core/troop/constant/role'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import type { CellEntity } from '#core/world/cell/entity'
import { Resource, WarehouseCapacity } from '#shared/resource'
import {
  isPermanentOutpostStockWorthTransport,
  SYSTEM_OUTPOST_TRANSPORT_PRESSURE_FILL_RATIO,
} from '#command/player/system/transport'

export type SystemOutpostDeployRole = TroopRole.CULTIVATOR | TroopRole.SALVAGER | TroopRole.CARRIER

export type SystemOutpostDeployCandidate = {
  outpost: OutpostEntity
  cell: CellEntity
  stock: Resource
  troops: TroopEntity[]
  resource_score: number
  missing_roles: SystemOutpostDeployRole[]
}

function roleCount(troops: TroopEntity[], role: TroopRole): number {
  const troop = TroopService.findByRole({
    troops,
    role,
  })
  return troop?.count ?? 0
}

export function missingGathererRolesOnOutpost({
  cell,
  troops,
}: {
  cell: CellEntity
  troops: TroopEntity[]
}): SystemOutpostDeployRole[] {
  const missing: SystemOutpostDeployRole[] = []
  if (cell.resource_coefficient.mushroom > 0 && roleCount(troops, TroopRole.CULTIVATOR) < 1) {
    missing.push(TroopRole.CULTIVATOR)
  }
  if (cell.resource_coefficient.plastic > 0 && roleCount(troops, TroopRole.SALVAGER) < 1) {
    missing.push(TroopRole.SALVAGER)
  }
  return missing
}

export function outpostNeedsCarrier({
  cell,
  troops,
  stock,
  warehouses_capacity,
}: {
  cell: CellEntity
  troops: TroopEntity[]
  stock: Resource
  warehouses_capacity: WarehouseCapacity
}): boolean {
  if (roleCount(troops, TroopRole.CARRIER) >= 1) {
    return false
  }
  const has_gatherer = (cell.resource_coefficient.mushroom > 0 && roleCount(troops, TroopRole.CULTIVATOR) >= 1)
    || (cell.resource_coefficient.plastic > 0 && roleCount(troops, TroopRole.SALVAGER) >= 1)
  if (has_gatherer) {
    return true
  }
  return isPermanentOutpostStockWorthTransport({
    stock,
    warehouses_capacity,
    pressure_fill_ratio: SYSTEM_OUTPOST_TRANSPORT_PRESSURE_FILL_RATIO,
  })
}

export function buildOutpostDeployCandidate({
  outpost,
  cell,
  stock,
  troops,
  warehouses_capacity,
}: {
  outpost: OutpostEntity
  cell: CellEntity
  stock: Resource
  troops: TroopEntity[]
  warehouses_capacity: WarehouseCapacity
}): SystemOutpostDeployCandidate | null {
  if (outpost.type !== OutpostType.PERMANENT) {
    return null
  }
  const missing_roles: SystemOutpostDeployRole[] = [
    ...missingGathererRolesOnOutpost({
      cell,
      troops,
    }),
  ]
  if (outpostNeedsCarrier({
    cell,
    troops,
    stock,
    warehouses_capacity,
  })) {
    missing_roles.push(TroopRole.CARRIER)
  }
  if (missing_roles.length === 0) {
    return null
  }
  return {
    outpost,
    cell,
    stock,
    troops,
    resource_score: systemExpansionOutpostResourceScore(cell),
    missing_roles,
  }
}

export function sortOutpostDeployCandidates(
  candidates: SystemOutpostDeployCandidate[],
): SystemOutpostDeployCandidate[] {
  return [ ...candidates ].sort((left, right) => {
    if (right.resource_score !== left.resource_score) {
      return right.resource_score - left.resource_score
    }
    if (left.cell.coordinates.x !== right.cell.coordinates.x) {
      return left.cell.coordinates.x - right.cell.coordinates.x
    }
    return left.cell.coordinates.y - right.cell.coordinates.y
  })
}

export function needsOutpostLogistics({
  needs_harvester_on_outpost,
  needs_reclaimer_on_outpost,
  needs_carrier_on_outpost,
}: {
  needs_harvester_on_outpost: boolean
  needs_reclaimer_on_outpost: boolean
  needs_carrier_on_outpost: boolean
}): boolean {
  return needs_harvester_on_outpost
    || needs_reclaimer_on_outpost
    || needs_carrier_on_outpost
}
