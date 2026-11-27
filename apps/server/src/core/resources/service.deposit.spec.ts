import { ResourcesService } from '#core/resources/service'

describe('ResourcesService.depositUpToCapacity', () => {
  it('deposits up to free warehouse space and returns remaining', () => {
    const result = ResourcesService.depositUpToCapacity({
      state: {
        plastic: 2900,
        mushroom: 3900,
        plasma: 50,
        water: 5,
        last_plastic_gather: 0,
        last_mushroom_gather: 0,
        last_plasma_gather: 0,
        last_water_gather: 0,
      },
      resource: {
        plastic: 200,
        mushroom: 200,
        plasma: 25,
        water: 30,
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
      water: 30,
    })
    expect(result.remaining).toEqual({
      plastic: 100,
      mushroom: 100,
      plasma: 0,
      water: 0,
    })
    expect(result.next.plastic).toBe(3000)
    expect(result.next.mushroom).toBe(4000)
    expect(result.next.plasma).toBe(75)
    expect(result.next.water).toBe(35)
  })

  it('deposits all plasma even when warehouses are full', () => {
    const result = ResourcesService.depositUpToCapacity({
      state: {
        plastic: 3000,
        mushroom: 4000,
        plasma: 10,
        water: 0,
        last_plastic_gather: 0,
        last_mushroom_gather: 0,
        last_plasma_gather: 0,
        last_water_gather: 0,
      },
      resource: {
        plastic: 50,
        mushroom: 50,
        plasma: 40,
        water: 0,
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
      water: 0,
    })
    expect(result.remaining).toEqual({
      plastic: 50,
      mushroom: 50,
      plasma: 0,
      water: 0,
    })
    expect(result.next.plasma).toBe(50)
  })

  it('deposits all water into a city even when warehouses are full (unlimited storage, slice 035)', () => {
    const result = ResourcesService.depositUpToCapacity({
      state: {
        plastic: 3000,
        mushroom: 4000,
        plasma: 0,
        water: 1000,
        last_plastic_gather: 0,
        last_mushroom_gather: 0,
        last_plasma_gather: 0,
        last_water_gather: 0,
      },
      resource: {
        plastic: 0,
        mushroom: 0,
        plasma: 0,
        water: 500,
      },
      warehouses_capacity: {
        plastic: 3000,
        mushroom: 4000,
      },
    })

    expect(result.deposited.water).toBe(500)
    expect(result.remaining.water).toBe(0)
    expect(result.next.water).toBe(1500)
  })

  it('keeps water in the cargo for an outpost, which stores none (slice 035)', () => {
    const result = ResourcesService.depositUpToCapacity({
      state: {
        plastic: 0,
        mushroom: 0,
        plasma: 0,
        water: 0,
        last_plastic_gather: 0,
        last_mushroom_gather: 0,
        last_plasma_gather: 0,
        last_water_gather: 0,
      },
      resource: {
        plastic: 100,
        mushroom: 0,
        plasma: 0,
        water: 40,
      },
      warehouses_capacity: {
        plastic: 2000,
        mushroom: 1500,
        water: 0,
      },
    })

    expect(result.deposited).toEqual({
      plastic: 100,
      mushroom: 0,
      plasma: 0,
      water: 0,
    })
    expect(result.remaining.water).toBe(40)
    expect(result.next.water).toBe(0)
  })
})
