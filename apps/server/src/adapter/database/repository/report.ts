import { ReportEntity } from '#core/communication/report/entity'
import { ReportRepository } from '#app/port/repository/report'
import { PostgreSQLGenericRepository } from '#adapter/database/repository/generic'
import { withTransaction } from '#adapter/database/context'
import { CommunicationError } from '#core/communication/error'
import { ReportType } from '#core/communication/value/report-type'
import { TroopCode } from '#core/troop/constant/code'
import type { DB } from '#adapter/database/types'
import {
  Insertable,
  Kysely,
  Selectable
} from 'kysely'
import {
  fromTimestampRequired,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'
import {
  getReportBattleByReportId,
  insertReportBattleRow,
} from '#adapter/database/repository/report-battle'
import { ReportBattleMetadata } from '#core/combat/type/report-battle-metadata'
import { ReportPerspective } from '#core/combat/value/report-perspective'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { FactionCode } from '#core/faction/constant/code'

export class PostgresReportRepository
  extends PostgreSQLGenericRepository<'report', ReportEntity>
  implements ReportRepository {

  constructor(db: Kysely<DB>) {
    super(db, 'report', CommunicationError.REPORT_NOT_FOUND)
  }

  async count({
    player_id,
    was_read
  }: {
    player_id: string
    was_read: boolean
  }): Promise<number> {
    const result = await this.db
      .selectFrom('report')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('player_id', '=', player_id)
      .where('was_read', '=', was_read)
      .executeTakeFirstOrThrow()

    return Number(result.count)
  }

  async markAllAsRead(player_id: string): Promise<void> {
    await this.db
      .updateTable('report')
      .set({ was_read: true })
      .where('player_id', '=', player_id)
      .where('was_read', '=', false)
      .execute()
  }

  async deleteReadOlderThan(before: number): Promise<number> {
    const result = await this.db
      .deleteFrom('report')
      .where('was_read', '=', true)
      .where('recorded_at', '<', toTimestampRequired(before))
      .executeTakeFirst()

    return Number(result.numDeletedRows)
  }

  async getById(id: string): Promise<ReportEntity> {
    return this.findByIdOrThrow(id)
  }

  async list({
    player_id,
    limit,
    offset,
    was_read
  }: {
    player_id: string
    limit: number
    offset: number
    was_read?: boolean
  }): Promise<{ reports: ReportEntity[]; total: number }> {
    let select_query = this.db
      .selectFrom('report')
      .selectAll()
      .where('player_id', '=', player_id)

    let count_query = this.db
      .selectFrom('report')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('player_id', '=', player_id)

    if (was_read !== undefined) {
      select_query = select_query.where('was_read', '=', was_read)
      count_query = count_query.where('was_read', '=', was_read)
    }

    const [
      rows,
      total_result
    ] = await Promise.all([
      select_query
        .orderBy('recorded_at', 'desc')
        .offset(offset)
        .limit(limit)
        .execute(),
      count_query.executeTakeFirstOrThrow()
    ])

    const reports = await Promise.all(rows.map(row => this.loadEntity(row)))

    return {
      reports,
      total: Number(total_result.count)
    }
  }

  override async findById(id: string): Promise<ReportEntity | null> {
    const row = await this.db
      .selectFrom('report')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!row) {
      return null
    }

    return this.loadEntity(row)
  }

  override async create(entity: ReportEntity | Omit<ReportEntity, 'id'>): Promise<string> {
    const with_id = entity as ReportEntity

    return withTransaction(async () => {
      const row = this.toRow(with_id)
      let report_id: string

      if (with_id.id) {
        await this.db
          .insertInto('report')
          .values({
            ...row,
            id: with_id.id
          })
          .onConflict((oc) => oc
            .column('id')
            .doUpdateSet({
              type: row.type,
              player_id: row.player_id,
              origin_x: row.origin_x,
              origin_y: row.origin_y,
              destination_x: row.destination_x,
              destination_y: row.destination_y,
              recorded_at: row.recorded_at,
              was_read: row.was_read,
              plastic: row.plastic,
              mushroom: row.mushroom,
              plasma: row.plasma,
              remaining_plastic: row.remaining_plastic,
              remaining_mushroom: row.remaining_mushroom,
              remaining_plasma: row.remaining_plasma,
            }))
          .execute()
        report_id = with_id.id
      } else {
        const without_id = { ...row }
        delete without_id.id
        const inserted = await this.db
          .insertInto('report')
          .values(without_id)
          .returning('id')
          .executeTakeFirstOrThrow()
        report_id = inserted.id
      }

      await this.syncTroops(report_id, with_id.troops)
      return report_id
    })
  }

  override async updateOne(
    entity: ReportEntity,
    options?: { upsert: boolean }
  ): Promise<void> {
    const row = this.toRow(entity)

    await withTransaction(async () => {
      if (options?.upsert) {
        await this.db
          .insertInto('report')
          .values({
            ...row,
            id: entity.id
          })
          .onConflict((oc) => oc
            .column('id')
            .doUpdateSet({
              type: row.type,
              player_id: row.player_id,
              origin_x: row.origin_x,
              origin_y: row.origin_y,
              destination_x: row.destination_x,
              destination_y: row.destination_y,
              recorded_at: row.recorded_at,
              was_read: row.was_read,
              plastic: row.plastic,
              mushroom: row.mushroom,
              plasma: row.plasma,
              remaining_plastic: row.remaining_plastic,
              remaining_mushroom: row.remaining_mushroom,
              remaining_plasma: row.remaining_plasma,
            }))
          .execute()
      } else {
        await this.db
          .updateTable('report')
          .set({
            type: row.type,
            player_id: row.player_id,
            origin_x: row.origin_x,
            origin_y: row.origin_y,
            destination_x: row.destination_x,
            destination_y: row.destination_y,
            recorded_at: row.recorded_at,
            was_read: row.was_read,
            plastic: row.plastic,
            mushroom: row.mushroom,
            plasma: row.plasma,
            remaining_plastic: row.remaining_plastic,
            remaining_mushroom: row.remaining_mushroom,
            remaining_plasma: row.remaining_plasma,
          })
          .where('id', '=', entity.id)
          .execute()
      }

      await this.syncTroops(entity.id, entity.troops)
    })
  }

  async createBattleReports({
    attacker_report,
    defender_report,
    attacker_metadata,
    defender_metadata,
  }: {
    attacker_report: ReportEntity
    defender_report: ReportEntity
    attacker_metadata: ReportBattleMetadata
    defender_metadata: ReportBattleMetadata
  }): Promise<void> {
    await withTransaction(async () => {
      await this.create(attacker_report)
      await this.create(defender_report)
      await insertReportBattleRow(this.db, {
        report_id: attacker_report.id,
        battle_id: attacker_metadata.battle_id,
        movement_id: attacker_metadata.movement_id,
        perspective: attacker_metadata.perspective,
        attacker_player_id: attacker_metadata.attacker_player_id,
        defender_player_id: attacker_metadata.defender_player_id,
        attacker_faction_code: attacker_metadata.attacker_faction_code,
        defender_faction_code: attacker_metadata.defender_faction_code,
        target_kind: attacker_metadata.target_kind,
        target_id: attacker_metadata.target_id ?? null,
        winner: attacker_metadata.winner,
        attacker_strategy: attacker_metadata.attacker_strategy,
        defender_strategy: attacker_metadata.defender_strategy,
        rounds_played: attacker_metadata.rounds_played,
        outcome_json: attacker_metadata.outcome,
        casualties_attacker_json: attacker_metadata.casualties_attacker,
        casualties_defender_json: attacker_metadata.casualties_defender,
        round_summaries_json: attacker_metadata.round_summaries,
      })
      await insertReportBattleRow(this.db, {
        report_id: defender_report.id,
        battle_id: defender_metadata.battle_id,
        movement_id: defender_metadata.movement_id,
        perspective: defender_metadata.perspective,
        attacker_player_id: defender_metadata.attacker_player_id,
        defender_player_id: defender_metadata.defender_player_id,
        attacker_faction_code: defender_metadata.attacker_faction_code,
        defender_faction_code: defender_metadata.defender_faction_code,
        target_kind: defender_metadata.target_kind,
        target_id: defender_metadata.target_id ?? null,
        winner: defender_metadata.winner,
        attacker_strategy: defender_metadata.attacker_strategy,
        defender_strategy: defender_metadata.defender_strategy,
        rounds_played: defender_metadata.rounds_played,
        outcome_json: defender_metadata.outcome,
        casualties_attacker_json: defender_metadata.casualties_attacker,
        casualties_defender_json: defender_metadata.casualties_defender,
        round_summaries_json: defender_metadata.round_summaries,
      })
    })
  }

  async getBattleMetadataByReportId(report_id: string): Promise<ReportBattleMetadata | null> {
    const row = await getReportBattleByReportId(this.db, report_id)
    if (!row) {
      return null
    }
    return {
      battle_id: row.battle_id,
      movement_id: row.movement_id,
      perspective: row.perspective as ReportPerspective,
      attacker_player_id: row.attacker_player_id,
      defender_player_id: row.defender_player_id,
      attacker_faction_code: row.attacker_faction_code as FactionCode,
      defender_faction_code: row.defender_faction_code as FactionCode,
      target_kind: row.target_kind as BattleTargetKind,
      target_id: row.target_id,
      winner: row.winner as BattleWinner,
      attacker_strategy: row.attacker_strategy as CombatStrategy,
      defender_strategy: row.defender_strategy as CombatStrategy,
      rounds_played: row.rounds_played,
      outcome: row.outcome_json as ReportBattleMetadata['outcome'],
      casualties_attacker: row.casualties_attacker_json as ReportBattleMetadata['casualties_attacker'],
      casualties_defender: row.casualties_defender_json as ReportBattleMetadata['casualties_defender'],
      round_summaries: row.round_summaries_json as ReportBattleMetadata['round_summaries'],
    }
  }

  private async loadEntity(row: Selectable<DB['report']>): Promise<ReportEntity> {
    const troops = await this.db
      .selectFrom('report_troop')
      .select([
        'code',
        'count'
      ])
      .where('report_id', '=', row.id)
      .execute()

    return ReportEntity.create({
      id: row.id,
      player_id: row.player_id,
      type: row.type as ReportType,
      troops: troops.map(troop => ({
        code: troop.code as TroopCode,
        count: troop.count
      })),
      origin: {
        x: row.origin_x,
        y: row.origin_y
      },
      destination: {
        x: row.destination_x,
        y: row.destination_y
      },
      recorded_at: fromTimestampRequired(row.recorded_at),
      was_read: row.was_read,
      resources: {
        plastic: row.plastic,
        mushroom: row.mushroom,
        plasma: row.plasma,
      },
      remaining_resources: {
        plastic: row.remaining_plastic,
        mushroom: row.remaining_mushroom,
        plasma: row.remaining_plasma,
      },
    })
  }

  private async syncTroops(
    report_id: string,
    troops: { code: TroopCode; count: number }[]
  ): Promise<void> {
    await this.db
      .deleteFrom('report_troop')
      .where('report_id', '=', report_id)
      .execute()

    if (!troops.length) {
      return
    }

    await this.db
      .insertInto('report_troop')
      .values(troops.map(troop => ({
        report_id,
        code: troop.code,
        count: troop.count
      })))
      .execute()
  }

  protected buildFromRow(row: Selectable<DB['report']>): ReportEntity {
    return ReportEntity.create({
      id: row.id,
      player_id: row.player_id,
      type: row.type as ReportType,
      troops: [],
      origin: {
        x: row.origin_x,
        y: row.origin_y
      },
      destination: {
        x: row.destination_x,
        y: row.destination_y
      },
      recorded_at: fromTimestampRequired(row.recorded_at),
      was_read: row.was_read,
      resources: {
        plastic: row.plastic,
        mushroom: row.mushroom,
        plasma: row.plasma,
      },
      remaining_resources: {
        plastic: row.remaining_plastic,
        mushroom: row.remaining_mushroom,
        plasma: row.remaining_plasma,
      },
    })
  }

  protected toRow(entity: ReportEntity): Insertable<DB['report']> {
    return {
      id: entity.id,
      type: entity.type,
      player_id: entity.player_id,
      origin_x: entity.origin.x,
      origin_y: entity.origin.y,
      destination_x: entity.destination.x,
      destination_y: entity.destination.y,
      recorded_at: toTimestampRequired(entity.recorded_at),
      was_read: entity.was_read,
      plastic: entity.resources.plastic,
      mushroom: entity.resources.mushroom,
      plasma: entity.resources.plasma,
      remaining_plastic: entity.remaining_resources.plastic,
      remaining_mushroom: entity.remaining_resources.mushroom,
      remaining_plasma: entity.remaining_resources.plasma,
    }
  }
}
