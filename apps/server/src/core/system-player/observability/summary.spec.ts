import assert from 'assert'
import { TroopCode } from '@eoneom/api-client'
import {
  formatSystemPlayerActionSummary,
  formatSystemPlayerIdleSummary,
  formatSystemPlayerMultiActionSummary,
} from './summary'

describe('formatSystemPlayerActionSummary', () => {
  it('uses French labels and system Player wording', () => {
    const summary = formatSystemPlayerActionSummary({
      player_name: 'Alpha',
      category: 'upgrade',
      payload: {
        building_code: 'mushroom_farm',
        city_name: 'Core I',
      },
    })

    assert.match(summary, /Joueur système Alpha/)
    assert.match(summary, /Amélioration de bâtiment/)
    assert.match(summary, /mushroom_farm/)
    assert.match(summary, /colonie Core I/)
  })

  it('formats move_troops and coordinates for exploration', () => {
    const summary = formatSystemPlayerActionSummary({
      player_name: 'Alpha',
      category: 'explore',
      payload: {
        move_troops: [{ code: TroopCode.EXPLORER, count: 1 }],
        origin: { x: 1, y: 2 },
        destination: { x: 3, y: 4 },
      },
    })

    assert.match(summary, /Explorateur ×1/)
    assert.match(summary, /\(1,2\) → \(3,4\)/)
  })

  it('formats transport troops and resources', () => {
    const summary = formatSystemPlayerActionSummary({
      player_name: 'Beta',
      category: 'transport',
      payload: {
        move_troops: [{ code: TroopCode.LIGHT_TRANSPORTER, count: 1 }],
        resources: { plastic: 50, mushroom: 10 },
        origin: { x: 0, y: 0 },
        destination: { x: 5, y: 5 },
      },
    })

    assert.match(summary, /Transporteur léger ×1/)
    assert.match(summary, /Plastique 50/)
    assert.match(summary, /Champignon 10/)
  })
})

describe('formatSystemPlayerMultiActionSummary', () => {
  it('lists each committed action on separate lines', () => {
    const summary = formatSystemPlayerMultiActionSummary({
      player_name: 'Alpha',
      committed_actions: [
        {
          category: 'upgrade',
          payload: { building_code: 'mushroom_farm' },
        },
        {
          category: 'research',
          payload: { technology_code: 'architecture' },
        },
      ],
    })

    assert.match(summary, /2 actions/)
    assert.match(summary, /mushroom_farm/)
    assert.match(summary, /architecture/)
  })
})

describe('formatSystemPlayerIdleSummary', () => {
  it('lists tried categories in order', () => {
    const summary = formatSystemPlayerIdleSummary({
      player_name: 'Beta',
      attempts: [
        {
          category: 'upgrade',
          result: 'skipped',
        },
        {
          category: 'research',
          result: 'skipped',
        },
      ],
    })

    assert.match(summary, /Aucune action réussie/)
    assert.match(summary, /Amélioration de bâtiment/)
    assert.match(summary, /Recherche technologique/)
  })
})
