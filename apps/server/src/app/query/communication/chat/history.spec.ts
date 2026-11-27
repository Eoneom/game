import type { MockInstance } from 'vitest'
import { CommunicationChatHistoryQuery } from './history'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { ChatMessageEntity } from '#core/communication/chat/entity'
import { CommunicationError } from '#core/communication/error'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'

describe('CommunicationChatHistoryQuery', () => {
  const viewer = PlayerEntity.initPlayer({
    name: 'Alice',
    faction_code: FactionCode.THE_CONFEDERATION
  })
  const author = PlayerEntity.initPlayer({
    name: 'Bob',
    faction_code: FactionCode.THE_CONFEDERATION
  })
  const message = (index: number) => ChatMessageEntity.create({
    id: `m${index}`,
    channel: `faction:${FactionCode.THE_CONFEDERATION}`,
    author_id: author.id,
    body: `body ${index}`,
    created_at: index
  })

  let listHistory: MockInstance

  beforeEach(() => {
    listHistory = vi.fn().mockResolvedValue([
      message(3),
      message(2),
      message(1)
    ])
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        get: vi.fn().mockResolvedValue(viewer),
        listByIds: vi.fn().mockResolvedValue([ author ])
      },
      chat_message: { listHistory },
      alliance: {
        findMembership: vi.fn().mockResolvedValue(null),
        listTagsByPlayerIds: vi.fn().mockResolvedValue([])
      },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the caller faction channel newest first, one extra row telling whether more exist', async () => {
    const result = await new CommunicationChatHistoryQuery().run({
      player_id: viewer.id,
      channel: 'faction',
      before: 'm4',
      limit: 2
    })

    expect(listHistory).toHaveBeenCalledWith({
      channel_key: `faction:${FactionCode.THE_CONFEDERATION}`,
      viewer_id: viewer.id,
      before: 'm4',
      limit: 3
    })
    expect(result.has_more).toBe(true)
    expect(result.messages).toEqual([
      {
        id: 'm3',
        author: {
          id: author.id,
          name: 'Bob',
          faction_code: FactionCode.THE_CONFEDERATION,
          alliance_tag: null
        },
        body: 'body 3',
        created_at: 3
      },
      expect.objectContaining({ id: 'm2' }),
    ])
  })

  it('reports the last page', async () => {
    const result = await new CommunicationChatHistoryQuery().run({
      player_id: viewer.id,
      channel: 'global',
      limit: 5
    })

    expect(listHistory.mock.calls[0][0].channel_key).toBe('global')
    expect(result.has_more).toBe(false)
    expect(result.messages).toHaveLength(3)
  })

  it.each([
    [
      undefined,
      51
    ],
    [
      500,
      101
    ],
    [
      0,
      2
    ],
  ])('clamps limit %p (default 50, max 100)', async (limit, expected) => {
    await new CommunicationChatHistoryQuery().run({
      player_id: viewer.id,
      channel: 'global',
      limit
    })

    expect(listHistory.mock.calls[0][0].limit).toBe(expected)
  })

  it('rejects an unknown channel', async () => {
    await expect(new CommunicationChatHistoryQuery().run({
      player_id: viewer.id,
      channel: 'guild'
    })).rejects.toThrow(CommunicationError.CHANNEL_FORBIDDEN)
  })

  it('rejects the alliance channel without an alliance: leaving removes access (slice 033)', async () => {
    await expect(new CommunicationChatHistoryQuery().run({
      player_id: viewer.id,
      channel: 'alliance'
    })).rejects.toThrow(CommunicationError.CHANNEL_FORBIDDEN)
  })

  it('reads the alliance channel of a member, with [TAG] authors (slice 033)', async () => {
    const repository = Factory.getRepository()
    repository.alliance = {
      findMembership: vi.fn().mockResolvedValue({
        alliance_id: 'a1',
        player_id: viewer.id,
        role: 'membre',
        joined_at: 0
      }),
      listTagsByPlayerIds: vi.fn().mockResolvedValue([
        {
          player_id: author.id,
          alliance_id: 'a1',
          tag: 'VEIL'
        } 
      ]),
    } as unknown as Repository['alliance']

    const result = await new CommunicationChatHistoryQuery().run({
      player_id: viewer.id,
      channel: 'alliance'
    })

    expect(listHistory.mock.calls[0][0].channel_key).toBe('alliance:a1')
    expect(result.messages[0].author.alliance_tag).toBe('VEIL')
  })
})
