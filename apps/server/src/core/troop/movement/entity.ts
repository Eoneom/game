import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { MovementAction } from '#core/troop/constant/movement-action'
import { BaseEntity } from '#core/type/base/entity'
import { Resource } from '#shared/resource'
import { Coordinates } from '#core/world/value/coordinates'

type MovementEntityProps = BaseEntity & {
  player_id: string
  action: MovementAction
  origin: Coordinates
  destination: Coordinates
  resources?: Resource
  combat_strategy?: CombatStrategy | null
}

export class MovementEntity extends BaseEntity {
  readonly player_id: string
  readonly action: MovementAction
  readonly origin: Coordinates
  readonly destination: Coordinates
  readonly resources: Resource
  readonly combat_strategy: CombatStrategy | null

  private constructor({
    id,
    player_id,
    action,
    origin,
    destination,
    resources = { plastic: 0, mushroom: 0, plasma: 0 },
    combat_strategy = null,
  }: MovementEntityProps) {
    super({ id })

    this.player_id = player_id
    this.action = action
    this.origin = origin
    this.destination = destination
    this.resources = resources
    this.combat_strategy = combat_strategy
  }

  static create(props: MovementEntityProps): MovementEntity {
    return new MovementEntity(props)
  }

  isOwnedBy(player_id: string): boolean {
    return this.player_id === player_id
  }

  hasResources(): boolean {
    return this.resources.plastic > 0 || this.resources.mushroom > 0 || this.resources.plasma > 0
  }
}
