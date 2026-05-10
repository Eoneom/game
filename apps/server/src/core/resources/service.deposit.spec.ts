import { ResourcesService } from '#core/resources/service'

describe('ResourcesService.depositUpToCapacity', () => {
  it('deposits up to free warehouse space and returns remaining', () => {
    const result = ResourcesService.depositUpToCapacity({
      state: {
        plastic: 2900,
        mushroom: 3900,
        last_plastic_gather: 0,
        last_mushroom_gather: 0,
      },
      resource: {
        plastic: 200,
        mushroom: 200,
      },
      warehouses_capacity: {
        plastic: 3000,
        mushroom: 4000,
      },
    })

    expect(result.deposited).toEqual({
      plastic: 100,
      mushroom: 100,
    })
    expect(result.remaining).toEqual({
      plastic: 100,
      mushroom: 100,
    })
    expect(result.next.plastic).toBe(3000)
    expect(result.next.mushroom).toBe(4000)
  })

  it('deposits nothing when warehouses are full', () => {
    const result = ResourcesService.depositUpToCapacity({
      state: {
        plastic: 3000,
        mushroom: 4000,
        last_plastic_gather: 0,
        last_mushroom_gather: 0,
      },
      resource: {
        plastic: 50,
        mushroom: 50,
      },
      warehouses_capacity: {
        plastic: 3000,
        mushroom: 4000,
      },
    })

    expect(result.deposited).toEqual({
      plastic: 0,
      mushroom: 0,
    })
    expect(result.remaining).toEqual({
      plastic: 50,
      mushroom: 50,
    })
  })
})
