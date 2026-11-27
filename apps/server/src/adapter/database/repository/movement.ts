import { MovementEntity } from '#core/troop/movement/entity'
import { MovementRepository } from '#app/port/repository/movement'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { TroopError } from '#core/troop/error'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
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

  async countByPlayer({ player_id }: { player_id: string }): Promise<number> {
    const result = await this.db
      .selectFrom('movement')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('player_id', '=', player_id)
      // Exchange convoys and their return trips never count toward the cap (slice 035).
      .where('exchange_trade_id', 'is', null)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async listIncomingAttacks({ player_id }: { player_id: string }): Promise<MovementEntity[]> {
    const rows = await this.db
      .selectFrom('movement')
      .innerJoin('cell', join => join
        .onRef('cell.x', '=', 'movement.destination_x')
        .onRef('cell.y', '=', 'movement.destination_y'))
      .selectAll('movement')
      .where('movement.action', '=', MovementAction.ATTACK)
      .where('movement.player_id', '!=', player_id)
      .where(eb => eb.or([
        eb.exists(eb
          .selectFrom('city')
          .select('city.id')
          .whereRef('city.cell_id', '=', 'cell.id')
          .where('city.player_id', '=', player_id)),
        eb.exists(eb
          .selectFrom('outpost')
          .select('outpost.id')
          .whereRef('outpost.cell_id', '=', 'cell.id')
          .where('outpost.player_id', '=', player_id)),
        eb.exists(eb
          .selectFrom('troop')
          .select('troop.id')
          .whereRef('troop.cell_id', '=', 'cell.id')
          .where('troop.player_id', '=', player_id)
          .where('troop.movement_id', 'is', null)
          .where('troop.count', '>', 0)),
      ]))
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
        y: row.origin_y
      },
      destination: {
        x: row.destination_x,
        y: row.destination_y
      },
      resources: {
        plastic: row.plastic,
        mushroom: row.mushroom,
        plasma: row.plasma,
        water: row.water,
      },
      combat_strategy: row.combat_strategy as CombatStrategy | null,
      exchange_trade_id: row.exchange_trade_id,
    })
  }

  protected toRow(entity: MovementEntity): Insertable<DB['movement']> {
    return {
      id: entity.id,
      player_id: entity.player_id,
      action: entity.action,
      origin_x: entity.origin.x,
      origin_y: entity.origin.y,
      destination_x: entity.destination.x,
      destination_y: entity.destination.y,
      plastic: entity.resources.plastic,
      mushroom: entity.resources.mushroom,
      plasma: entity.resources.plasma,
      water: entity.resources.water,
      combat_strategy: entity.combat_strategy,
      exchange_trade_id: entity.exchange_trade_id,
    }
  }
}
