import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostInBounds, OutpostRepository } from '#app/port/repository/outpost'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { OutpostError } from '#core/outpost/error'
import { OutpostType } from '#core/outpost/constant/type'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresOutpostRepository
  extends PostgreSQLGenericRepository<'outpost', OutpostEntity>
  implements OutpostRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'outpost', OutpostError.NOT_FOUND)
  }

  async searchByCell({ cell_id }: { cell_id: string }): Promise<OutpostEntity | null> {
    const row = await this.db
      .selectFrom('outpost')
      .selectAll()
      .where('cell_id', '=', cell_id)
      .executeTakeFirst()

    return row ? this.buildFromRow(row) : null
  }

  async countForPlayer({ player_id }: { player_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('outpost')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('player_id', '=', player_id)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async getById(id: string): Promise<OutpostEntity> {
    return this.findByIdOrThrow(id)
  }

  async existsOnCell({ cell_id }: { cell_id: string }): Promise<boolean> {
    const row = await this.db
      .selectFrom('outpost')
      .select('id')
      .where('cell_id', '=', cell_id)
      .executeTakeFirst()

    return Boolean(row)
  }

  async list({ player_id }: { player_id: string }): Promise<OutpostEntity[]> {
    const rows = await this.db
      .selectFrom('outpost')
      .selectAll()
      .where('player_id', '=', player_id)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async listInBounds({
    min_x,
    max_x,
    min_y,
    max_y
  }: {
    min_x: number
    max_x: number
    min_y: number
    max_y: number
  }): Promise<OutpostInBounds[]> {
    const rows = await this.db
      .selectFrom('outpost')
      .innerJoin('cell', 'cell.id', 'outpost.cell_id')
      .selectAll('outpost')
      .select([
        'cell.x',
        'cell.y'
      ])
      .where('cell.x', '>=', min_x)
      .where('cell.x', '<=', max_x)
      .where('cell.y', '>=', min_y)
      .where('cell.y', '<=', max_y)
      .execute()

    return rows.map(row => ({
      outpost: this.buildFromRow(row),
      coordinates: {
        x: row.x,
        y: row.y
      }
    }))
  }

  async listPermanent(): Promise<OutpostEntity[]> {
    const rows = await this.db
      .selectFrom('outpost')
      .selectAll()
      .where('type', '=', OutpostType.PERMANENT)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  protected buildFromRow(row: Selectable<DB['outpost']>): OutpostEntity {
    return OutpostEntity.create({
      id: row.id,
      player_id: row.player_id,
      cell_id: row.cell_id,
      type: row.type as OutpostType,
      default_combat_strategy: row.default_combat_strategy as CombatStrategy | null,
    })
  }

  protected toRow(entity: OutpostEntity): Insertable<DB['outpost']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      cell_id: entity.cell_id,
      type: entity.type,
      default_combat_strategy: entity.default_combat_strategy,
    }
  }
}
