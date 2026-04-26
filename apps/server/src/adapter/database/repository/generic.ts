import { GenericRepository } from '#app/port/repository/generic'
import { BaseEntity } from '#core/type/base/entity'
import { AppLogger } from '#app/port/logger'
import { Factory } from '#adapter/factory'
import { getDatabase } from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable,
  Updateable
} from 'kysely'

type TablesWithId = {
  [K in keyof DB]: DB[K] extends { id: unknown } ? K : never
}[keyof DB]

/**
 * Kysely cannot type query builders when the table name is a generic union —
 * `.where` / `.set` become unions of incompatible overloads. CRUD helpers use
 * a loosely typed client + string table name; subclasses use `this.db` for
 * domain queries with full `DB` typing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseDB = Kysely<any>

export abstract class PostgreSQLGenericRepository<
  TableName extends TablesWithId,
  Entity extends BaseEntity
> implements GenericRepository<Entity> {
  protected logger: AppLogger
  protected table: TableName
  private not_found_error: string
  private loose_table: string

  protected constructor(_db: Kysely<DB>, table: TableName, not_found_error: string) {
    this.table = table
    this.loose_table = table
    this.not_found_error = not_found_error
    this.logger = Factory.getLogger('adapter:repository').child({ table })
  }

  protected get db(): Kysely<DB> {
    return getDatabase()
  }

  private get loose_db(): LooseDB {
    return getDatabase() as LooseDB
  }

  async findById(id: string): Promise<Entity | null> {
    this.logger.debug('findById:call', { id })
    const row = await this.loose_db
      .selectFrom(this.loose_table)
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) {
      this.logger.debug('findById:not-found', { id })
      return null
    }

    this.logger.debug('findById:found', { id })
    return this.buildFromRow(row as Selectable<DB[TableName]>)
  }

  async findByIdOrThrow(id: string): Promise<Entity> {
    const entity = await this.findById(id)
    if (!entity) {
      throw new Error(this.not_found_error)
    }

    return entity
  }

  async create(entity: Entity | Omit<Entity, 'id'>): Promise<string> {
    const with_id = entity as Entity
    const row = this.toRow(with_id)

    if (with_id.id) {
      this.logger.debug('create:upsert', { id: with_id.id })
      await this.upsertRow({
        ...row,
        id: with_id.id
      } as Insertable<DB[TableName]>)
      return with_id.id
    }

    const without_id = { ...row } as Insertable<DB[TableName]> & { id?: string }
    delete without_id.id

    const inserted = await this.loose_db
      .insertInto(this.loose_table)
      .values(without_id)
      .returning('id')
      .executeTakeFirstOrThrow() as { id: string }

    this.logger.debug('create:created', { id: inserted.id })
    return inserted.id
  }

  async updateOne(entity: Entity, options?: { upsert: boolean }): Promise<void> {
    this.logger.debug('updateOne', {
      id: entity.id,
      upsert: options?.upsert
    })
    const row = this.toRow(entity)

    if (options?.upsert) {
      await this.upsertRow({
        ...row,
        id: entity.id
      } as Insertable<DB[TableName]>)
      return
    }

    await this.loose_db
      .updateTable(this.loose_table)
      .set(row)
      .where('id', '=', entity.id)
      .execute()
  }

  async delete(id: string): Promise<void> {
    this.logger.debug('delete', { id })
    await this.loose_db
      .deleteFrom(this.loose_table)
      .where('id', '=', id)
      .execute()
  }

  private async upsertRow(row: Insertable<DB[TableName]>): Promise<void> {
    const updates = { ...row } as Insertable<DB[TableName]> & { id?: string }
    delete updates.id

    await this.loose_db
      .insertInto(this.loose_table)
      .values(row)
      .onConflict((oc) => oc
        .column('id')
        .doUpdateSet(updates))
      .execute()
  }

  protected abstract buildFromRow(row: Selectable<DB[TableName]>): Entity

  protected abstract toRow(entity: Entity): Insertable<DB[TableName]> | Updateable<DB[TableName]>
}
