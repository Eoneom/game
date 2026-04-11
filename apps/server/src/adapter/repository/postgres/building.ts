import { BuildingEntity } from '#core/building/entity'
import { BuildingRepository } from '#app/port/repository/building'
import { PostgreSQLGenericRepository } from '#adapter/repository/postgres/generic'
import { BuildingCode } from '#core/building/constant/code'
import { BuildingError } from '#core/building/error'
import { now } from '#shared/time'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'
import {
  fromTimestamp,
  toTimestamp,
  toTimestampRequired
} from '#adapter/repository/postgres/shared/time'

export class PostgresBuildingRepository
  extends PostgreSQLGenericRepository<'building', BuildingEntity>
  implements BuildingRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'building', BuildingError.NOT_FOUND)
  }

  async getTotalLevels({ city_id }: { city_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('building')
      .select(({ fn }) => fn.sum<number>('level').as('total'))
      .where('city_id', '=', city_id)
      .executeTakeFirstOrThrow()

    return Number(result.total ?? 0)
  }

  async list({
    city_id,
    codes
  }: { city_id: string, codes?: BuildingCode[] }): Promise<BuildingEntity[]> {
    let query = this.db
      .selectFrom('building')
      .selectAll()
      .where('city_id', '=', city_id)

    if (codes) {
      query = query.where('code', 'in', codes)
    }

    const rows = await query.execute()
    return rows.map(row => this.buildFromRow(row))
  }

  async get(query: { city_id: string; code: BuildingCode }): Promise<BuildingEntity> {
    return this.getInCity(query)
  }

  async isInProgress({ city_id }: { city_id: string }): Promise<boolean> {
    const row = await this.db
      .selectFrom('building')
      .select('id')
      .where('city_id', '=', city_id)
      .where('upgrade_at', 'is not', null)
      .executeTakeFirst()

    return Boolean(row)
  }

  async getInCity({
    city_id,
    code
  }: { city_id: string, code: BuildingCode }): Promise<BuildingEntity> {
    const row = await this.db
      .selectFrom('building')
      .selectAll()
      .where('city_id', '=', city_id)
      .where('code', '=', code)
      .executeTakeFirst()

    if (!row) {
      throw new Error(BuildingError.NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  async getLevel({
    city_id,
    code
  }: { city_id: string; code: BuildingCode }): Promise<number> {
    const row = await this.db
      .selectFrom('building')
      .select('level')
      .where('city_id', '=', city_id)
      .where('code', '=', code)
      .executeTakeFirst()

    if (!row) {
      throw new Error(BuildingError.NOT_FOUND)
    }

    return row.level
  }

  async getUpgradeDone({ city_id }: { city_id: string }): Promise<BuildingEntity | null> {
    const row = await this.db
      .selectFrom('building')
      .selectAll()
      .where('city_id', '=', city_id)
      .where('upgrade_at', 'is not', null)
      .where('upgrade_at', '<=', toTimestampRequired(now()))
      .executeTakeFirst()

    return row ? this.buildFromRow(row) : null
  }

  async getInProgress({ city_id }: { city_id: string }): Promise<BuildingEntity | null> {
    const row = await this.db
      .selectFrom('building')
      .selectAll()
      .where('city_id', '=', city_id)
      .where('upgrade_at', 'is not', null)
      .executeTakeFirst()

    return row ? this.buildFromRow(row) : null
  }

  protected buildFromRow(row: Selectable<DB['building']>): BuildingEntity {
    return BuildingEntity.create({
      id: row.id,
      code: row.code as BuildingCode,
      level: row.level,
      city_id: row.city_id,
      upgrade_at: fromTimestamp(row.upgrade_at) ?? undefined
    })
  }

  protected toRow(entity: BuildingEntity): Insertable<DB['building']> {
    return {
      id: entity.id,
      city_id: entity.city_id,
      code: entity.code,
      level: entity.level,
      upgrade_at: toTimestamp(entity.upgrade_at)
    }
  }
}
