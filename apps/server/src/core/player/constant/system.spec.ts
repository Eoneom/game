import assert from 'assert'
import {
  SYSTEM_CITY_NAME_PREFIX,
  SYSTEM_FIRST_CITY_NAME,
  SYSTEM_PLAYER_FACTION_CODE,
  SYSTEM_PLAYER_NAME,
  nextSystemCityName,
  systemCityName,
  toRoman
} from '#core/player/constant/system'
import { FactionCode } from '#core/faction/constant/code'

describe('system player constants', () => {
  it('names the first commander and city', () => {
    assert.strictEqual(SYSTEM_PLAYER_NAME, 'Alpha')
    assert.strictEqual(SYSTEM_FIRST_CITY_NAME, 'Core I')
    assert.strictEqual(SYSTEM_CITY_NAME_PREFIX, 'Core')
    assert.strictEqual(SYSTEM_PLAYER_FACTION_CODE, FactionCode.THE_TECHNOLOGICAL_SINGULARITY)
  })

  it('converts indexes to roman city names', () => {
    assert.strictEqual(toRoman(1), 'I')
    assert.strictEqual(toRoman(2), 'II')
    assert.strictEqual(toRoman(3), 'III')
    assert.strictEqual(toRoman(4), 'IV')
    assert.strictEqual(systemCityName(2), 'Core II')
    assert.strictEqual(systemCityName(3), 'Core III')
  })

  it('picks the next unused Core roman name', () => {
    assert.strictEqual(nextSystemCityName([ 'Core I' ]), 'Core II')
    assert.strictEqual(nextSystemCityName([
      'Core I',
      'Core II' 
    ]), 'Core III')
    assert.strictEqual(nextSystemCityName([ 'Core II' ]), 'Core I')
  })
})
