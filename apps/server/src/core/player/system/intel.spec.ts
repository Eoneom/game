import assert from 'assert'
import {
  isEmpireUnderThreat,
  minDistanceToOwned,
} from './intel'

describe('system empire intel', () => {
  it('detects threat within max distance', () => {
    assert.strictEqual(isEmpireUnderThreat({
      nearest_threat_distance: 4,
      visible_enemy_combat_stacks: 3,
      opponent_settlement_count: 1,
      settlements: [],
      threats: [],
    }), true)
    assert.strictEqual(isEmpireUnderThreat({
      nearest_threat_distance: 12,
      visible_enemy_combat_stacks: 0,
      opponent_settlement_count: 0,
      settlements: [],
      threats: [],
    }), false)
  })

  it('computes min distance to owned coordinates', () => {
    assert.strictEqual(minDistanceToOwned({
      point: {
        x: 5,
        y: 5,
      },
      owned_coordinates: [
        {
          x: 3,
          y: 5,
        },
      ],
    }), 2)
  })
})
