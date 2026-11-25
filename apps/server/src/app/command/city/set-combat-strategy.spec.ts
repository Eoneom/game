import type { MockInstance } from 'vitest'
import assert from 'assert'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { citySetCombatStrategy } from '#app/command/city/set-combat-strategy'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'

describe('citySetCombatStrategy', () => {
  const city_id = 'city-id'
  const player_id = 'player-id'

  let updateOne: MockInstance
  let get: MockInstance

  const make = ({ owner = player_id, current = null as CombatStrategy | null } = {}) =>
    CityEntity.create({ id: city_id, player_id: owner, name: 'Core I', cell_id: 'cell-id', default_combat_strategy: current })

  beforeEach(() => {
    updateOne = vi.fn().mockResolvedValue(undefined)
    get = vi.fn().mockResolvedValue(make())
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: { get: get, updateOne },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects when the player does not own the city', async () => {
    get.mockResolvedValue(make({ owner: 'someone-else' }))

    await assert.rejects(
      () => citySetCombatStrategy({ city_id, player_id, combat_strategy: CombatStrategy.HOLD_THE_LINE }),
      new RegExp(CityError.NOT_OWNER)
    )
    assert.strictEqual(updateOne.mock.calls.length, 0)
  })

  it('stores the new default strategy', async () => {
    await citySetCombatStrategy({ city_id, player_id, combat_strategy: CombatStrategy.HOLD_THE_LINE })

    assert.strictEqual(updateOne.mock.calls.length, 1)
    assert.strictEqual(updateOne.mock.calls[0][0].id, city_id)
    assert.strictEqual(updateOne.mock.calls[0][0].default_combat_strategy, CombatStrategy.HOLD_THE_LINE)
  })

  it('skips the write when the strategy is unchanged', async () => {
    get.mockResolvedValue(make({ current: CombatStrategy.OPENING_STRIKE }))

    await citySetCombatStrategy({ city_id, player_id, combat_strategy: CombatStrategy.OPENING_STRIKE })

    assert.strictEqual(updateOne.mock.calls.length, 0)
  })
})
