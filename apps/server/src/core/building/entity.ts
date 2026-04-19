import { BuildingCode } from '#core/building/constant/code'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'
import { BuildingError } from '#core/building/error'

type BuildingEntityProps = BaseEntityProps & {
  city_id: string
  code: BuildingCode
  level: number
}

export class BuildingEntity extends BaseEntity {
  readonly city_id: string
  readonly code: BuildingCode
  readonly level: number

  private constructor({
    id,
    city_id,
    code,
    level
  }: BuildingEntityProps) {
    super({ id })

    this.city_id = city_id
    this.code = code
    this.level = level
  }

  static create(props: BuildingEntityProps): BuildingEntity {
    return new BuildingEntity(props)
  }

  assertCanUpgrade({ is_building_in_progress }: { is_building_in_progress: boolean }): void {
    if (is_building_in_progress) {
      throw new Error(BuildingError.ALREADY_IN_PROGRESS)
    }
  }

  finishUpgrade(): BuildingEntity {
    return new BuildingEntity({
      ...this,
      level: this.level + 1,
    })
  }
}
