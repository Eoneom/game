import { DefenseCode } from '#core/defense/constant/code'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'
import { id } from '#shared/identification'

type DefenseEntityProps = BaseEntityProps & {
  player_id: string
  city_id: string
  code: DefenseCode
  count: number
}

export class DefenseEntity extends BaseEntity {
  readonly player_id: string
  readonly city_id: string
  readonly code: DefenseCode
  readonly count: number

  private constructor({
    id,
    player_id,
    city_id,
    code,
    count
  }: DefenseEntityProps) {
    super({ id })

    this.player_id = player_id
    this.city_id = city_id
    this.code = code
    this.count = count
  }

  static create(props: DefenseEntityProps): DefenseEntity {
    return new DefenseEntity(props)
  }

  static init({
    player_id,
    city_id,
    code
  }: {
    player_id: string
    city_id: string
    code: DefenseCode
  }): DefenseEntity {
    return new DefenseEntity({
      id: id(),
      player_id,
      city_id,
      code,
      count: 0
    })
  }
}
