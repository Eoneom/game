import { CityService } from '#core/city/service'

describe('CityService', () => {
  describe('getCountLimit', () => {
    it('returns the city count limit', () => {
      expect(CityService.getCountLimit()).toBeGreaterThan(0)
    })
  })
})
