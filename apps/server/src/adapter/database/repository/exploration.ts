import { ExplorationEntity } from '#core/world/exploration/entity'
import { ExplorationRepository } from '#app/port/repository/exploration'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { withTransaction } from '#adapter/database/context'
import { WorldError } from '#core/world/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresExplorationRepository
  extends PostgreSQLGenericRepository<'exploration', ExplorationEntity>
  implements ExplorationRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'exploration', WorldError.EXPLORATION_NOT_FOUND)
  }

  async get({ player_id }: { player_id: string }): Promise<ExplorationEntity> {
    const row = await this.db
      .selectFrom('exploration')
      .selectAll()
      .where('player_id', '=', player_id)
      .executeTakeFirst()

    if (!row) {
      throw new Error(WorldError.EXPLORATION_NOT_FOUND)
    }

    return this.loadEntity(row)
  }

  override async findById(id: string): Promise<ExplorationEntity | null> {
    const row = await this.db
      .selectFrom('exploration')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) {
      return null
    }

    return this.loadEntity(row)
  }

  override async create(entity: ExplorationEntity | Omit<ExplorationEntity, 'id'>): Promise<string> {
    const with_id = entity as ExplorationEntity

    return withTransaction(async () => {
      let exploration_id: string

      if (with_id.id) {
        await this.db
          .insertInto('exploration')
          .values({
            id: with_id.id,
            player_id: with_id.player_id
          })
          .onConflict((oc) => oc
            .column('id')
            .doUpdateSet({ player_id: with_id.player_id }))
          .execute()
        exploration_id = with_id.id
      } else {
        const inserted = await this.db
          .insertInto('exploration')
          .values({ player_id: with_id.player_id })
          .returning('id')
          .executeTakeFirstOrThrow()
        exploration_id = inserted.id
      }

      await this.syncCells(exploration_id, with_id.cell_ids)
      return exploration_id
    })
  }

  override async updateOne(
    entity: ExplorationEntity,
    options?: { upsert: boolean }
  ): Promise<void> {
    await withTransaction(async () => {
      if (options?.upsert) {
        await this.db
          .insertInto('exploration')
          .values({
            id: entity.id,
            player_id: entity.player_id
          })
          .onConflict((oc) => oc
            .column('id')
            .doUpdateSet({ player_id: entity.player_id }))
          .execute()
      } else {
        await this.db
          .updateTable('exploration')
          .set({ player_id: entity.player_id })
          .where('id', '=', entity.id)
          .execute()
      }

      await this.syncCells(entity.id, entity.cell_ids)
    })
  }

  private async loadEntity(row: Selectable<DB['exploration']>): Promise<ExplorationEntity> {
    const cells = await this.db
      .selectFrom('exploration_cell')
      .select('cell_id')
      .where('exploration_id', '=', row.id)
      .execute()

    return ExplorationEntity.create({
      id: row.id,
      player_id: row.player_id,
      cell_ids: cells.map(cell => cell.cell_id)
    })
  }

  private async syncCells(
    exploration_id: string,
    cell_ids: string[]
  ): Promise<void> {
    await this.db
      .deleteFrom('exploration_cell')
      .where('exploration_id', '=', exploration_id)
      .execute()

    if (!cell_ids.length) {
      return
    }

    await this.db
      .insertInto('exploration_cell')
      .values(cell_ids.map(cell_id => ({
        exploration_id,
        cell_id
      })))
      .execute()
  }

  protected buildFromRow(row: Selectable<DB['exploration']>): ExplorationEntity {
    return ExplorationEntity.create({
      id: row.id,
      player_id: row.player_id,
      cell_ids: []
    })
  }

  protected toRow(entity: ExplorationEntity): Insertable<DB['exploration']> {
    return {
      id: entity.id,
      player_id: entity.player_id
    }
  }
}
