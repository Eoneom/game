import { GenericQuery } from '#query/generic'
import { ALLIANCE_SEARCH_LIMIT } from '#core/alliance/constant/limits'
import { AllianceEntity } from '#core/alliance/entity'

interface AllianceSearchQueryRequest {
  player_id: string
  q: string
}

type AllianceSearchItem = {
  alliance: AllianceEntity
  member_count: number
}

/** Alliances of the caller's faction whose name or tag starts with `q` (all of them when `q` is empty). */
export class AllianceSearchQuery extends GenericQuery<AllianceSearchQueryRequest, AllianceSearchItem[]> {
  constructor() {
    super({ name: 'alliance:search' })
  }

  protected async get({
    player_id,
    q
  }: AllianceSearchQueryRequest): Promise<AllianceSearchItem[]> {
    const player = await this.repository.player.get(player_id)
    const alliances = await this.repository.alliance.search({
      faction_code: player.faction_code,
      prefix: q.trim(),
      limit: ALLIANCE_SEARCH_LIMIT,
    })
    const counts = await Promise.all(alliances.map(alliance => this.repository.alliance.countMembers(alliance.id)))
    return alliances.map((alliance, index) => ({
      alliance,
      member_count: counts[index],
    }))
  }
}
