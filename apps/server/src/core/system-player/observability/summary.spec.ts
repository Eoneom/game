import assert from 'assert'
import {
  formatSystemPlayerActionSummary,
  formatSystemPlayerIdleSummary,
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
