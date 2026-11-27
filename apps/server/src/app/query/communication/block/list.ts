import { GenericQuery } from '#query/generic'
import { FactionCode } from '#core/faction/constant/code'

interface CommunicationListBlockQueryRequest {
  player_id: string
}

interface CommunicationBlockedPlayer {
  id: string
  name: string
  faction_code: FactionCode
  blocked_at: number
}

export class CommunicationListBlockQuery extends GenericQuery<CommunicationListBlockQueryRequest, CommunicationBlockedPlayer[]> {
  constructor() {
    super({ name: 'communication:block:list' })
  }

  protected async get({ player_id }: CommunicationListBlockQueryRequest): Promise<CommunicationBlockedPlayer[]> {
    const entries = await this.repository.player_block.listBlocked(player_id)
    const players = await this.repository.player.listByIds(entries.map(entry => entry.blocked_id))
    const player_by_id = new Map(players.map(player => [
      player.id,
      player
    ]))

    return entries.flatMap((entry): CommunicationBlockedPlayer[] => {
      const player = player_by_id.get(entry.blocked_id)
      return player
        ? [
          {
            id: player.id,
            name: player.name,
            faction_code: player.faction_code,
            blocked_at: entry.created_at
          } 
        ]
        : []
    })
  }
}
