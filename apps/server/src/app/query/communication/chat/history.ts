import { GenericQuery } from '#query/generic'
import type { ChatMessageView } from '#app/event-bus'
import {
  chatChannelKey,
  isChatChannel
} from '#core/communication/chat/channel'
import {
  CHAT_HISTORY_DEFAULT_LIMIT,
  CHAT_HISTORY_MAX_LIMIT
} from '#core/communication/constant/limits'
import { CommunicationError } from '#core/communication/error'
import { CommunicationService } from '#core/communication/service'

interface CommunicationChatHistoryQueryRequest {
  player_id: string
  channel: string
  before?: string
  limit?: number
}

interface CommunicationChatHistoryQueryResponse {
  messages: ChatMessageView[]
  has_more: boolean
}

const normalizeChatHistoryLimit = (limit: number | undefined): number => {
  if (limit === undefined || !Number.isFinite(limit)) {
    return CHAT_HISTORY_DEFAULT_LIMIT
  }
  return Math.min(CHAT_HISTORY_MAX_LIMIT, Math.max(1, Math.floor(limit)))
}

/** Newest first, without messages from players the caller blocked. */
export class CommunicationChatHistoryQuery extends GenericQuery<CommunicationChatHistoryQueryRequest, CommunicationChatHistoryQueryResponse> {
  constructor() {
    super({ name: 'communication:chat:history' })
  }

  protected async get({
    player_id,
    channel,
    before,
    limit
  }: CommunicationChatHistoryQueryRequest): Promise<CommunicationChatHistoryQueryResponse> {
    if (!isChatChannel(channel)) {
      throw new Error(CommunicationError.CHANNEL_FORBIDDEN)
    }

    const viewer = await this.repository.player.get(player_id)
    const membership = await this.repository.alliance.findMembership(player_id)
    const alliance_id = membership?.alliance_id ?? null
    const channel_key = chatChannelKey({
      channel,
      faction_code: viewer.faction_code,
      alliance_id
    })
    if (channel_key === null || !CommunicationService.canAccessChannel({
      player: viewer,
      channel_key,
      alliance_id
    })) {
      throw new Error(CommunicationError.CHANNEL_FORBIDDEN)
    }

    const page_size = normalizeChatHistoryLimit(limit)
    const rows = await this.repository.chat_message.listHistory({
      channel_key,
      viewer_id: player_id,
      before,
      limit: page_size + 1
    })
    const page = rows.slice(0, page_size)

    const author_ids = [ ...new Set(page.map(message => message.author_id)) ]
    const [
      authors,
      tags
    ] = await Promise.all([
      this.repository.player.listByIds(author_ids),
      this.repository.alliance.listTagsByPlayerIds(author_ids)
    ])
    const author_by_id = new Map(authors.map(author => [
      author.id,
      author
    ]))
    const tag_by_player_id = new Map(tags.map(entry => [
      entry.player_id,
      entry.tag
    ]))

    const messages = page.flatMap((message): ChatMessageView[] => {
      const author = author_by_id.get(message.author_id)
      if (!author) {
        return []
      }
      return [
        {
          id: message.id,
          author: {
            id: author.id,
            name: author.name,
            faction_code: author.faction_code,
            alliance_tag: tag_by_player_id.get(author.id) ?? null
          },
          body: message.body,
          created_at: message.created_at
        } 
      ]
    })

    return {
      messages,
      has_more: rows.length > page_size
    }
  }
}
