import {
  vi, type MockInstance
} from 'vitest'
import assert from 'assert'
import { sagaResearchTechnology } from './research-technology'
import { researchTechnology } from '#app/command/technology/research'
import { TechnologyCode } from '#core/technology/constant/code'

vi.mock('#app/command/technology/research')

describe('sagaResearchTechnology', () => {
  const player_id = 'player_id'
  const city_id = 'city_id'
  const technology_code = TechnologyCode.ARCHITECTURE

  beforeEach(() => {
    vi.clearAllMocks()
    ;(researchTechnology as MockInstance).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls researchTechnology with correct args', async () => {
    await sagaResearchTechnology({
      player_id,
      city_id,
      technology_code
    })

    assert.strictEqual((researchTechnology as MockInstance).mock.calls.length, 1)
    assert.deepStrictEqual((researchTechnology as MockInstance).mock.calls[0][0], {
      player_id,
      city_id,
      technology_code
    })
  })

  it('propagates errors from researchTechnology', async () => {
    (researchTechnology as MockInstance).mockRejectedValue(new Error('research error'))

    await assert.rejects(() => sagaResearchTechnology({
      player_id,
      city_id,
      technology_code
    }), /research error/)
  })
})
