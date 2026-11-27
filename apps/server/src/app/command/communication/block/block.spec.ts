import type { MockInstance } from 'vitest'
import { blockCommunicationPlayer } from './block'
import { unblockCommunicationPlayer } from './unblock'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CommunicationError } from '#core/communication/error'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'
import { PlayerError } from '#core/player/error'

describe('blockCommunicationPlayer / unblockCommunicationPlayer', () => {
  const blocker = PlayerEntity.initPlayer({
    name: 'Alice',
    faction_code: FactionCode.THE_CONFEDERATION
  })
  const target = PlayerEntity.initPlayer({
    name: 'Bob',
    faction_code: FactionCode.THE_CONFEDERATION
  })
  const system = PlayerEntity.initPlayer({
    name: 'Horde',
    faction_code: FactionCode.THE_ASH_LITURGY,
    system_controlled: true
  })

  let block: MockInstance
  let unblock: MockInstance

  beforeEach(() => {
    block = vi.fn().mockResolvedValue(undefined)
    unblock = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        getByName: vi.fn(async (name: string) => {
          const player = [
            blocker,
            target,
            system
          ].find(candidate => candidate.name === name)
          if (!player) throw new Error(PlayerError.NOT_FOUND)
          return player
        })
      },
      player_block: {
        block,
        unblock
      },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks a human player by name', async () => {
    const result = await blockCommunicationPlayer({
      blocker_id: blocker.id,
      player_name: ' Bob '
    })

    expect(result).toEqual({ blocked_id: target.id })
    expect(block).toHaveBeenCalledWith(expect.objectContaining({
      blocker_id: blocker.id,
      blocked_id: target.id
    }))
  })

  it.each([
    'Alice',
    'Horde'
  ])('rejects blocking %s', async (player_name) => {
    await expect(blockCommunicationPlayer({
      blocker_id: blocker.id,
      player_name
    })).rejects.toThrow(CommunicationError.BLOCK_INVALID)
    expect(block).not.toHaveBeenCalled()
  })

  it('reports an unknown player', async () => {
    await expect(blockCommunicationPlayer({
      blocker_id: blocker.id,
      player_name: 'Nobody'
    })).rejects.toThrow(PlayerError.NOT_FOUND)
  })

  it('unblocks', async () => {
    await unblockCommunicationPlayer({
      blocker_id: blocker.id,
      blocked_id: target.id
    })

    expect(unblock).toHaveBeenCalledWith({
      blocker_id: blocker.id,
      blocked_id: target.id
    })
  })
})
