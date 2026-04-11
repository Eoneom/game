import { TroopEntity } from '#core/troop/entity'
import { TroopRepository } from '#app/port/repository/troop'
import { PostgreSQLGenericRepository } from '#adapter/repository/postgres/generic'
import { TroopCode } from '#core/troop/constant/code'
import { TroopError } from '#core/troop/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'
import {
  fromTimestamp,
  toTimestamp
} from '#adapter/repository/postgres/shared/time'

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

  async getInProgress({ cell_id }: { cell_id: string }): Promise<TroopEntity | null> {
    const row = await this.db
      .selectFrom('troop')
      .selectAll()
      .where('cell_id', '=', cell_id)
      .where('recruitment_finish_at', 'is not', null)
      .executeTakeFirst()

    return row ? this.buildFromRow(row) : null
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

  async isInProgress({ cell_id }: { cell_id: string }): Promise<boolean> {
    const row = await this.db
      .selectFrom('troop')
      .select('id')
      .where('cell_id', '=', cell_id)
      .where('recruitment_finish_at', 'is not', null)
      .executeTakeFirst()

    return Boolean(row)
  }

  protected buildFromRow(row: Selectable<DB['troop']>): TroopEntity {
    const finish_at = fromTimestamp(row.recruitment_finish_at)
    const remaining_count = row.recruitment_remaining_count
    const last_progress = fromTimestamp(row.recruitment_last_progress)
    const started_at = fromTimestamp(row.recruitment_started_at)

    return TroopEntity.create({
      id: row.id,
      player_id: row.player_id,
      cell_id: row.cell_id,
      code: row.code as TroopCode,
      count: row.count,
      movement_id: row.movement_id,
      ongoing_recruitment: finish_at !== null &&
        remaining_count !== null &&
        last_progress !== null &&
        started_at !== null
        ? {
          remaining_count,
          finish_at,
          last_progress,
          started_at
        }
        : null
    })
  }

  protected toRow(entity: TroopEntity): Insertable<DB['troop']> {
    const recruitment = entity.ongoing_recruitment

    return {
      id: entity.id,
      code: entity.code,
      player_id: entity.player_id,
      cell_id: entity.cell_id,
      count: entity.count,
      movement_id: entity.movement_id,
      recruitment_finish_at: toTimestamp(recruitment?.finish_at),
      recruitment_remaining_count: recruitment?.remaining_count ?? null,
      recruitment_last_progress: toTimestamp(recruitment?.last_progress),
      recruitment_started_at: toTimestamp(recruitment?.started_at)
    }
  }
}
