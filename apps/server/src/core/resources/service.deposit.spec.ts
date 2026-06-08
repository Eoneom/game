import { ResourcesService } from '#core/resources/service'

describe('ResourcesService.depositUpToCapacity', () => {
  it('deposits up to free warehouse space and returns remaining', () => {
    const result = ResourcesService.depositUpToCapacity({
      state: {
        plastic: 2900,
        mushroom: 3900,
        plasma: 50,
        last_plastic_gather: 0,
        last_mushroom_gather: 0,
        last_plasma_gather: 0,
      },
      resource: {
        plastic: 200,
        mushroom: 200,
        plasma: 25,
      },
      warehouses_capacity: {
        plastic: 3000,
        mushroom: 4000,
      },
    })

    expect(result.deposited).toEqual({
      plastic: 100,
      mushroom: 100,
      plasma: 25,
    })
    expect(result.remaining).toEqual({
      plastic: 100,
      mushroom: 100,
      plasma: 0,
    })
    expect(result.next.plastic).toBe(3000)
    expect(result.next.mushroom).toBe(4000)
    expect(result.next.plasma).toBe(75)
  })

  it('deposits all plasma even when warehouses are full', () => {
    const result = ResourcesService.depositUpToCapacity({
      state: {
        plastic: 3000,
        mushroom: 4000,
        plasma: 10,
        last_plastic_gather: 0,
        last_mushroom_gather: 0,
        last_plasma_gather: 0,
      },
      resource: {
        plastic: 50,
        mushroom: 50,
        plasma: 40,
      },
      warehouses_capacity: {
        plastic: 3000,
        mushroom: 4000,
      },
    })

    expect(result.deposited).toEqual({
      plastic: 0,
      mushroom: 0,
      plasma: 40,
    })
    expect(result.remaining).toEqual({
      plastic: 50,
      mushroom: 50,
      plasma: 0,
    })
    expect(result.next.plasma).toBe(50)
  })
})
