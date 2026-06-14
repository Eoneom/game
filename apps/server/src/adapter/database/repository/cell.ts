import { CellEntity } from '#core/world/cell/entity'
import { CellRepository } from '#app/port/repository/cell'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
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

  async getCell({ coordinates }: { coordinates: Coordinates }): Promise<CellEntity> {
    const row = await this.db
      .selectFrom('cell')
      .selectAll()
      .where('x', '=', coordinates.x)
      .where('y', '=', coordinates.y)
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

  async getByBounds({
    min_x,
    max_x,
    min_y,
    max_y
  }: {
    min_x: number
    max_x: number
    min_y: number
    max_y: number
  }): Promise<CellEntity[]> {
    const rows = await this.db
      .selectFrom('cell')
      .selectAll()
      .where('x', '>=', min_x)
      .where('x', '<=', max_x)
      .where('y', '>=', min_y)
      .where('y', '<=', max_y)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  protected buildFromRow(row: Selectable<DB['cell']>): CellEntity {
    return CellEntity.create({
      id: row.id,
      coordinates: {
        x: row.x,
        y: row.y
      },
      type: row.type as CellType,
      resource_coefficient: {
        plastic: row.plastic_coefficient,
        mushroom: row.mushroom_coefficient,
        plasma: 1
      },
      solar_coefficient: row.solar_coefficient
    })
  }

  protected toRow(entity: CellEntity): Insertable<DB['cell']> {
    return {
      id: entity.id,
      x: entity.coordinates.x,
      y: entity.coordinates.y,
      type: entity.type,
      plastic_coefficient: entity.resource_coefficient.plastic,
      mushroom_coefficient: entity.resource_coefficient.mushroom,
      solar_coefficient: entity.solar_coefficient
    }
  }
}
