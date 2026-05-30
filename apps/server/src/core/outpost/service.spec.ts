import { OutpostService } from '#core/outpost/service'

describe('OutpostService', () => {
  describe('getWarehousesCapacity', () => {
    it('returns base capacity at logistics level 0', () => {
      expect(OutpostService.getWarehousesCapacity({ logistics_level: 0 })).toEqual({
        plastic: 2000,
        mushroom: 1500
      })
    })

    it('scales by 1.4 at logistics level 1', () => {
      expect(OutpostService.getWarehousesCapacity({ logistics_level: 1 })).toEqual({
        plastic: 2000 * 1.4,
        mushroom: 1500 * 1.4
      })
    })

    it('scales by 1.4^2 at logistics level 2', () => {
      expect(OutpostService.getWarehousesCapacity({ logistics_level: 2 })).toEqual({
        plastic: 2000 * Math.pow(1.4, 2),
        mushroom: 1500 * Math.pow(1.4, 2)
      })
    })
  })

  describe('getCountLimit', () => {
    it('returns the outpost count limit', () => {
      expect(OutpostService.getCountLimit()).toBeGreaterThan(0)
    })
  })
})
