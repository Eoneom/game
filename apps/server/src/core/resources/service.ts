import {
  STARTING_MUSHROOM,
  STARTING_PLASTIC
} from '#core/city/constant'
import { CityError } from '#core/city/error'
import { Resource, WarehouseCapacity } from '#shared/resource'

export type ResourceStockState = {
  plastic: number
  mushroom: number
  plasma: number
  last_plastic_gather: number
  last_mushroom_gather: number
  last_plasma_gather: number
}

export class ResourcesService {
  static randomIntInclusive({
    max,
    random = Math.random
  }: {
    max: number
    random?: () => number
  }): number {
    return Math.floor(random() * (max + 1))
  }

  /** Initial stock for a new world cell: independent random amounts per resource in [0, STARTING_*]. */
  static randomResourceStockState({
    gather_at,
    random = Math.random
  }: {
    gather_at: number
    random?: () => number
  }): ResourceStockState {
    return {
      plastic: ResourcesService.randomIntInclusive({
        max: STARTING_PLASTIC,
        random 
      }),
      mushroom: ResourcesService.randomIntInclusive({
        max: STARTING_MUSHROOM,
        random 
      }),
      plasma: 0,
      last_plastic_gather: gather_at,
      last_mushroom_gather: gather_at,
      last_plasma_gather: gather_at
    }
  }

  static firstCityCanonicalResourceStockState({ gather_at }: {
    gather_at: number
  }): ResourceStockState {
    return {
      plastic: STARTING_PLASTIC,
      mushroom: STARTING_MUSHROOM,
      plasma: 0,
      last_plastic_gather: gather_at,
      last_mushroom_gather: gather_at,
      last_plasma_gather: gather_at
    }
  }

  static emptyResourceStockState({ gather_at }: {
    gather_at: number
  }): ResourceStockState {
    return {
      plastic: 0,
      mushroom: 0,
      plasma: 0,
      last_plastic_gather: gather_at,
      last_mushroom_gather: gather_at,
      last_plasma_gather: gather_at
    }
  }

  static gatherResourceStock({
    state,
    gather_at_time,
    earnings_per_second,
    warehouses_capacity
  }: {
    state: ResourceStockState
    gather_at_time: number
    earnings_per_second: Resource
    warehouses_capacity: WarehouseCapacity
  }): {
    next: ResourceStockState
    updated: boolean
  } {
    const plastic_earnings = ResourcesService.getEarnings({
      earnings_per_second: earnings_per_second.plastic,
      last_gather_time: state.last_plastic_gather,
      gather_at_time
    })
    const mushroom_earnings = ResourcesService.getEarnings({
      earnings_per_second: earnings_per_second.mushroom,
      last_gather_time: state.last_mushroom_gather,
      gather_at_time
    })
    const plasma_earnings = ResourcesService.getEarnings({
      earnings_per_second: earnings_per_second.plasma,
      last_gather_time: state.last_plasma_gather,
      gather_at_time
    })
    const updated = Boolean(plastic_earnings) || Boolean(mushroom_earnings) || Boolean(plasma_earnings)
    let next = state

    if (plastic_earnings) {
      const capped = ResourcesService.getCappedEarnings({
        earnings: plastic_earnings,
        capacity: warehouses_capacity.plastic,
        current_resource: next.plastic
      })
      next = {
        ...next,
        last_plastic_gather: gather_at_time,
        plastic: next.plastic + capped
      }
    }

    if (mushroom_earnings) {
      const capped = ResourcesService.getCappedEarnings({
        earnings: mushroom_earnings,
        capacity: warehouses_capacity.mushroom,
        current_resource: next.mushroom
      })
      next = {
        ...next,
        last_mushroom_gather: gather_at_time,
        mushroom: next.mushroom + capped
      }
    }

    if (plasma_earnings) {
      next = {
        ...next,
        last_plasma_gather: gather_at_time,
        plasma: next.plasma + plasma_earnings
      }
    }

    return {
      next,
      updated 
    }
  }

  static purchaseResourceStock({
    state,
    resource
  }: {
    state: ResourceStockState
    resource: Resource
  }): ResourceStockState {
    if (
      state.plastic < resource.plastic ||
      state.mushroom < resource.mushroom ||
      state.plasma < resource.plasma
    ) {
      throw new Error(CityError.NOT_ENOUGH_RESOURCES)
    }
    return {
      ...state,
      plastic: state.plastic - resource.plastic,
      mushroom: state.mushroom - resource.mushroom,
      plasma: state.plasma - resource.plasma
    }
  }

  static refundResourceStock({
    state,
    resource
  }: {
    state: ResourceStockState
    resource: Resource
  }): ResourceStockState {
    return {
      ...state,
      plastic: state.plastic + resource.plastic,
      mushroom: state.mushroom + resource.mushroom,
      plasma: state.plasma + resource.plasma
    }
  }

  static depositUpToCapacity({
    state,
    resource,
    warehouses_capacity
  }: {
    state: ResourceStockState
    resource: Resource
    warehouses_capacity: WarehouseCapacity
  }): {
    next: ResourceStockState
    deposited: Resource
    remaining: Resource
  } {
    const plastic_deposited = Math.min(
      resource.plastic,
      Math.max(0, warehouses_capacity.plastic - state.plastic)
    )
    const mushroom_deposited = Math.min(
      resource.mushroom,
      Math.max(0, warehouses_capacity.mushroom - state.mushroom)
    )
    const plasma_deposited = resource.plasma

    return {
      next: {
        ...state,
        plastic: state.plastic + plastic_deposited,
        mushroom: state.mushroom + mushroom_deposited,
        plasma: state.plasma + plasma_deposited
      },
      deposited: {
        plastic: plastic_deposited,
        mushroom: mushroom_deposited,
        plasma: plasma_deposited
      },
      remaining: {
        plastic: resource.plastic - plastic_deposited,
        mushroom: resource.mushroom - mushroom_deposited,
        plasma: 0
      }
    }
  }

  static computeWarehouseFullInSeconds({
    space_remaining,
    earnings_per_second,
  }: {
    space_remaining: number
    earnings_per_second: number
  }): number {
    const remaining = Math.max(0, space_remaining)
    if (remaining === 0) {
      return 0
    }
    if (earnings_per_second <= 0) {
      return 0
    }
    return remaining / earnings_per_second
  }

  private static getCappedEarnings({
    earnings,
    capacity,
    current_resource
  }: {
    earnings: number
    capacity: number
    current_resource: number
  }): number {
    return earnings + current_resource > capacity ? capacity - current_resource : earnings
  }

  private static getEarnings({
    earnings_per_second,
    last_gather_time,
    gather_at_time,
  }: {
    earnings_per_second: number
    last_gather_time: number
    gather_at_time: number
  }): number {
    if (gather_at_time < last_gather_time) {
      return 0
    }

    const seconds_since_last_gather = Math.floor((gather_at_time - last_gather_time) / 1000)
    if (seconds_since_last_gather < 1) {
      return 0
    }

    return Math.floor(seconds_since_last_gather * earnings_per_second)
  }
}
