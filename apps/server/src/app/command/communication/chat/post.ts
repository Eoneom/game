import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import type { ChatMessageView } from '#app/event-bus'
import { assertCommunicationRateLimit } from '#app/command/communication/rate-limit'
import {
  chatChannelKey,
  ChatChannel,
  isChatChannel
} from '#core/communication/chat/channel'
import { ChatMessageEntity } from '#core/communication/chat/entity'
import { CHAT_RATE_LIMIT_WINDOW_MS } from '#core/communication/constant/limits'
import { CommunicationError } from '#core/communication/error'
import { CommunicationService } from '#core/communication/service'
import { AppEvent } from '#core/events'
import { id } from '#shared/identification'
import { now } from '#shared/time'

interface PostCommunicationChatMessageParams {
  player_id: string
  channel: string
  body: unknown
}

export async function postCommunicationChatMessage({
  player_id,
  channel,
  body,
}: PostCommunicationChatMessageParams): Promise<ChatMessageView> {
  if (!isChatChannel(channel)) {
    throw new Error(CommunicationError.CHANNEL_FORBIDDEN)
  }

  const {
    message, excluded_player_ids, faction_code, member_ids
  } = await runCommand('communication:chat:post', async () => {
    const repository = Factory.getRepository()

    const author = await repository.player.get(player_id)
    const [ author_alliance ] = await repository.alliance.listTagsByPlayerIds([ author.id ])
    const alliance_id = author_alliance?.alliance_id ?? null
    const channel_key = chatChannelKey({
      channel,
      faction_code: author.faction_code,
      alliance_id
    })
    if (channel_key === null || !CommunicationService.canAccessChannel({
      player: author,
      channel_key,
      alliance_id
    })) {
      throw new Error(CommunicationError.CHANNEL_FORBIDDEN)
    }

    const normalized_body = CommunicationService.normalizeChatBody(body)

    assertCommunicationRateLimit({
      player_id,
      scope: `chat:${channel_key}`,
      window_ms: CHAT_RATE_LIMIT_WINDOW_MS
    })

    const entity = ChatMessageEntity.create({
      id: id(),
      channel: channel_key,
      author_id: author.id,
      body: normalized_body,
      created_at: now(),
    })
    await repository.chat_message.create(entity)

    const blocker_ids = await repository.player_block.listBlockerIds(author.id)

    const view: ChatMessageView = {
      id: entity.id,
      author: {
        id: author.id,
        name: author.name,
        faction_code: author.faction_code,
        alliance_tag: author_alliance?.tag ?? null
      },
      body: entity.body,
      created_at: entity.created_at
    }

    const alliance_member_ids = channel === ChatChannel.ALLIANCE && alliance_id
      ? (await repository.alliance.listMembers(alliance_id)).map(member => member.player_id)
      : null

    return {
      message: view,
      excluded_player_ids: blocker_ids,
      faction_code: channel === ChatChannel.FACTION ? author.faction_code : null,
      member_ids: alliance_member_ids
    }
  })

  Factory.getEventBus().emit(AppEvent.ChatMessage, {
    channel,
    faction_code,
    member_ids,
    excluded_player_ids,
    message
  })

  return message
}
