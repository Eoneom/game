import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { MovementAction } from '#core/troop/constant/movement-action'
import { MovementKind } from '#core/troop/constant/movement-kind'
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
  /** Exchange convoy and its carriers' return trip (slice 035): not counted toward the movement cap. */
  exchange_trade_id?: string | null
  /** Troops going home on their own: return trips, automatic reinforcement return, owner recall (slice 045). */
  is_return?: boolean
}

export class MovementEntity extends BaseEntity {
  readonly player_id: string
  readonly action: MovementAction
  readonly origin: Coordinates
  readonly destination: Coordinates
  readonly resources: Resource
  readonly combat_strategy: CombatStrategy | null
  readonly exchange_trade_id: string | null
  readonly is_return: boolean

  private constructor({
    id,
    player_id,
    action,
    origin,
    destination,
    resources = {
      plastic: 0,
      mushroom: 0,
      plasma: 0,
      water: 0,
    },
    combat_strategy = null,
    exchange_trade_id = null,
    is_return = false,
  }: MovementEntityProps) {
    super({ id })

    this.player_id = player_id
    this.action = action
    this.origin = origin
    this.destination = destination
    this.resources = resources
    this.combat_strategy = combat_strategy
    this.exchange_trade_id = exchange_trade_id
    this.is_return = is_return
  }

  static create(props: MovementEntityProps): MovementEntity {
    return new MovementEntity(props)
  }

  isOwnedBy(player_id: string): boolean {
    return this.player_id === player_id
  }

  /** Movements page tab (slice 045): exchange convoys first, then return trips; everything else is outgoing. */
  getKind(): MovementKind {
    if (this.exchange_trade_id !== null) {
      return MovementKind.CONVOY
    }
    return this.is_return ? MovementKind.RETURN : MovementKind.OUTGOING
  }

  hasResources(): boolean {
    return this.resources.plastic > 0
      || this.resources.mushroom > 0
      || this.resources.plasma > 0
      || this.resources.water > 0
  }
}
