import { TroopEntity } from '#core/troop/entity'
import { TroopRepository } from '#app/port/repository/troop'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresTroopRepository
  extends PostgreSQLGenericRepository<'troop', TroopEntity>
  implements TroopRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'troop', TroopError.NOT_FOUND)
  }

  async getById(id: string): Promise<TroopEntity> {
    return this.findByIdOrThrow(id)
  }

  async listByMovement({ movement_id }: { movement_id: string }): Promise<TroopEntity[]> {
    const rows = await this.db
      .selectFrom('troop')
      .selectAll()
      .where('movement_id', '=', movement_id)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async listInCell({
    cell_id,
    player_id
  }: { cell_id: string; player_id: string }): Promise<TroopEntity[]> {
    const rows = await this.db
      .selectFrom('troop')
      .selectAll()
      .where('cell_id', '=', cell_id)
      .where('player_id', '=', player_id)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async getInCell({
    cell_id,
    code
  }: { cell_id: string; code: TroopCode }): Promise<TroopEntity> {
    const row = await this.db
      .selectFrom('troop')
      .selectAll()
      .where('cell_id', '=', cell_id)
      .where('code', '=', code)
      .executeTakeFirst()

    if (!row) {
      throw new Error(TroopError.NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  protected buildFromRow(row: Selectable<DB['troop']>): TroopEntity {
    return TroopEntity.create({
      id: row.id,
      player_id: row.player_id,
      cell_id: row.cell_id,
      code: row.code as TroopCode,
      count: row.count,
      movement_id: row.movement_id
    })
  }

  protected toRow(entity: TroopEntity): Insertable<DB['troop']> {
    return {
      id: entity.id,
      code: entity.code,
      player_id: entity.player_id,
      cell_id: entity.cell_id,
      count: entity.count,
      movement_id: entity.movement_id
    }
  }
}
