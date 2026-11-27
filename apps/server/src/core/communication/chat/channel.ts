import { FactionCode } from '../../faction/constant/code'

/** Chat channel identifiers on the wire (slice 032). The alliance channel comes with slice 033. */
export enum ChatChannel {
  GLOBAL = 'global',
  FACTION = 'faction',
}

export const isChatChannel = (value: unknown): value is ChatChannel => {
  return Object.values(ChatChannel).includes(value as ChatChannel)
}

/** Stored channel key: `global` or `faction:<faction_code>`. */
export const chatChannelKey = ({
  channel,
  faction_code
}: {
  channel: ChatChannel
  faction_code: FactionCode
}): string => {
  return channel === ChatChannel.FACTION ? `faction:${faction_code}` : ChatChannel.GLOBAL
}
