import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { TroopReinforcementListQuery } from '#query/troop/reinforcement/list'
import { TroopReinforcementAbroadQuery } from '#query/troop/reinforcement/abroad'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { id } from '#shared/identification'

describe('reinforcement queries (slice 033)', () => {
  const host_id = id()
  const ally_id = id()
  const city_id = id()
  const city = CityEntity.create({
    id: city_id,
    player_id: host_id,
    name: 'Bastion',
    cell_id: 'city-cell',
  })
  const ally = PlayerEntity.create({
    id: ally_id,
    name: 'Alice',
    faction_code: FactionCode.THE_CONFEDERATION,
    system_controlled: false,
  })
  const host = PlayerEntity.create({
    id: host_id,
    name: 'Hector',
    faction_code: FactionCode.THE_CONFEDERATION,
    system_controlled: false,
  })
  const stationed = TroopEntity.create({
    id: 'ally-legion',
    player_id: ally_id,
    cell_id: 'city-cell',
    code: TroopCode.LEGIONNAIRE,
    count: 6,
    movement_id: null,
  })

  beforeEach(() => {
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: {
        get: vi.fn().mockResolvedValue(city),
        searchByCell: vi.fn().mockResolvedValue(city),
      },
      cell: {
        getById: vi.fn().mockResolvedValue({
          coordinates: {
            x: 5,
            y: 5 
          } 
        }) 
      },
      troop: {
        listReinforcementsInCell: vi.fn().mockResolvedValue([ stationed ]),
        listStationedAbroad: vi.fn().mockResolvedValue([ stationed ]),
      },
      player: {
        listByIds: vi.fn(async (ids: string[]) => [
          ally,
          host 
        ].filter(player => ids.includes(player.id))) 
      },
      alliance: {
        listTagsByPlayerIds: vi.fn(async (ids: string[]) => ids.map(player_id => ({
          player_id,
          alliance_id: 'a1',
          tag: 'VEIL'
        }))),
      },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists allied troops stationed in the host city per owner', async () => {
    const result = await new TroopReinforcementListQuery().run({
      player_id: host_id,
      city_id,
    })
    expect(result).toEqual([
      {
        owner: {
          id: ally_id,
          name: '[VEIL] Alice' 
        },
        troops: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 6 
          } 
        ],
      },
    ])
  })

  it('rejects a city of another player', async () => {
    await expect(new TroopReinforcementListQuery().run({
      player_id: ally_id,
      city_id,
    })).rejects.toThrow(CityError.NOT_OWNER)
  })

  it('lists the owner troops stationed abroad with their host', async () => {
    const result = await new TroopReinforcementAbroadQuery().run({ player_id: ally_id })
    expect(result).toEqual([
      {
        city: {
          id: city_id,
          name: 'Bastion',
          coordinates: {
            x: 5,
            y: 5 
          } 
        },
        host: {
          id: host_id,
          name: '[VEIL] Hector' 
        },
        troops: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 6 
          } 
        ],
      },
    ])
  })
})
