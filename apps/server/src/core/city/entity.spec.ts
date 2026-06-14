import { CityEntity } from '#core/city/entity'
import assert from 'assert'

describe('CityEntity', () => {
  const name = 'City name'
  const player_id = 'fake-player-id'
  let city: CityEntity

  beforeEach(() => {
    city = CityEntity.initCity({
      name,
      player_id,
      cell_id: 'fake-cell-id'
    })
  })

  describe('isOwnedBy', () => {
    it('should return that player owns the city if he is the one who settled it', () => {
      const is_owned_by = city.isOwnedBy(player_id)

      assert.ok(is_owned_by)
    })

    it('should return that player does not own the city if he is not the one who settle it', () => {
      const is_owned_by = city.isOwnedBy('another-random-id')

      assert.ok(!is_owned_by)
    })
  })
})
