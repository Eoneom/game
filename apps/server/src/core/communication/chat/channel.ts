import { FactionCode } from '../../faction/constant/code'

/** Chat channel identifiers on the wire (slice 032; `alliance` since slice 033). */
export enum ChatChannel {
  GLOBAL = 'global',
  FACTION = 'faction',
  ALLIANCE = 'alliance',
}

export const isChatChannel = (value: unknown): value is ChatChannel => {
  return Object.values(ChatChannel).includes(value as ChatChannel)
}

/**
 * Stored channel key: `global`, `faction:<faction_code>` or `alliance:<alliance_id>`.
 * `null` for the alliance channel when the player has no alliance.
 */
export const chatChannelKey = ({
  channel,
  faction_code,
  alliance_id = null
}: {
  channel: ChatChannel
  faction_code: FactionCode
  alliance_id?: string | null
}): string | null => {
  switch (channel) {
  case ChatChannel.FACTION:
    return `${ChatChannel.FACTION}:${faction_code}`
  case ChatChannel.ALLIANCE:
    return alliance_id ? allianceChatChannelKey(alliance_id) : null
  default:
    return ChatChannel.GLOBAL
  }
}

export const allianceChatChannelKey = (alliance_id: string): string => `${ChatChannel.ALLIANCE}:${alliance_id}`
