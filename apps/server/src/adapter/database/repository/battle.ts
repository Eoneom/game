import { BattleEntity } from '#core/combat/entity/battle'
import { BattleStateJson } from '#core/combat/type/battle-stack'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatError } from '#core/combat/error'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { BattleRepository } from '#app/port/battle-repository'
import type { DB } from '#adapter/database/types'
import {
  fromTimestampRequired,
  toTimestampRequired,
} from '#adapter/database/repository/shared/time'
import {
  Insertable,
  Kysely,
  Selectable,
} from 'kysely'

export class PostgresBattleRepository implements BattleRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async create(battle: BattleEntity): Promise<string> {
    const row = this.toRow(battle)
    await this.db.insertInto('battle').values(row).execute()
    return battle.id
  }

  async update(battle: BattleEntity): Promise<void> {
    const row = this.toRow(battle)
    await this.db
      .updateTable('battle')
      .set(row)
      .where('id', '=', battle.id)
      .execute()
  }

  async getById(id: string): Promise<BattleEntity> {
    const row = await this.db
      .selectFrom('battle')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) {
      throw new Error(CombatError.BATTLE_NOT_FOUND)
    }

    return this.buildFromRow(row)
  }

  async getByMovementId(movement_id: string): Promise<BattleEntity | null> {
    const row = await this.db
      .selectFrom('battle')
      .selectAll()
      .where('movement_id', '=', movement_id)
      .executeTakeFirst()

    if (!row) {
      return null
    }

    return this.buildFromRow(row)
  }

  private buildFromRow(row: Selectable<DB['battle']>): BattleEntity {
    return BattleEntity.create({
      id: row.id,
      movement_id: row.movement_id,
      attacker_player_id: row.attacker_player_id,
      defender_player_id: row.defender_player_id,
      cell_id: row.cell_id,
      target_kind: row.target_kind as BattleTargetKind,
      target_id: row.target_id,
      attacker_strategy: row.attacker_strategy as CombatStrategy,
      defender_strategy: row.defender_strategy as CombatStrategy,
      current_round: row.current_round,
      status: row.status as 'in_progress' | 'finished',
      winner: row.winner as BattleWinner | null,
      state_json: row.state_json as BattleStateJson,
      started_at: fromTimestampRequired(row.started_at),
      finished_at: row.finished_at ? fromTimestampRequired(row.finished_at) : null,
    })
  }

  private toRow(battle: BattleEntity): Insertable<DB['battle']> {
    return {
      id: battle.id,
      movement_id: battle.movement_id,
      attacker_player_id: battle.attacker_player_id,
      defender_player_id: battle.defender_player_id,
      cell_id: battle.cell_id,
      target_kind: battle.target_kind,
      target_id: battle.target_id,
      attacker_strategy: battle.attacker_strategy,
      defender_strategy: battle.defender_strategy,
      current_round: battle.current_round,
      status: battle.status,
      winner: battle.winner,
      state_json: battle.state_json as Insertable<DB['battle']>['state_json'],
      started_at: toTimestampRequired(battle.started_at),
      finished_at: battle.finished_at ? toTimestampRequired(battle.finished_at) : null,
    }
  }
}
