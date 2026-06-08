import {
  ResourceStockState,
  ResourcesService
} from '#core/resources/service'
import { id } from '#shared/identification'
import { Resource, WarehouseCapacity } from '#shared/resource'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'

type ResourceStockEntityProps = BaseEntityProps & {
  cell_id: string
} & ResourceStockState

export class ResourceStockEntity extends BaseEntity {
  readonly cell_id: string
  readonly plastic: number
  readonly mushroom: number
  readonly plasma: number
  readonly last_plastic_gather: number
  readonly last_mushroom_gather: number
  readonly last_plasma_gather: number

  private constructor(props: ResourceStockEntityProps) {
    super({ id: props.id })
    this.cell_id = props.cell_id
    this.plastic = props.plastic
    this.mushroom = props.mushroom
    this.plasma = props.plasma
    this.last_plastic_gather = props.last_plastic_gather
    this.last_mushroom_gather = props.last_mushroom_gather
    this.last_plasma_gather = props.last_plasma_gather
  }

  static create(props: ResourceStockEntityProps): ResourceStockEntity {
    return new ResourceStockEntity(props)
  }

  static initForWorldCell({
    cell_id,
    gather_at,
    random
  }: {
    cell_id: string
    gather_at: number
    random?: () => number
  }): ResourceStockEntity {
    const state = ResourcesService.randomResourceStockState({
      gather_at,
      random 
    })
    return ResourceStockEntity.create({
      id: id(),
      cell_id,
      ...state
    })
  }

  static initCanonicalFirstCity({
    cell_id,
    gather_at
  }: {
    cell_id: string
    gather_at: number
  }): ResourceStockEntity {
    const state = ResourcesService.firstCityCanonicalResourceStockState({ gather_at })
    return ResourceStockEntity.create({
      id: id(),
      cell_id,
      ...state
    })
  }

  withState(state: ResourceStockState): ResourceStockEntity {
    return ResourceStockEntity.create({
      id: this.id,
      cell_id: this.cell_id,
      ...state
    })
  }

  gather({
    gather_at_time,
    earnings_per_second,
    warehouses_capacity
  }: {
    gather_at_time: number
    earnings_per_second: Resource
    warehouses_capacity: WarehouseCapacity
  }): {
    stock: ResourceStockEntity
    updated: boolean
  } {
    const {
      next, updated 
    } = ResourcesService.gatherResourceStock({
      state: this.toState(),
      gather_at_time,
      earnings_per_second,
      warehouses_capacity
    })
    return {
      stock: this.withState(next),
      updated
    }
  }

  purchase({ resource }: { resource: Resource }): ResourceStockEntity {
    const next = ResourcesService.purchaseResourceStock({
      state: this.toState(),
      resource 
    })
    return this.withState(next)
  }

  refund({ resource }: { resource: Resource }): ResourceStockEntity {
    const next = ResourcesService.refundResourceStock({
      state: this.toState(),
      resource 
    })
    return this.withState(next)
  }

  depositUpToCapacity({
    resource,
    warehouses_capacity
  }: {
    resource: Resource
    warehouses_capacity: WarehouseCapacity
  }): {
    stock: ResourceStockEntity
    deposited: Resource
    remaining: Resource
  } {
    const { next, deposited, remaining } = ResourcesService.depositUpToCapacity({
      state: this.toState(),
      resource,
      warehouses_capacity
    })
    return {
      stock: this.withState(next),
      deposited,
      remaining
    }
  }

  private toState(): ResourceStockState {
    return {
      plastic: this.plastic,
      mushroom: this.mushroom,
      plasma: this.plasma,
      last_plastic_gather: this.last_plastic_gather,
      last_mushroom_gather: this.last_mushroom_gather,
      last_plasma_gather: this.last_plasma_gather
    }
  }
}
