import { FactionCode } from '#core/faction/constant/code'
import { id } from '#shared/identification'
import { BaseEntity } from '#core/type/base/entity'

export type PlayerEntityProps = BaseEntity & {
  name: string
  faction_code: FactionCode
  system_controlled: boolean
}

export class PlayerEntity extends BaseEntity {
  readonly name: string
  readonly faction_code: FactionCode
  readonly system_controlled: boolean

  private constructor({
    id,
    name,
    faction_code,
    system_controlled
  }: PlayerEntityProps) {
    super({ id })

    this.name = name
    this.faction_code = faction_code
    this.system_controlled = system_controlled
  }

  static create(props: PlayerEntityProps): PlayerEntity {
    return new PlayerEntity(props)
  }

  static initPlayer({
    name,
    faction_code,
    system_controlled = false
  }: {
    name: string
    faction_code: FactionCode
    system_controlled?: boolean
  }): PlayerEntity {
    return new PlayerEntity({
      id: id(),
      name,
      faction_code,
      system_controlled
    })
  }
}
