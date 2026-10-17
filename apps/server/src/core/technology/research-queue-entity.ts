import { TechnologyCode } from '#core/technology/constant/code'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'

type TechnologyResearchQueueEntityProps = BaseEntityProps & {
  player_id: string
  city_id: string
  technology_code: TechnologyCode
  created_at: number
}

export class TechnologyResearchQueueEntity extends BaseEntity {
  readonly player_id: string
  readonly city_id: string
  readonly technology_code: TechnologyCode
  readonly created_at: number

  private constructor({
    id,
    player_id,
    city_id,
    technology_code,
    created_at
  }: TechnologyResearchQueueEntityProps) {
    super({ id })

    this.player_id = player_id
    this.city_id = city_id
    this.technology_code = technology_code
    this.created_at = created_at
  }

  static create(props: TechnologyResearchQueueEntityProps): TechnologyResearchQueueEntity {
    return new TechnologyResearchQueueEntity(props)
  }
}
