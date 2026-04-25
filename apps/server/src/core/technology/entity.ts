import { TechnologyCode } from '#core/technology/constant/code'
import { id } from '#shared/identification'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'
import { TechnologyError } from '#core/technology/error'

type TechnologyEntityProps = BaseEntityProps & {
  code: TechnologyCode
  player_id: string
  level: number
}

export class TechnologyEntity extends BaseEntity {
  readonly code: TechnologyCode
  readonly player_id: string
  readonly level: number

  private constructor({
    id,
    code,
    player_id,
    level
  }: TechnologyEntityProps) {
    super({ id })
    this.code = code
    this.player_id = player_id
    this.level = level
  }

  static create(props: TechnologyEntityProps): TechnologyEntity {
    return new TechnologyEntity(props)
  }

  static init({
    player_id,
    code
  }: { player_id: string, code: TechnologyCode }): TechnologyEntity {
    return new TechnologyEntity({
      id: id(),
      code,
      player_id,
      level: 0,
    })
  }

  assertCanResearch({ is_technology_in_progress }: { is_technology_in_progress: boolean }): void {
    if (is_technology_in_progress) {
      throw new Error(TechnologyError.ALREADY_IN_PROGRESS)
    }
  }

  finishResearch(): TechnologyEntity {
    return new TechnologyEntity({
      ...this,
      level: this.level + 1,
    })
  }
}
