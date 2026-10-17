import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { id } from '#shared/identification'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'

type CityEntityProps = BaseEntityProps & {
  player_id: string
  name: string
  cell_id: string
  default_combat_strategy?: CombatStrategy | null
}

export class CityEntity extends BaseEntity {
  readonly player_id: string
  readonly name: string
  readonly cell_id: string
  readonly default_combat_strategy: CombatStrategy | null

  private constructor({
    id,
    player_id,
    name,
    cell_id,
    default_combat_strategy = null,
  }: CityEntityProps) {
    super({ id })

    this.player_id = player_id
    this.name = name
    this.cell_id = cell_id
    this.default_combat_strategy = default_combat_strategy
  }

  static create(props: CityEntityProps): CityEntity {
    return new CityEntity(props)
  }

  static initCity({
    name,
    player_id,
    cell_id
  }: {
    name: string
    player_id: string
    cell_id: string
  }): CityEntity {
    return new CityEntity({
      id: id(),
      player_id,
      name,
      cell_id
    })
  }

  isOwnedBy(player_id: string): boolean {
    return this.player_id === player_id
  }
}
