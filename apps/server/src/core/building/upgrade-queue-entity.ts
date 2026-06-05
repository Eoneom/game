import { BuildingCode } from '#core/building/constant/code'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'

type BuildingUpgradeQueueEntityProps = BaseEntityProps & {
  city_id: string
  building_code: BuildingCode
  created_at: number
}

export class BuildingUpgradeQueueEntity extends BaseEntity {
  readonly city_id: string
  readonly building_code: BuildingCode
  readonly created_at: number

  private constructor({
    id,
    city_id,
    building_code,
    created_at
  }: BuildingUpgradeQueueEntityProps) {
    super({ id })

    this.city_id = city_id
    this.building_code = building_code
    this.created_at = created_at
  }

  static create(props: BuildingUpgradeQueueEntityProps): BuildingUpgradeQueueEntity {
    return new BuildingUpgradeQueueEntity(props)
  }
}
