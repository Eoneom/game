import { CommunicationListBlockQuery } from './list'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'

describe('CommunicationListBlockQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists blocked players with their name and block date', async () => {
    const blocked = PlayerEntity.initPlayer({
      name: 'Bob',
      faction_code: FactionCode.THE_ASH_LITURGY
    })
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player_block: {
        listBlocked: vi.fn().mockResolvedValue([
          {
            blocked_id: blocked.id,
            created_at: 42
          } 
        ])
      },
      player: { listByIds: vi.fn().mockResolvedValue([ blocked ]) },
    } as unknown as Repository)

    expect(await new CommunicationListBlockQuery().run({ player_id: 'me' })).toEqual([
      {
        id: blocked.id,
        name: 'Bob',
        faction_code: FactionCode.THE_ASH_LITURGY,
        blocked_at: 42
      } 
    ])
  })
})
