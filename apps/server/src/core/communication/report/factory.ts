import { ReportEntity } from '#core/communication/report/entity'
import { ReportType } from '#core/communication/value/report-type'
import { TroopEntity } from '#core/troop/entity'
import { MovementEntity } from '#core/troop/movement/entity'
import { id } from '#shared/identification'
import { Resource } from '#shared/resource'

const EMPTY_RESOURCES: Resource = {
  plastic: 0,
  mushroom: 0,
}

type GenerateUnreadParams = {
  type: ReportType
  troops: TroopEntity[]
  movement: MovementEntity
  recorded_at: number
  resources?: Resource
  remaining_resources?: Resource
}

export class ReportFactory {
  static generateUnread({
    type,
    troops,
    movement,
    recorded_at,
    resources = EMPTY_RESOURCES,
    remaining_resources = EMPTY_RESOURCES,
  }: GenerateUnreadParams): ReportEntity {
    const report_troops = troops.map(troop => ({
      code: troop.code,
      count: troop.count
    }))

    return ReportEntity.create({
      id: id(),
      type,
      was_read: false,
      troops: report_troops,
      player_id: movement.player_id,
      recorded_at,
      origin: movement.origin,
      destination: movement.destination,
      resources,
      remaining_resources,
    })
  }
}
