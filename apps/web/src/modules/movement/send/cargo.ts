import { resource_transport_weight } from '@eoneom/api-client'

import { EMPTY_CARGO, MovementSendCargo } from '#movement/send/search'

const KEYS = [ 'plastic', 'mushroom', 'plasma', 'water' ] as const

/** Weighted load (`resource_transport_weight`: plasma and water weigh more). */
export const cargoLoad = (cargo: MovementSendCargo): number =>
  KEYS.reduce((load, key) => load + cargo[key] * resource_transport_weight[key], 0)

/**
 * Cargo actually sent: each resource clamped to the origin stock, then to the capacity left in resource order
 * (URL values may be stale). Water stays 0 from an outpost (slice 035).
 */
export const fitCargo = ({
  cargo,
  stock,
  capacity,
}: {
  cargo: MovementSendCargo
  stock: MovementSendCargo
  capacity: number
}): MovementSendCargo => {
  let remaining = Math.max(0, capacity)
  const fitted = { ...EMPTY_CARGO }
  for (const key of KEYS) {
    const weight = resource_transport_weight[key]
    const amount = Math.min(cargo[key], stock[key], Math.floor(remaining / weight))
    fitted[key] = Math.max(0, amount)
    remaining -= fitted[key] * weight
  }
  return fitted
}

/** Per-resource maximum of the cargo inputs (formula of the former create form). */
export const cargoMaximums = ({
  cargo,
  stock,
  capacity,
}: {
  cargo: MovementSendCargo
  stock: MovementSendCargo
  capacity: number
}): MovementSendCargo => {
  const remaining = Math.max(0, capacity - cargoLoad(cargo))
  return {
    plastic: Math.min(stock.plastic, cargo.plastic + Math.floor(remaining / resource_transport_weight.plastic)),
    mushroom: Math.min(stock.mushroom, cargo.mushroom + Math.floor(remaining / resource_transport_weight.mushroom)),
    plasma: Math.min(stock.plasma, cargo.plasma + Math.floor(remaining / resource_transport_weight.plasma)),
    water: Math.min(stock.water, cargo.water + Math.floor(remaining / resource_transport_weight.water)),
  }
}
