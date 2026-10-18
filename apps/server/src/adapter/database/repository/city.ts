import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CityEntity } from '#core/city/entity'
import { CityInBounds, CityRepository } from '#app/port/repository/city'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { CityError } from '#core/city/error'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'

export class PostgresCityRepository
  extends PostgreSQLGenericRepository<'city', CityEntity>
  implements CityRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'city', CityError.NOT_FOUND)
  }

  async count({ player_id }: { player_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('city')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('player_id', '=', player_id)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async get(id: string): Promise<CityEntity> {
    return this.findByIdOrThrow(id)
  }

  async list({ player_id }: { player_id: string }): Promise<CityEntity[]> {
    const rows = await this.db
      .selectFrom('city')
      .selectAll()
      .where('player_id', '=', player_id)
      .execute()

    return rows.map(row => this.buildFromRow(row))
  }

  async listAll(): Promise<CityEntity[]> {
    const rows = await this.db
      .selectFrom('city')
      .selectAll()
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
  }): Promise<CityInBounds[]> {
    const rows = await this.db
      .selectFrom('city')
      .innerJoin('cell', 'cell.id', 'city.cell_id')
      .selectAll('city')
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
      city: this.buildFromRow(row),
      coordinates: {
        x: row.x,
        y: row.y
      }
    }))
  }

  async exist(name: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('city')
      .select('id')
      .where('name', '=', name)
      .executeTakeFirst()

    return Boolean(row)
  }

  async searchByCell({ cell_id }: { cell_id: string }): Promise<CityEntity | null> {
    const row = await this.db
      .selectFrom('city')
      .selectAll()
      .where('cell_id', '=', cell_id)
      .executeTakeFirst()

    if (!row) {
      return null
    }

    return this.buildFromRow(row)
  }

  protected buildFromRow(row: Selectable<DB['city']>): CityEntity {
    return CityEntity.create({
      id: row.id,
      player_id: row.player_id,
      name: row.name,
      cell_id: row.cell_id,
      default_combat_strategy: row.default_combat_strategy as CombatStrategy | null,
    })
  }

  protected toRow(entity: CityEntity): Insertable<DB['city']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      name: entity.name,
      cell_id: entity.cell_id,
      default_combat_strategy: entity.default_combat_strategy,
    }
  }
}
