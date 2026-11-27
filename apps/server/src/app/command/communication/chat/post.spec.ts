import type { MockInstance } from 'vitest'
import { postCommunicationChatMessage } from './post'
import { Factory } from '#adapter/factory'
import { RateLimiterInMemory } from '#adapter/rate-limiter'
import { AppEventBus } from '#app/event-bus'
import { Repository } from '#app/port/repository/generic'
import { ChatChannel } from '#core/communication/chat/channel'
import { ChatMessageEntity } from '#core/communication/chat/entity'
import { CommunicationError } from '#core/communication/error'
import { AppEvent } from '#core/events'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'

describe('postCommunicationChatMessage', () => {
  const author = PlayerEntity.initPlayer({
    name: 'Alice',
    faction_code: FactionCode.THE_CONFEDERATION
  })

  let clock: number
  let create: MockInstance
  let listBlockerIds: MockInstance
  let emit: MockInstance

  beforeEach(() => {
    clock = 5_000_000
    create = vi.fn().mockResolvedValue('id')
    listBlockerIds = vi.fn().mockResolvedValue([ 'blocker-1' ])
    emit = vi.fn()
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: { get: vi.fn().mockResolvedValue(author) },
      chat_message: { create },
      player_block: { listBlockerIds },
      alliance: {
        listTagsByPlayerIds: vi.fn().mockResolvedValue([]),
        listMembers: vi.fn().mockResolvedValue([])
      },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
    vi.spyOn(Factory, 'getRateLimiter').mockReturnValue(new RateLimiterInMemory({ clock: () => clock }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores a faction message under the faction key and fans it out to the faction minus blockers', async () => {
    const message = await postCommunicationChatMessage({
      player_id: author.id,
      channel: ChatChannel.FACTION,
      body: '  salut  '
    })

    const stored = create.mock.calls[0][0] as ChatMessageEntity
    expect(stored.channel).toBe(`faction:${FactionCode.THE_CONFEDERATION}`)
    expect(stored.body).toBe('salut')
    expect(message).toEqual({
      id: stored.id,
      author: {
        id: author.id,
        name: 'Alice',
        faction_code: FactionCode.THE_CONFEDERATION,
        alliance_tag: null
      },
      body: 'salut',
      created_at: stored.created_at
    })
    expect(listBlockerIds).toHaveBeenCalledWith(author.id)
    expect(emit).toHaveBeenCalledWith(AppEvent.ChatMessage, {
      channel: ChatChannel.FACTION,
      faction_code: FactionCode.THE_CONFEDERATION,
      member_ids: null,
      excluded_player_ids: [ 'blocker-1' ],
      message
    })
  })

  it('fans a global message out to every faction', async () => {
    await postCommunicationChatMessage({
      player_id: author.id,
      channel: ChatChannel.GLOBAL,
      body: 'hello'
    })

    expect(create.mock.calls[0][0].channel).toBe('global')
    expect(emit.mock.calls[0][1].faction_code).toBeNull()
  })

  it('rejects an unknown channel', async () => {
    await expect(postCommunicationChatMessage({
      player_id: author.id,
      channel: 'alliance',
      body: 'hello'
    })).rejects.toThrow(CommunicationError.CHANNEL_FORBIDDEN)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    '',
    '   ',
    'x'.repeat(501)
  ])('rejects body %p', async (body) => {
    await expect(postCommunicationChatMessage({
      player_id: author.id,
      channel: ChatChannel.GLOBAL,
      body
    })).rejects.toThrow(CommunicationError.BODY_INVALID)
  })

  it('rejects a system-controlled author', async () => {
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        get: vi.fn().mockResolvedValue(PlayerEntity.initPlayer({
          name: 'Horde',
          faction_code: FactionCode.THE_ASH_LITURGY,
          system_controlled: true
        }))
      },
      chat_message: { create },
      player_block: { listBlockerIds },
      alliance: {
        listTagsByPlayerIds: vi.fn().mockResolvedValue([]),
        listMembers: vi.fn().mockResolvedValue([])
      },
    } as unknown as Repository)

    await expect(postCommunicationChatMessage({
      player_id: 'system',
      channel: ChatChannel.GLOBAL,
      body: 'hello'
    })).rejects.toThrow(CommunicationError.CHANNEL_FORBIDDEN)
  })

  it('allows one message per 2 seconds per channel, with separate windows per channel', async () => {
    const post = (channel: ChatChannel) => postCommunicationChatMessage({
      player_id: author.id,
      channel,
      body: 'spam'
    })

    await post(ChatChannel.GLOBAL)
    await expect(post(ChatChannel.GLOBAL)).rejects.toThrow(CommunicationError.RATE_LIMITED)
    await post(ChatChannel.FACTION)
    expect(create).toHaveBeenCalledTimes(2)

    clock += 2_000
    await post(ChatChannel.GLOBAL)
    expect(create).toHaveBeenCalledTimes(3)
  })

  describe('alliance channel (slice 033)', () => {
    const useAlliance = (membership: boolean) => {
      const repository = Factory.getRepository()
      repository.alliance = {
        listTagsByPlayerIds: vi.fn().mockResolvedValue(membership
          ? [
            {
              player_id: author.id,
              alliance_id: 'a1',
              tag: 'VEIL'
            } 
          ]
          : []),
        listMembers: vi.fn().mockResolvedValue([
          {
            alliance_id: 'a1',
            player_id: author.id,
            role: 'chef',
            joined_at: 0 
          },
          {
            alliance_id: 'a1',
            player_id: 'ally',
            role: 'membre',
            joined_at: 0 
          },
        ]),
      } as unknown as Repository['alliance']
    }

    it('stores the message under the alliance key and fans it out to current members only', async () => {
      useAlliance(true)

      const message = await postCommunicationChatMessage({
        player_id: author.id,
        channel: ChatChannel.ALLIANCE,
        body: 'rassemblement'
      })

      expect((create.mock.calls[0][0] as ChatMessageEntity).channel).toBe('alliance:a1')
      expect(message.author.alliance_tag).toBe('VEIL')
      expect(emit).toHaveBeenCalledWith(AppEvent.ChatMessage, {
        channel: ChatChannel.ALLIANCE,
        faction_code: null,
        member_ids: [
          author.id,
          'ally' 
        ],
        excluded_player_ids: [ 'blocker-1' ],
        message
      })
    })

    it('rejects a player without alliance', async () => {
      useAlliance(false)

      await expect(postCommunicationChatMessage({
        player_id: author.id,
        channel: ChatChannel.ALLIANCE,
        body: 'rassemblement'
      })).rejects.toThrow(CommunicationError.CHANNEL_FORBIDDEN)
      expect(create).not.toHaveBeenCalled()
    })
  })
})
