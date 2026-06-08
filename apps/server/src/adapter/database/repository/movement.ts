import { MovementEntity } from '#core/troop/movement/entity'
import { MovementRepository } from '#app/port/repository/movement'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { TroopError } from '#core/troop/error'
import { MovementAction } from '#core/troop/constant/movement-action'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresMovementRepository
  extends PostgreSQLGenericRepository<'movement', MovementEntity>
  implements MovementRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'movement', TroopError.MOVEMENT_NOT_FOUND)
  }

  async getById(id: string): Promise<MovementEntity> {
    return this.findByIdOrThrow(id)
  }

  async list({ player_id }: { player_id: string }): Promise<MovementEntity[]> {
    const rows = await this.db
      .selectFrom('movement')
      .selectAll()
      .where('player_id', '=', player_id)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  protected buildFromRow(row: Selectable<DB['movement']>): MovementEntity {
    return MovementEntity.create({
      id: row.id,
      player_id: row.player_id,
      action: row.action as MovementAction,
      origin: {
        x: row.origin_x,
        y: row.origin_y,
        sector: row.origin_sector
      },
      destination: {
        x: row.destination_x,
        y: row.destination_y,
        sector: row.destination_sector
      },
      resources: {
        plastic: row.plastic,
        mushroom: row.mushroom,
        plasma: row.plasma,
      },
    })
  }

  protected toRow(entity: MovementEntity): Insertable<DB['movement']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      action: entity.action,
      origin_x: entity.origin.x,
      origin_y: entity.origin.y,
      origin_sector: entity.origin.sector,
      destination_x: entity.destination.x,
      destination_y: entity.destination.y,
      destination_sector: entity.destination.sector,
      plastic: entity.resources.plastic,
      mushroom: entity.resources.mushroom,
      plasma: entity.resources.plasma,
    }
  }
}
