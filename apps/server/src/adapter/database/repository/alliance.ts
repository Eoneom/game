import {
  AllianceRepository,
  AllianceTagEntry,
} from '#app/port/repository/alliance'
import { getDatabase } from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import {
  fromTimestampRequired,
  toTimestampRequired
} from '#adapter/database/repository/shared/time'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceError } from '#core/alliance/error'
import {
  AllianceApplication,
  AllianceInvitation,
  AllianceMember,
} from '#core/alliance/type'
import { FactionCode } from '#core/faction/constant/code'
import { isId } from '#shared/identification'
import {
  Kysely,
  Selectable
} from 'kysely'

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, char => `\\${char}`)

export class PostgresAllianceRepository implements AllianceRepository {
  private get db(): Kysely<DB> {
    return getDatabase()
  }

  async create(alliance: AllianceEntity): Promise<void> {
    await this.db
      .insertInto('alliance')
      .values({
        id: alliance.id,
        name: alliance.name,
        name_normalized: alliance.name.trim().toLowerCase(),
        tag: alliance.tag,
        description: alliance.description,
        faction_code: alliance.faction_code,
        created_at: toTimestampRequired(alliance.created_at),
      })
      .execute()
  }

  async findById(id: string): Promise<AllianceEntity | null> {
    if (!isId(id)) {
      return null
    }
    const row = await this.db
      .selectFrom('alliance')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? this.buildAlliance(row) : null
  }

  async get(id: string): Promise<AllianceEntity> {
    const alliance = await this.findById(id)
    if (!alliance) {
      throw new Error(AllianceError.NOT_FOUND)
    }
    return alliance
  }

  async updateDescription({
    alliance_id,
    description
  }: {
    alliance_id: string
    description: string
  }): Promise<void> {
    await this.db
      .updateTable('alliance')
      .set({ description })
      .where('id', '=', alliance_id)
      .execute()
  }

  async delete(id: string): Promise<void> {
    await this.db
      .deleteFrom('alliance')
      .where('id', '=', id)
      .execute()
  }

  async existsName(name_normalized: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('alliance')
      .select('id')
      .where('name_normalized', '=', name_normalized)
      .executeTakeFirst()
    return Boolean(row)
  }

  async existsTag(tag: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('alliance')
      .select('id')
      .where('tag', '=', tag)
      .executeTakeFirst()
    return Boolean(row)
  }

  async search({
    faction_code,
    prefix,
    limit
  }: {
    faction_code: FactionCode
    prefix: string
    limit: number
  }): Promise<AllianceEntity[]> {
    const pattern = `${escapeLike(prefix)}%`
    const rows = await this.db
      .selectFrom('alliance')
      .selectAll()
      .where('faction_code', '=', faction_code)
      .where(eb => eb.or([
        eb('name', 'ilike', pattern),
        eb('tag', 'ilike', pattern),
      ]))
      .orderBy('name', 'asc')
      .limit(limit)
      .execute()

    return rows.map(row => this.buildAlliance(row))
  }

  async addMember(member: AllianceMember): Promise<void> {
    await this.db
      .insertInto('alliance_member')
      .values({
        alliance_id: member.alliance_id,
        player_id: member.player_id,
        role: member.role,
        joined_at: toTimestampRequired(member.joined_at),
      })
      .execute()
  }

  async removeMember(player_id: string): Promise<void> {
    await this.db
      .deleteFrom('alliance_member')
      .where('player_id', '=', player_id)
      .execute()
  }

  async updateMemberRole({
    player_id,
    role
  }: {
    player_id: string
    role: AllianceRole
  }): Promise<void> {
    await this.db
      .updateTable('alliance_member')
      .set({ role })
      .where('player_id', '=', player_id)
      .execute()
  }

  async findMembership(player_id: string): Promise<AllianceMember | null> {
    if (!isId(player_id)) {
      return null
    }
    const row = await this.db
      .selectFrom('alliance_member')
      .selectAll()
      .where('player_id', '=', player_id)
      .executeTakeFirst()
    return row ? this.buildMember(row) : null
  }

  async listMembers(alliance_id: string): Promise<AllianceMember[]> {
    const rows = await this.db
      .selectFrom('alliance_member')
      .selectAll()
      .where('alliance_id', '=', alliance_id)
      .orderBy('joined_at', 'asc')
      .execute()
    return rows.map(row => this.buildMember(row))
  }

  async countMembers(alliance_id: string): Promise<number> {
    const result = await this.db
      .selectFrom('alliance_member')
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .where('alliance_id', '=', alliance_id)
      .executeTakeFirstOrThrow()
    return Number(result.count)
  }

  async listTagsByPlayerIds(player_ids: string[]): Promise<AllianceTagEntry[]> {
    const ids = [ ...new Set(player_ids.filter(isId)) ]
    if (ids.length === 0) {
      return []
    }
    const rows = await this.db
      .selectFrom('alliance_member')
      .innerJoin('alliance', 'alliance.id', 'alliance_member.alliance_id')
      .select([
        'alliance_member.player_id',
        'alliance_member.alliance_id',
        'alliance.tag'
      ])
      .where('alliance_member.player_id', 'in', ids)
      .execute()
    return rows.map(row => ({
      player_id: row.player_id,
      alliance_id: row.alliance_id,
      tag: row.tag,
    }))
  }

  async createInvitation(invitation: AllianceInvitation): Promise<void> {
    await this.db
      .insertInto('alliance_invitation')
      .values({
        id: invitation.id,
        alliance_id: invitation.alliance_id,
        player_id: invitation.player_id,
        invited_by: invitation.invited_by,
        created_at: toTimestampRequired(invitation.created_at),
        expires_at: toTimestampRequired(invitation.expires_at),
      })
      .execute()
  }

  async findInvitation(id: string): Promise<AllianceInvitation | null> {
    if (!isId(id)) {
      return null
    }
    const row = await this.db
      .selectFrom('alliance_invitation')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? this.buildInvitation(row) : null
  }

  async listPendingInvitationsForPlayer({
    player_id,
    now
  }: {
    player_id: string
    now: number
  }): Promise<AllianceInvitation[]> {
    const rows = await this.db
      .selectFrom('alliance_invitation')
      .selectAll()
      .where('player_id', '=', player_id)
      .where('expires_at', '>', toTimestampRequired(now))
      .orderBy('created_at', 'desc')
      .execute()
    return rows.map(row => this.buildInvitation(row))
  }

  async findPendingInvitation({
    alliance_id,
    player_id,
    now
  }: {
    alliance_id: string
    player_id: string
    now: number
  }): Promise<AllianceInvitation | null> {
    const row = await this.db
      .selectFrom('alliance_invitation')
      .selectAll()
      .where('alliance_id', '=', alliance_id)
      .where('player_id', '=', player_id)
      .where('expires_at', '>', toTimestampRequired(now))
      .executeTakeFirst()
    return row ? this.buildInvitation(row) : null
  }

  async deleteInvitation(id: string): Promise<void> {
    await this.db
      .deleteFrom('alliance_invitation')
      .where('id', '=', id)
      .execute()
  }

  async deleteInvitationsForPlayer(player_id: string): Promise<void> {
    await this.db
      .deleteFrom('alliance_invitation')
      .where('player_id', '=', player_id)
      .execute()
  }

  async createApplication(application: AllianceApplication): Promise<void> {
    await this.db
      .insertInto('alliance_application')
      .values({
        id: application.id,
        alliance_id: application.alliance_id,
        player_id: application.player_id,
        message: application.message,
        created_at: toTimestampRequired(application.created_at),
      })
      .execute()
  }

  async findApplication(id: string): Promise<AllianceApplication | null> {
    if (!isId(id)) {
      return null
    }
    const row = await this.db
      .selectFrom('alliance_application')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? this.buildApplication(row) : null
  }

  async findApplicationByPlayer({
    alliance_id,
    player_id
  }: {
    alliance_id: string
    player_id: string
  }): Promise<AllianceApplication | null> {
    const row = await this.db
      .selectFrom('alliance_application')
      .selectAll()
      .where('alliance_id', '=', alliance_id)
      .where('player_id', '=', player_id)
      .executeTakeFirst()
    return row ? this.buildApplication(row) : null
  }

  async listApplicationsForAlliance(alliance_id: string): Promise<AllianceApplication[]> {
    const rows = await this.db
      .selectFrom('alliance_application')
      .selectAll()
      .where('alliance_id', '=', alliance_id)
      .orderBy('created_at', 'asc')
      .execute()
    return rows.map(row => this.buildApplication(row))
  }

  async listApplicationsForPlayer(player_id: string): Promise<AllianceApplication[]> {
    const rows = await this.db
      .selectFrom('alliance_application')
      .selectAll()
      .where('player_id', '=', player_id)
      .orderBy('created_at', 'desc')
      .execute()
    return rows.map(row => this.buildApplication(row))
  }

  async deleteApplication(id: string): Promise<void> {
    await this.db
      .deleteFrom('alliance_application')
      .where('id', '=', id)
      .execute()
  }

  async deleteApplicationsForPlayer(player_id: string): Promise<void> {
    await this.db
      .deleteFrom('alliance_application')
      .where('player_id', '=', player_id)
      .execute()
  }

  private buildAlliance(row: Selectable<DB['alliance']>): AllianceEntity {
    return AllianceEntity.create({
      id: row.id,
      name: row.name,
      tag: row.tag,
      description: row.description,
      faction_code: row.faction_code as FactionCode,
      created_at: fromTimestampRequired(row.created_at),
    })
  }

  private buildMember(row: Selectable<DB['alliance_member']>): AllianceMember {
    return {
      alliance_id: row.alliance_id,
      player_id: row.player_id,
      role: row.role as AllianceRole,
      joined_at: fromTimestampRequired(row.joined_at),
    }
  }

  private buildInvitation(row: Selectable<DB['alliance_invitation']>): AllianceInvitation {
    return {
      id: row.id,
      alliance_id: row.alliance_id,
      player_id: row.player_id,
      invited_by: row.invited_by,
      created_at: fromTimestampRequired(row.created_at),
      expires_at: fromTimestampRequired(row.expires_at),
    }
  }

  private buildApplication(row: Selectable<DB['alliance_application']>): AllianceApplication {
    return {
      id: row.id,
      alliance_id: row.alliance_id,
      player_id: row.player_id,
      message: row.message,
      created_at: fromTimestampRequired(row.created_at),
    }
  }
}
