import { MovementAction } from '#core/troop/constant/movement-action'
import { BaseEntity } from '#core/type/base/entity'
import { Coordinates } from '#core/world/value/coordinates'

type MovementEntityProps = BaseEntity & {
  player_id: string
  action: MovementAction
  origin: Coordinates
  destination: Coordinates
}

export class MovementEntity extends BaseEntity {
  readonly player_id: string
  readonly action: MovementAction
  readonly origin: Coordinates
  readonly destination: Coordinates

  private constructor({
    id,
    player_id,
    action,
    origin,
    destination,
  }: MovementEntityProps) {
    super({ id })

    this.player_id = player_id
    this.action = action
    this.origin = origin
    this.destination = destination
  }

  static create(props: MovementEntityProps): MovementEntity {
    return new MovementEntity(props)
  }

  isOwnedBy(player_id: string): boolean {
    return this.player_id === player_id
  }
}
