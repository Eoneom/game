import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaFinishUpgrade } from './upgrade'
import { finishBuildingUpgrade } from '#app/command/building/finish-upgrade'

vi.mock('#app/command/building/finish-upgrade')

describe('sagaFinishUpgrade', () => {
  const player_id = 'player_id'
  const city_id = 'city_id'
  const building_id = 'building_id'
  const level = 0
  const upgraded_at = 1000

  beforeEach(() => {
    vi.clearAllMocks()
    ;(finishBuildingUpgrade as MockInstance).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls finishBuildingUpgrade with correct args', async () => {
    await sagaFinishUpgrade({
      player_id,
      city_id,
      building_id,
      level,
      upgraded_at
    })

    assert.strictEqual((finishBuildingUpgrade as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((finishBuildingUpgrade as MockInstance).mock.calls[0][0], {
      player_id,
      city_id,
      building_id,
      level,
      upgraded_at
    })
  })
})
