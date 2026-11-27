import { GenericQuery } from '#query/generic'
import {
  AllianceMemberCity,
  listCitiesWithCoordinates
} from '#query/alliance/shared'
import { ALLIANCE_LEAVE_COOLDOWN_MS } from '#core/alliance/constant/limits'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceService } from '#core/alliance/service'
import { now } from '#shared/time'

interface AllianceMineQueryRequest {
  player_id: string
}

type AllianceMineMember = {
  player_id: string
  name: string
  role: AllianceRole
  joined_at: number
  cities: AllianceMemberCity[]
}

interface AllianceMineQueryResponse {
  alliance: {
    entity: AllianceEntity
    viewer_role: AllianceRole
    members: AllianceMineMember[]
  } | null
  /** End of the leave cooldown while it runs, `null` otherwise. */
  cooldown_until: number | null
}

/** The caller's alliance with members (name, role, cities with coordinates), or `null`. */
export class AllianceMineQuery extends GenericQuery<AllianceMineQueryRequest, AllianceMineQueryResponse> {
  constructor() {
    super({ name: 'alliance:mine' })
  }

  protected async get({ player_id }: AllianceMineQueryRequest): Promise<AllianceMineQueryResponse> {
    const [
      player,
      membership
    ] = await Promise.all([
      this.repository.player.get(player_id),
      this.repository.alliance.findMembership(player_id),
    ])
    const cooldown_until = AllianceService.isCooldownActive({
      alliance_left_at: player.alliance_left_at,
      now: now()
    }) && player.alliance_left_at !== null
      ? player.alliance_left_at + ALLIANCE_LEAVE_COOLDOWN_MS
      : null

    if (!membership) {
      return {
        alliance: null,
        cooldown_until
      }
    }

    const [
      entity,
      members
    ] = await Promise.all([
      this.repository.alliance.get(membership.alliance_id),
      this.repository.alliance.listMembers(membership.alliance_id),
    ])
    const players = await this.repository.player.listByIds(members.map(member => member.player_id))
    const name_by_id = new Map(players.map(member => [
      member.id,
      member.name
    ]))
    const cities = await Promise.all(members.map(member => listCitiesWithCoordinates(member.player_id)))

    return {
      alliance: {
        entity,
        viewer_role: membership.role,
        members: members.map((member, index) => ({
          player_id: member.player_id,
          name: name_by_id.get(member.player_id) ?? '',
          role: member.role,
          joined_at: member.joined_at,
          cities: cities[index],
        })),
      },
      cooldown_until,
    }
  }
}
