import { GenericQuery } from '#query/generic'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceError } from '#core/alliance/error'

interface AllianceGetQueryRequest {
  alliance_id: string
}

interface AllianceGetQueryResponse {
  alliance: AllianceEntity
  member_count: number
  chef: { id: string, name: string } | null
}

/** Public view of an alliance: name, tag, description, member count, chef. */
export class AllianceGetQuery extends GenericQuery<AllianceGetQueryRequest, AllianceGetQueryResponse> {
  constructor() {
    super({ name: 'alliance:get' })
  }

  protected async get({ alliance_id }: AllianceGetQueryRequest): Promise<AllianceGetQueryResponse> {
    const alliance = await this.repository.alliance.findById(alliance_id)
    if (!alliance) {
      throw new Error(AllianceError.NOT_FOUND)
    }
    const members = await this.repository.alliance.listMembers(alliance.id)
    const chef_member = members.find(member => member.role === AllianceRole.CHEF)
    const chef = chef_member ? await this.repository.player.get(chef_member.player_id) : null
    return {
      alliance,
      member_count: members.length,
      chef: chef
        ? {
          id: chef.id,
          name: chef.name
        }
        : null,
    }
  }
}
