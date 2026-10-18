import assert from 'assert'
import {
  appendFailedAttackTarget,
  appendFailedBaseCell,
  isCoordinatesBlocked,
} from './memory'

describe('system player memory', () => {
  it('blocks coordinates present in memory', () => {
    assert.strictEqual(isCoordinatesBlocked({
      x: 2,
      y: 3,
    }, [
      {
        x: 2,
        y: 3,
      },
    ]), true)
    assert.strictEqual(isCoordinatesBlocked({
      x: 1,
      y: 1,
    }, []), false)
  })

  it('appends failed base and attack targets with dedupe', () => {
    const with_base = appendFailedBaseCell({
      failed_base_cells: [],
      failed_attack_targets: [],
    }, {
      x: 4,
      y: 4,
    })
    assert.strictEqual(with_base.failed_base_cells.length, 1)
    const with_attack = appendFailedAttackTarget(with_base, {
      x: 9,
      y: 9,
    })
    assert.strictEqual(with_attack.failed_attack_targets[0].x, 9)
  })
})
