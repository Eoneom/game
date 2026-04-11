import { CellEntity } from '#core/world/cell/entity'
import { CellRepository } from '#app/port/repository/cell'
import { PostgreSQLGenericRepository } from '#adapter/repository/postgres/generic'
import { WorldError } from '#core/world/error'
import { Coordinates } from '#core/world/value/coordinates'
import { CellType } from '#core/world/value/cell-type'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresCellRepository
  extends PostgreSQLGenericRepository<'cell', CellEntity>
  implements CellRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'cell', WorldError.CELL_NOT_FOUND)
  }

  async getById(id: string): Promise<CellEntity> {
    return this.findByIdOrThrow(id)
  }

  async getCityCellsCount({ city_id }: { city_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('cell')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('city_id', '=', city_id)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async getCityCell({ city_id }: { city_id: string }): Promise<CellEntity> {
    const row = await this.db
      .selectFrom('cell')
      .selectAll()
      .where('city_id', '=', city_id)
      .executeTakeFirst()

    if (!row) {
      throw new Error(WorldError.CELL_NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  async getCell({ coordinates }: { coordinates: Coordinates }): Promise<CellEntity> {
    const row = await this.db
      .selectFrom('cell')
      .selectAll()
      .where('x', '=', coordinates.x)
      .where('y', '=', coordinates.y)
      .where('sector', '=', coordinates.sector)
      .executeTakeFirst()

    if (!row) {
      throw new Error(WorldError.CELL_NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  async isInitialized(): Promise<boolean> {
    const row = await this.db
      .selectFrom('cell')
      .select('id')
      .executeTakeFirst()

    return Boolean(row)
  }

  async getSector({ sector }: { sector: number }): Promise<CellEntity[]> {
    const rows = await this.db
      .selectFrom('cell')
      .selectAll()
      .where('sector', '=', sector)
      .execute()

    if (!rows.length) {
      throw new Error(WorldError.SECTOR_NOT_FOUND)
    }

    return rows.map(row => this.buildFromRow(row))
  }

  protected buildFromRow(row: Selectable<DB['cell']>): CellEntity {
    return CellEntity.create({
      id: row.id,
      coordinates: {
        x: row.x,
        y: row.y,
        sector: row.sector
      },
      type: row.type as CellType,
      city_id: row.city_id ?? undefined,
      resource_coefficient: {
        plastic: row.plastic_coefficient,
        mushroom: row.mushroom_coefficient
      }
    })
  }

  protected toRow(entity: CellEntity): Insertable<DB['cell']> {
    return {
      id: entity.id,
      x: entity.coordinates.x,
      y: entity.coordinates.y,
      sector: entity.coordinates.sector,
      type: entity.type,
      plastic_coefficient: entity.resource_coefficient.plastic,
      mushroom_coefficient: entity.resource_coefficient.mushroom,
      city_id: entity.city_id ?? null
    }
  }
}
