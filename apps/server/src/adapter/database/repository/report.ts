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

  async getById(id: string): Promise<ReportEntity> {
    return this.findByIdOrThrow(id)
  }

  async list({
    player_id,
    limit,
    offset
  }: {
    player_id: string
    limit: number
    offset: number
  }): Promise<{ reports: ReportEntity[]; total: number }> {
    const [
      rows,
      total_result
    ] = await Promise.all([
      this.db
        .selectFrom('report')
        .selectAll()
        .where('player_id', '=', player_id)
        .orderBy('recorded_at', 'desc')
        .offset(offset)
        .limit(limit)
        .execute(),
      this.db
        .selectFrom('report')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .where('player_id', '=', player_id)
        .executeTakeFirstOrThrow()
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
              origin_sector: row.origin_sector,
              destination_x: row.destination_x,
              destination_y: row.destination_y,
              destination_sector: row.destination_sector,
              recorded_at: row.recorded_at,
              was_read: row.was_read,
              plastic: row.plastic,
              mushroom: row.mushroom,
              remaining_plastic: row.remaining_plastic,
              remaining_mushroom: row.remaining_mushroom,
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
              origin_sector: row.origin_sector,
              destination_x: row.destination_x,
              destination_y: row.destination_y,
              destination_sector: row.destination_sector,
              recorded_at: row.recorded_at,
              was_read: row.was_read,
              plastic: row.plastic,
              mushroom: row.mushroom,
              remaining_plastic: row.remaining_plastic,
              remaining_mushroom: row.remaining_mushroom,
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
            origin_sector: row.origin_sector,
            destination_x: row.destination_x,
            destination_y: row.destination_y,
            destination_sector: row.destination_sector,
            recorded_at: row.recorded_at,
            was_read: row.was_read,
            plastic: row.plastic,
            mushroom: row.mushroom,
            remaining_plastic: row.remaining_plastic,
            remaining_mushroom: row.remaining_mushroom,
          })
          .where('id', '=', entity.id)
          .execute()
      }

      await this.syncTroops(entity.id, entity.troops)
    })
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
        y: row.origin_y,
        sector: row.origin_sector
      },
      destination: {
        x: row.destination_x,
        y: row.destination_y,
        sector: row.destination_sector
      },
      recorded_at: fromTimestampRequired(row.recorded_at),
      was_read: row.was_read,
      resources: {
        plastic: row.plastic,
        mushroom: row.mushroom,
      },
      remaining_resources: {
        plastic: row.remaining_plastic,
        mushroom: row.remaining_mushroom,
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
        y: row.origin_y,
        sector: row.origin_sector
      },
      destination: {
        x: row.destination_x,
        y: row.destination_y,
        sector: row.destination_sector
      },
      recorded_at: fromTimestampRequired(row.recorded_at),
      was_read: row.was_read,
      resources: {
        plastic: row.plastic,
        mushroom: row.mushroom,
      },
      remaining_resources: {
        plastic: row.remaining_plastic,
        mushroom: row.remaining_mushroom,
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
      origin_sector: entity.origin.sector,
      destination_x: entity.destination.x,
      destination_y: entity.destination.y,
      destination_sector: entity.destination.sector,
      recorded_at: toTimestampRequired(entity.recorded_at),
      was_read: entity.was_read,
      plastic: entity.resources.plastic,
      mushroom: entity.resources.mushroom,
      remaining_plastic: entity.remaining_resources.plastic,
      remaining_mushroom: entity.remaining_resources.mushroom,
    }
  }
}
