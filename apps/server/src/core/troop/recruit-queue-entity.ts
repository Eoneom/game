import { TroopCode } from '#core/troop/constant/code'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'

type TroopRecruitQueueEntityProps = BaseEntityProps & {
  player_id: string
  city_id: string
  troop_code: TroopCode
  count: number
  created_at: number
}

export class TroopRecruitQueueEntity extends BaseEntity {
  readonly player_id: string
  readonly city_id: string
  readonly troop_code: TroopCode
  readonly count: number
  readonly created_at: number

  private constructor({
    id,
    player_id,
    city_id,
    troop_code,
    count,
    created_at
  }: TroopRecruitQueueEntityProps) {
    super({ id })

    this.player_id = player_id
    this.city_id = city_id
    this.troop_code = troop_code
    this.count = count
    this.created_at = created_at
  }

  static create(props: TroopRecruitQueueEntityProps): TroopRecruitQueueEntity {
    return new TroopRecruitQueueEntity(props)
  }
}
