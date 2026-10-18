import assert from 'assert'
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
