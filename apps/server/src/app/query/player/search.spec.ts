import type { MockInstance } from 'vitest'
import { PlayerSearchQuery } from './search'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'

describe('PlayerSearchQuery', () => {
  let searchHumansByNamePrefix: MockInstance

  beforeEach(() => {
    searchHumansByNamePrefix = vi.fn().mockResolvedValue([])
    vi.spyOn(Factory, 'getRepository').mockReturnValue({ player: { searchHumansByNamePrefix } } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('searches humans by trimmed prefix, at most 10', async () => {
    await new PlayerSearchQuery().run({ q: ' Al ' })

    expect(searchHumansByNamePrefix).toHaveBeenCalledWith({
      prefix: 'Al',
      limit: 10
    })
  })

  it('returns nothing under 2 characters', async () => {
    expect(await new PlayerSearchQuery().run({ q: 'A' })).toEqual([])
    expect(searchHumansByNamePrefix).not.toHaveBeenCalled()
  })
})
