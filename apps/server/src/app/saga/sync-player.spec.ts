import {
  vi, type MockInstance 
} from 'vitest'
import assert from 'assert'
import { sagaSyncPlayer } from './sync-player'
import { sagaRefreshGameState } from '#app/saga/game/refresh-state'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { id } from '#shared/identification'

vi.mock('#app/saga/game/refresh-state')
vi.mock('#adapter/factory', () => ({
  Factory: {
    getLogger: vi.fn().mockReturnValue({ info: vi.fn() }),
    getRepository: vi.fn(),
  }
}))

describe('sagaSyncPlayer', () => {
  const player_id = id()
  const city_id_1 = id()
  const city_id_2 = id()
  let cityList: MockInstance
  let repository: Pick<Repository, 'city'>

  beforeEach(() => {
    cityList = vi.fn().mockResolvedValue([])
    repository = { city: { list: cityList } as unknown as Repository['city'] }
    ;(Factory.getRepository as MockInstance).mockReturnValue(repository)
    ;(sagaRefreshGameState as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists cities for the given player', async () => {
    await sagaSyncPlayer({ player_id })

    assert.strictEqual(cityList.mock.calls.length, 1)
    assert.deepStrictEqual(cityList.mock.calls[0][0], { player_id })
  })

  it('does not call sagaRefreshGameState when player has no cities', async () => {
    cityList.mockResolvedValue([])

    await sagaSyncPlayer({ player_id })

    assert.strictEqual((sagaRefreshGameState as MockInstance).mock.calls.length, 0)
  })

  it('calls sagaRefreshGameState for each city', async () => {
    const cities = [
      { id: city_id_1 },
      { id: city_id_2 },
    ]
    cityList.mockResolvedValue(cities)

    await sagaSyncPlayer({ player_id })

    assert.strictEqual((sagaRefreshGameState as MockInstance).mock.calls.length, 2)
    const call_args = (sagaRefreshGameState as MockInstance).mock.calls.map(([ arg ]) => arg)
    assert.ok(call_args.some(arg => arg.player_id === player_id && arg.city_id === city_id_1))
    assert.ok(call_args.some(arg => arg.player_id === player_id && arg.city_id === city_id_2))
  })
})
