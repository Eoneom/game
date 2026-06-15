import { FactionCode } from '#core/faction/constant/code'
import { id } from '#shared/identification'
import { BaseEntity } from '#core/type/base/entity'

export type PlayerEntityProps = BaseEntity & {
  name: string
  faction_code: FactionCode
}

export class PlayerEntity extends BaseEntity {
  readonly name: string
  readonly faction_code: FactionCode

  private constructor({
    id,
    name,
    faction_code
  }: PlayerEntityProps) {
    super({ id })

    this.name = name
    this.faction_code = faction_code
  }

  static create(props: PlayerEntityProps): PlayerEntity {
    return new PlayerEntity(props)
  }

  static initPlayer({
    name,
    faction_code
  }: {
    name: string
    faction_code: FactionCode
  }): PlayerEntity {
    return new PlayerEntity({
      id: id(),
      name,
      faction_code
    })
  }
}
