import {
  OUTPOST_COUNT_LIMIT,
  OUTPOST_EXPANSION_PER_LEVEL,
} from '#core/outpost/constant/limit'
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
    it('returns base limit at expansion level 0', () => {
      expect(OutpostService.getCountLimit({ expansion_level: 0 })).toBe(OUTPOST_COUNT_LIMIT)
    })

    it('adds five outposts per expansion level', () => {
      expect(OutpostService.getCountLimit({ expansion_level: 1 })).toBe(
        OUTPOST_COUNT_LIMIT + OUTPOST_EXPANSION_PER_LEVEL,
      )
      expect(OutpostService.getCountLimit({ expansion_level: 2 })).toBe(
        OUTPOST_COUNT_LIMIT + 2 * OUTPOST_EXPANSION_PER_LEVEL,
      )
    })
  })

  describe('isLimitReached', () => {
    it('respects expansion level', () => {
      expect(OutpostService.isLimitReached({
        existing_outposts_count: 14,
        expansion_level: 0,
      })).toBe(false)
      expect(OutpostService.isLimitReached({
        existing_outposts_count: 15,
        expansion_level: 0,
      })).toBe(true)
      expect(OutpostService.isLimitReached({
        existing_outposts_count: 19,
        expansion_level: 1,
      })).toBe(false)
      expect(OutpostService.isLimitReached({
        existing_outposts_count: 20,
        expansion_level: 1,
      })).toBe(true)
    })
  })
})
