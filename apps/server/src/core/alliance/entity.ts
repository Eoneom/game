import { FactionCode } from '#core/faction/constant/code'
import { BaseEntity } from '#core/type/base/entity'

type AllianceEntityProps = BaseEntity & {
  name: string
  tag: string
  description: string
  faction_code: FactionCode
  created_at: number
}

/** A named group of Players of the same Faction who coordinate (slice 033). */
export class AllianceEntity extends BaseEntity {
  readonly name: string
  readonly tag: string
  readonly description: string
  readonly faction_code: FactionCode
  readonly created_at: number

  private constructor(props: AllianceEntityProps) {
    super({ id: props.id })

    this.name = props.name
    this.tag = props.tag
    this.description = props.description
    this.faction_code = props.faction_code
    this.created_at = props.created_at
  }

  static create(props: AllianceEntityProps): AllianceEntity {
    return new AllianceEntity(props)
  }

  withDescription(description: string): AllianceEntity {
    return AllianceEntity.create({
      ...this,
      description
    })
  }
}
