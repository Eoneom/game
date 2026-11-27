import { DefenseCode } from '#core/defense/constant/code'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'

type DefenseBuildQueueEntityProps = BaseEntityProps & {
  player_id: string
  city_id: string
  defense_code: DefenseCode
  count: number
  created_at: number
}

export class DefenseBuildQueueEntity extends BaseEntity {
  readonly player_id: string
  readonly city_id: string
  readonly defense_code: DefenseCode
  readonly count: number
  readonly created_at: number

  private constructor({
    id,
    player_id,
    city_id,
    defense_code,
    count,
    created_at
  }: DefenseBuildQueueEntityProps) {
    super({ id })

    this.player_id = player_id
    this.city_id = city_id
    this.defense_code = defense_code
    this.count = count
    this.created_at = created_at
  }

  static create(props: DefenseBuildQueueEntityProps): DefenseBuildQueueEntity {
    return new DefenseBuildQueueEntity(props)
  }
}
