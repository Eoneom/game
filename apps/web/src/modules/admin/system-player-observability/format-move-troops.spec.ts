import { TroopCode } from '@eoneom/api-client'

import {
  formatMoveTroops,
  formatTransportResources,
} from './format-move-troops'

describe('formatMoveTroops', () => {
  it('formats troop stacks with French names', () => {
    const line = formatMoveTroops([
      { code: TroopCode.EXPLORER, count: 1 },
      { code: TroopCode.SETTLER, count: 2 },
    ])

    expect(line).toBe('Explorateur ×1, Colon ×2')
  })

  it('ignores invalid or zero-count entries', () => {
    expect(formatMoveTroops([])).toBeNull()
    expect(formatMoveTroops([{ code: TroopCode.EXPLORER, count: 0 }])).toBeNull()
    expect(formatMoveTroops(null)).toBeNull()
  })
})

describe('formatTransportResources', () => {
  it('lists positive resource amounts with French labels', () => {
    const line = formatTransportResources({
      plastic: 100,
      mushroom: 0,
      plasma: 5,
    })

    expect(line).toBe('Plastique 100, Plasma 5')
  })
})
