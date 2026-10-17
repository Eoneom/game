import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { OutpostType } from '#core/outpost/constant/type'
import {
  BaseEntity,
  BaseEntityProps
} from '#core/type/base/entity'

type OutpostEntityProps = BaseEntityProps & {
  player_id: string
  cell_id: string
  type: OutpostType
  default_combat_strategy?: CombatStrategy | null
}

export class OutpostEntity extends BaseEntity {
  readonly player_id: string
  readonly cell_id: string
  readonly type: OutpostType
  readonly default_combat_strategy: CombatStrategy | null

  private constructor({
    id,
    player_id,
    cell_id,
    type,
    default_combat_strategy = null,
  }: OutpostEntityProps) {
    super({ id })

    this.player_id = player_id
    this.cell_id = cell_id
    this.type = type
    this.default_combat_strategy = default_combat_strategy
  }

  static create(props: OutpostEntityProps): OutpostEntity {
    return new OutpostEntity(props)
  }

  isOwnedBy(player_id: string): boolean {
    return this.player_id === player_id
  }

  setPermanent(): OutpostEntity {
    return OutpostEntity.create({
      ...this,
      type: OutpostType.PERMANENT
    })
  }
}
