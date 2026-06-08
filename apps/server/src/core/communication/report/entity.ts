import { BaseEntity } from '#core/type/base/entity'
import { ReportType } from '#core/communication/value/report-type'
import { Coordinates } from '#core/world/value/coordinates'
import { Resource } from '#shared/resource'
import { TroopCode } from '#core/troop/constant/code'

interface ReportTroop {
  code: TroopCode
  count: number
}

const EMPTY_RESOURCES: Resource = {
  plastic: 0,
  mushroom: 0,
  plasma: 0,
}

type ReportEntityProps = BaseEntity & {
  destination: Coordinates
  origin: Coordinates
  player_id: string
  resource_coefficient?: Resource
  resources?: Resource
  remaining_resources?: Resource
  troops: ReportTroop[]
  type: ReportType
  recorded_at: number
  was_read: boolean
}

export class ReportEntity extends BaseEntity {
  readonly destination: Coordinates
  readonly origin: Coordinates
  readonly player_id: string
  readonly resource_coefficient?: Resource
  readonly resources: Resource
  readonly remaining_resources: Resource
  readonly troops: ReportTroop[]
  readonly type: ReportType
  readonly recorded_at: number
  readonly was_read: boolean

  private constructor({
    id,
    destination,
    origin,
    player_id,
    resource_coefficient,
    resources,
    remaining_resources,
    troops,
    type,
    recorded_at,
    was_read
  }: ReportEntityProps & {
    resources: Resource
    remaining_resources: Resource
  }) {
    super({ id })

    this.destination = destination
    this.origin = origin
    this.player_id = player_id
    this.resource_coefficient = resource_coefficient
    this.resources = resources
    this.remaining_resources = remaining_resources
    this.troops = troops
    this.type = type
    this.recorded_at = recorded_at
    this.was_read = was_read
  }

  static create(props: ReportEntityProps): ReportEntity {
    return new ReportEntity({
      ...props,
      resources: props.resources ?? EMPTY_RESOURCES,
      remaining_resources: props.remaining_resources ?? EMPTY_RESOURCES,
    })
  }

  markAs(read: boolean): ReportEntity {
    return ReportEntity.create({
      ...this,
      was_read: read
    })
  }

  isOwnedBy(player_id: string): boolean {
    return this.player_id === player_id
  }
}
