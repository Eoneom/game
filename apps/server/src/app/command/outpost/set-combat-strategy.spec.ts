import type { MockInstance } from 'vitest'
import assert from 'assert'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { outpostSetCombatStrategy } from '#app/command/outpost/set-combat-strategy'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostError } from '#core/outpost/error'

describe('outpostSetCombatStrategy', () => {
  const outpost_id = 'outpost-id'
  const player_id = 'player-id'

  let updateOne: MockInstance
  let get: MockInstance

  const make = ({ owner = player_id, current = null as CombatStrategy | null } = {}) =>
    OutpostEntity.create({ id: outpost_id, player_id: owner, cell_id: 'cell-id', type: OutpostType.PERMANENT, default_combat_strategy: current })

  beforeEach(() => {
    updateOne = vi.fn().mockResolvedValue(undefined)
    get = vi.fn().mockResolvedValue(make())
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      outpost: { getById: get, updateOne },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects when the player does not own the outpost', async () => {
    get.mockResolvedValue(make({ owner: 'someone-else' }))

    await assert.rejects(
      () => outpostSetCombatStrategy({ outpost_id, player_id, combat_strategy: CombatStrategy.HOLD_THE_LINE }),
      new RegExp(OutpostError.NOT_OWNER)
    )
    assert.strictEqual(updateOne.mock.calls.length, 0)
  })

  it('stores the new default strategy', async () => {
    await outpostSetCombatStrategy({ outpost_id, player_id, combat_strategy: CombatStrategy.HOLD_THE_LINE })

    assert.strictEqual(updateOne.mock.calls.length, 1)
    assert.strictEqual(updateOne.mock.calls[0][0].id, outpost_id)
    assert.strictEqual(updateOne.mock.calls[0][0].default_combat_strategy, CombatStrategy.HOLD_THE_LINE)
  })

  it('skips the write when the strategy is unchanged', async () => {
    get.mockResolvedValue(make({ current: CombatStrategy.OPENING_STRIKE }))

    await outpostSetCombatStrategy({ outpost_id, player_id, combat_strategy: CombatStrategy.OPENING_STRIKE })

    assert.strictEqual(updateOne.mock.calls.length, 0)
  })
})
