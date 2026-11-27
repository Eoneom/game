import { BattleEntity } from '#core/combat/entity/battle'
import {
  BattleCasualtyLine,
  BattleRoundSummary,
  BattleStateJson,
} from '#core/combat/type/battle-stack'
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
    await this.insertRounds(battle)
    return battle.id
  }

  async update(battle: BattleEntity): Promise<void> {
    const row = this.toRow(battle)
    await this.db
      .updateTable('battle')
      .set(row)
      .where('id', '=', battle.id)
      .execute()
    await this.insertRounds(battle)
  }

  /** Rounds are append-only: existing (battle_id, round) rows are left untouched. */
  private async insertRounds(battle: BattleEntity): Promise<void> {
    if (battle.round_summaries.length === 0) {
      return
    }

    await this.db
      .insertInto('battle_round')
      .values(battle.round_summaries.map(summary => this.toRoundRow(battle.id, summary)))
      .onConflict(oc => oc.columns(['battle_id', 'round']).doNothing())
      .execute()
  }

  private async listRounds(battle_id: string): Promise<BattleRoundSummary[]> {
    const rows = await this.db
      .selectFrom('battle_round')
      .selectAll()
      .where('battle_id', '=', battle_id)
      .orderBy('round', 'asc')
      .execute()

    return rows.map(row => ({
      round: row.round,
      attacker_attack_pool: row.attacker_attack_pool,
      defender_attack_pool: row.defender_attack_pool,
      attacker_life_pool: row.attacker_life_pool,
      defender_life_pool: row.defender_life_pool,
      attacker_losses: row.attacker_losses as BattleCasualtyLine[],
      defender_losses: row.defender_losses as BattleCasualtyLine[],
      defender_plasma_spent: row.defender_plasma_spent,
      shield_reduction: row.shield_reduction,
      spore_reduction: row.spore_reduction,
      barbed_wire_reduction: row.barbed_wire_reduction,
      decoy_absorbed: row.decoy_absorbed,
      railgun_doubled: row.railgun_doubled,
    }))
  }

  private toRoundRow(battle_id: string, summary: BattleRoundSummary): Insertable<DB['battle_round']> {
    return {
      battle_id,
      round: summary.round,
      attacker_attack_pool: summary.attacker_attack_pool,
      defender_attack_pool: summary.defender_attack_pool,
      attacker_life_pool: summary.attacker_life_pool,
      defender_life_pool: summary.defender_life_pool,
      // Pre-serialized: node-postgres would send arrays as Postgres array literals.
      attacker_losses: JSON.stringify(summary.attacker_losses),
      defender_losses: JSON.stringify(summary.defender_losses),
      defender_plasma_spent: summary.defender_plasma_spent ?? 0,
      shield_reduction: summary.shield_reduction ?? 0,
      spore_reduction: summary.spore_reduction ?? 0,
      barbed_wire_reduction: summary.barbed_wire_reduction ?? 0,
      decoy_absorbed: summary.decoy_absorbed ?? 0,
      railgun_doubled: summary.railgun_doubled ?? false,
    }
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

    return this.buildFromRow(row, await this.listRounds(row.id))
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

    return this.buildFromRow(row, await this.listRounds(row.id))
  }

  async countByTargetSince({
    target_id,
    since
  }: { target_id: string, since: number }): Promise<number> {
    const result = await this.db
      .selectFrom('battle')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('target_id', '=', target_id)
      .where('started_at', '>=', toTimestampRequired(since))
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  private buildFromRow(
    row: Selectable<DB['battle']>,
    round_summaries: BattleRoundSummary[]
  ): BattleEntity {
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
      round_summaries,
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
