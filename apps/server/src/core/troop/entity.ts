import assert from 'assert'

import { TroopCode } from '#core/troop/constant/code'
import { BaseEntity } from '#core/type/base/entity'
import { id } from '#shared/identification'

type TroopEntityProps = BaseEntity & {
  code: TroopCode
  player_id: string
  cell_id: string | null
  count: number
  movement_id: string | null
}

export class TroopEntity extends BaseEntity {
  readonly code: TroopCode
  readonly count: number
  readonly player_id: string
  readonly cell_id: string | null
  readonly movement_id: string | null

  private constructor({
    id,
    cell_id,
    player_id,
    code,
    count,
    movement_id
  }: TroopEntityProps) {
    super({ id })

    this.player_id = player_id
    this.cell_id = cell_id
    this.code = code
    this.count = count
    this.movement_id = movement_id
  }

  static create(props: TroopEntityProps): TroopEntity {
    assert(Boolean(props.cell_id) !== Boolean(props.movement_id))
    return new TroopEntity(props)
  }

  static init({
    player_id,
    cell_id,
    code
  }: {
    player_id: string
    cell_id: string
    code: TroopCode
  }): TroopEntity {
    return new TroopEntity({
      id: id(),
      code,
      player_id,
      cell_id,
      count: 0,
      movement_id: null
    })
  }

  assignToCell({ cell_id }: {cell_id: string}): TroopEntity {
    return TroopEntity.create({
      ...this,
      cell_id,
      movement_id: null
    })
  }

  assignToMovement({ movement_id }: { movement_id: string }): TroopEntity {
    return TroopEntity.create({
      ...this,
      movement_id,
      cell_id: null
    })
  }

  removeCount(count_to_remove: number): TroopEntity {
    assert(count_to_remove <= this.count)

    return TroopEntity.create({
      ...this,
      count: this.count - count_to_remove
    })
  }

  isOwnedBy(player_id: string): boolean {
    return this.player_id === player_id
  }
}
