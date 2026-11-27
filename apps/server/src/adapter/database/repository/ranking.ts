import {
  RankingAllianceSummary,
  RankingHumanPlayer,
  RankingRepository
} from '#app/port/repository/ranking'
import { getDatabase } from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import {
  fromTimestampRequired,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'
import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import {
  RankingEntry,
  RankingSnapshot
} from '#core/ranking/type'
import { RankingCategory } from '#core/ranking/value/category'
import { RankingKind } from '#core/ranking/value/kind'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { isId } from '#shared/identification'
import {
  Kysely,
  Selectable,
  sql
} from 'kysely'

/** Rows per insert statement when writing a snapshot (Postgres caps bind parameters at 65535). */
const ENTRY_INSERT_CHUNK = 1000

/**
 * `bigint` columns and `sum()` come back from `pg` as strings: convert explicitly.
 * Values stay far below `Number.MAX_SAFE_INTEGER`.
 */
const toNumber = (value: string | number | bigint | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }
  return Number(value)
}

export class PostgresRankingRepository implements RankingRepository {
  private get db(): Kysely<DB> {
    return getDatabase()
  }

  async listHumanPlayers(): Promise<RankingHumanPlayer[]> {
    const rows = await this.db
      .selectFrom('player')
      .leftJoin('alliance_member', 'alliance_member.player_id', 'player.id')
      .select([
        'player.id',
        'player.name',
        'player.faction_code',
        'player.military_value',
        'alliance_member.alliance_id',
      ])
      .where('player.system_controlled', '=', false)
      .execute()

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      faction_code: row.faction_code as FactionCode,
      alliance_id: row.alliance_id ?? null,
      military_value: toNumber(row.military_value),
    }))
  }

  async listHumanBuildingLevels(): Promise<{ player_id: string, code: BuildingCode, level: number }[]> {
    const rows = await this.db
      .selectFrom('building')
      .innerJoin('city', 'city.id', 'building.city_id')
      .innerJoin('player', 'player.id', 'city.player_id')
      .select([
        'city.player_id',
        'building.code',
        'building.level',
      ])
      .where('player.system_controlled', '=', false)
      .where('building.level', '>', 0)
      .execute()

    return rows.map(row => ({
      player_id: row.player_id,
      code: row.code as BuildingCode,
      level: row.level,
    }))
  }

  async listHumanTechnologyLevels(): Promise<{ player_id: string, code: TechnologyCode, level: number }[]> {
    const rows = await this.db
      .selectFrom('technology')
      .innerJoin('player', 'player.id', 'technology.player_id')
      .select([
        'technology.player_id',
        'technology.code',
        'technology.level',
      ])
      .where('player.system_controlled', '=', false)
      .where('technology.level', '>', 0)
      .execute()

    return rows.map(row => ({
      player_id: row.player_id,
      code: row.code as TechnologyCode,
      level: row.level,
    }))
  }

  async listHumanTroopCounts(): Promise<{ player_id: string, code: TroopCode, count: number }[]> {
    const rows = await this.db
      .selectFrom('troop')
      .innerJoin('player', 'player.id', 'troop.player_id')
      .select([
        'troop.player_id',
        'troop.code',
        sql<string>`sum(troop.count)`.as('count'),
      ])
      .where('player.system_controlled', '=', false)
      .where('troop.count', '>', 0)
      .groupBy([
        'troop.player_id',
        'troop.code'
      ])
      .execute()

    return rows.map(row => ({
      player_id: row.player_id,
      code: row.code as TroopCode,
      count: toNumber(row.count),
    }))
  }

  async listHumanDefenseCounts(): Promise<{ player_id: string, code: DefenseCode, count: number }[]> {
    const rows = await this.db
      .selectFrom('defense')
      .innerJoin('city', 'city.id', 'defense.city_id')
      .innerJoin('player', 'player.id', 'city.player_id')
      .select([
        'city.player_id',
        'defense.code',
        sql<string>`sum(defense.count)`.as('count'),
      ])
      .where('player.system_controlled', '=', false)
      .where('defense.count', '>', 0)
      .groupBy([
        'city.player_id',
        'defense.code'
      ])
      .execute()

    return rows.map(row => ({
      player_id: row.player_id,
      code: row.code as DefenseCode,
      count: toNumber(row.count),
    }))
  }

  async listAlliances(): Promise<{ id: string, name: string }[]> {
    return this.db
      .selectFrom('alliance')
      .select([
        'id',
        'name'
      ])
      .execute()
  }

  async listAllianceSummaries(alliance_ids: string[]): Promise<RankingAllianceSummary[]> {
    const ids = alliance_ids.filter(isId)
    if (ids.length === 0) {
      return []
    }
    const rows = await this.db
      .selectFrom('alliance')
      .leftJoin('alliance_member', 'alliance_member.alliance_id', 'alliance.id')
      .select(eb => [
        'alliance.id',
        'alliance.name',
        'alliance.tag',
        eb.fn.count<string>('alliance_member.player_id').as('member_count'),
      ])
      .where('alliance.id', 'in', ids)
      .groupBy([
        'alliance.id',
        'alliance.name',
        'alliance.tag'
      ])
      .execute()

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      tag: row.tag,
      member_count: toNumber(row.member_count),
    }))
  }

  async countHumanPlayersByFaction(): Promise<{ faction_code: FactionCode, count: number }[]> {
    const rows = await this.db
      .selectFrom('player')
      .select(eb => [
        'faction_code',
        eb.fn.countAll<string>().as('count'),
      ])
      .where('system_controlled', '=', false)
      .groupBy('faction_code')
      .execute()

    return rows.map(row => ({
      faction_code: row.faction_code as FactionCode,
      count: toNumber(row.count),
    }))
  }

  async createSnapshot({
    computed_at,
    entries
  }: {
    computed_at: number
    entries: RankingEntry[]
  }): Promise<RankingSnapshot> {
    const snapshot = await this.db
      .insertInto('ranking_snapshot')
      .values({ computed_at: toTimestampRequired(computed_at) })
      .returning([
        'id',
        'computed_at'
      ])
      .executeTakeFirstOrThrow()

    for (let start = 0; start < entries.length; start += ENTRY_INSERT_CHUNK) {
      await this.db
        .insertInto('ranking_entry')
        .values(entries.slice(start, start + ENTRY_INSERT_CHUNK).map(entry => ({
          snapshot_id: snapshot.id,
          category: entry.category,
          kind: entry.kind,
          entity_id: entry.entity_id,
          rank: entry.rank,
          position: entry.position,
          points: String(entry.points),
        })))
        .execute()
    }

    return this.buildSnapshot(snapshot)
  }

  async deleteSnapshotsBefore(before: number): Promise<number> {
    const result = await this.db
      .deleteFrom('ranking_snapshot')
      .where('computed_at', '<', toTimestampRequired(before))
      .executeTakeFirst()

    return Number(result.numDeletedRows)
  }

  async findLatestSnapshot(): Promise<RankingSnapshot | null> {
    const row = await this.db
      .selectFrom('ranking_snapshot')
      .selectAll()
      .orderBy('computed_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    return row ? this.buildSnapshot(row) : null
  }

  async findSnapshotClosestTo({
    target,
    before
  }: {
    target: number
    before: number
  }): Promise<RankingSnapshot | null> {
    const target_date = toTimestampRequired(target)
    const row = await this.db
      .selectFrom('ranking_snapshot')
      .selectAll()
      .where('computed_at', '<', toTimestampRequired(before))
      .orderBy(sql`abs(extract(epoch from (computed_at - ${target_date}::timestamptz)))`)
      .orderBy('computed_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    return row ? this.buildSnapshot(row) : null
  }

  async listEntries({
    snapshot_id,
    category,
    kind,
    offset,
    limit
  }: {
    snapshot_id: string
    category: RankingCategory
    kind: RankingKind
    offset: number
    limit: number
  }): Promise<RankingEntry[]> {
    const rows = await this.db
      .selectFrom('ranking_entry')
      .selectAll()
      .where('snapshot_id', '=', snapshot_id)
      .where('category', '=', category)
      .where('kind', '=', kind)
      .orderBy('rank', 'asc')
      .orderBy('position', 'asc')
      .offset(offset)
      .limit(limit)
      .execute()

    return rows.map(row => this.buildEntry(row))
  }

  async countEntries({
    snapshot_id,
    category,
    kind
  }: {
    snapshot_id: string
    category: RankingCategory
    kind: RankingKind
  }): Promise<number> {
    const row = await this.db
      .selectFrom('ranking_entry')
      .select(eb => eb.fn.countAll<string>().as('count'))
      .where('snapshot_id', '=', snapshot_id)
      .where('category', '=', category)
      .where('kind', '=', kind)
      .executeTakeFirst()

    return toNumber(row?.count)
  }

  async listEntriesForEntities({
    snapshot_id,
    kind,
    entity_ids,
    category
  }: {
    snapshot_id: string
    kind: RankingKind
    entity_ids: string[]
    category?: RankingCategory
  }): Promise<RankingEntry[]> {
    if (entity_ids.length === 0 || !isId(snapshot_id)) {
      return []
    }
    let query = this.db
      .selectFrom('ranking_entry')
      .selectAll()
      .where('snapshot_id', '=', snapshot_id)
      .where('kind', '=', kind)
      .where('entity_id', 'in', entity_ids)
    if (category) {
      query = query.where('category', '=', category)
    }
    const rows = await query.execute()

    return rows.map(row => this.buildEntry(row))
  }

  private buildSnapshot(row: { id: string, computed_at: Date | string }): RankingSnapshot {
    return {
      id: row.id,
      computed_at: fromTimestampRequired(row.computed_at),
    }
  }

  private buildEntry(row: Selectable<DB['ranking_entry']>): RankingEntry {
    return {
      category: row.category as RankingCategory,
      kind: row.kind as RankingKind,
      entity_id: row.entity_id,
      rank: row.rank,
      position: row.position,
      points: toNumber(row.points),
    }
  }
}
