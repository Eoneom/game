/** Catalogues sharing the card grid (slice 043). */
export type CatalogueKind = 'building' | 'technology' | 'troop' | 'defense'

export interface CatalogueResources {
  plastic: number
  mushroom: number
  plasma: number
  /** Nothing costs water yet (slice 035); a chip shows only when > 0. */
  water?: number
}

/** A requirement entry the city or player does not meet yet, already named for display. */
export interface CatalogueUnmetRequirement {
  name: string
  level: number
}

export type CatalogueCardState =
  | { kind: 'in_progress', remaining_seconds?: number, remaining_units?: number }
  | { kind: 'queued', count: number, target_level?: number }
  | { kind: 'missing_requirement', first: CatalogueUnmetRequirement, more: number }
  | { kind: 'capped', reason: 'building_levels' | 'defense_capacity' }
  | { kind: 'queue_full' }
  | { kind: 'insufficient_resources', affordable_in_seconds?: number, warehouse_too_small: boolean }
  | { kind: 'available', catalogue: CatalogueKind }
  /** Read-only cards (outpost troops): no badge. */
  | { kind: 'none' }

export interface CatalogueCityResources {
  stock: Required<CatalogueResources>
  earnings_per_second: Required<CatalogueResources>
  /** Plastic and mushroom only: plasma and water have no warehouse cap. */
  warehouses_capacity: { plastic: number, mushroom: number }
}

export interface CatalogueCardStateInput {
  catalogue: CatalogueKind
  /** This entry is the active upgrade / research / batch. */
  in_progress?: { remaining_seconds?: number, remaining_units?: number }
  /** Rows of this entry in the waiting queue. */
  queued?: { count: number, target_level?: number }
  unmet_requirements?: CatalogueUnmetRequirement[]
  /** City building level cap; pass it for capped buildings only (`building/layer.ts`). */
  level_cap?: { used: number, maximum: number }
  /** Free defense points of the city and the points of one unit (`defense/capacity.ts`). */
  defense_capacity?: { free: number, points: number }
  /** Queue of the catalogue: `active` when something else runs; `limit` 0 means no waiting slot. */
  queue?: { active: boolean, length: number, limit: number }
  /** Cost of the next level or of one unit. */
  cost?: CatalogueResources
  /** City stock, rates and warehouses (`GET /city/:city_id`); no resource check without it. */
  city?: CatalogueCityResources
}

const resource_keys = [ 'plastic', 'mushroom', 'plasma', 'water' ] as const
const warehouse_keys = [ 'plastic', 'mushroom' ] as const

const resourceState = (
  cost: CatalogueResources,
  city: CatalogueCityResources
): CatalogueCardState | null => {
  const short = resource_keys.filter(key => (cost[key] ?? 0) > city.stock[key])
  if (short.length === 0) {
    return null
  }

  const warehouse_too_small = warehouse_keys.some(key => cost[key] > city.warehouses_capacity[key])
  const affordable = !warehouse_too_small && short.every(key => city.earnings_per_second[key] > 0)
  const affordable_in_seconds = affordable
    ? Math.max(...short.map(key => Math.ceil(((cost[key] ?? 0) - city.stock[key]) / city.earnings_per_second[key])))
    : undefined

  return {
    kind: 'insufficient_resources',
    warehouse_too_small,
    ...(affordable_in_seconds !== undefined ? { affordable_in_seconds } : {}),
  }
}

/**
 * State of a catalogue card: the first matching state in the order of slice 043
 * (in progress, queued, missing requirement, capped, queue full, insufficient resources, available).
 */
export const catalogueCardState = (input: CatalogueCardStateInput): CatalogueCardState => {
  if (input.in_progress) {
    return { kind: 'in_progress', ...input.in_progress }
  }

  if (input.queued && input.queued.count > 0) {
    return { kind: 'queued', ...input.queued }
  }

  const unmet = input.unmet_requirements ?? []
  if (unmet.length > 0) {
    return { kind: 'missing_requirement', first: unmet[0], more: unmet.length - 1 }
  }

  if (input.level_cap && input.level_cap.used >= input.level_cap.maximum) {
    return { kind: 'capped', reason: 'building_levels' }
  }

  if (input.defense_capacity && input.defense_capacity.free < input.defense_capacity.points) {
    return { kind: 'capped', reason: 'defense_capacity' }
  }

  if (input.queue?.active && input.queue.length >= input.queue.limit) {
    return { kind: 'queue_full' }
  }

  if (input.cost && input.city) {
    const resources = resourceState(input.cost, input.city)
    if (resources) {
      return resources
    }
  }

  return { kind: 'available', catalogue: input.catalogue }
}

/** Cards shown at reduced emphasis. */
export const isDimmedCardState = (state: CatalogueCardState): boolean =>
  state.kind === 'missing_requirement' || state.kind === 'capped'

/** Cards « Masquer les verrouillés » hides. */
export const isLockedCardState = (state: CatalogueCardState): boolean =>
  state.kind === 'missing_requirement'
