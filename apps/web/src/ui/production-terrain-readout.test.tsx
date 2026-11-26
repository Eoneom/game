import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  formatTechnologyBonus,
  ProductionTerrainReadout
} from './production-terrain-readout'

const rates = { plastic: 0.5, mushroom: 0.4 }
const terrain = { plastic: 1.2, mushroom: 0.9 }

describe('ProductionTerrainReadout', () => {
  it('shows the technology bonus column when multipliers are provided', () => {
    render(
      <ProductionTerrainReadout
        current={rates}
        terrain={terrain}
        technology={{ plastic: 1.15, mushroom: 1 }}
      />
    )

    expect(screen.getByText('Techno')).toBeInTheDocument()
    expect(screen.getByText('+15 %')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('hides the technology column without multipliers', () => {
    render(<ProductionTerrainReadout current={rates} terrain={terrain} />)

    expect(screen.queryByText('Techno')).not.toBeInTheDocument()
  })
})

describe('formatTechnologyBonus', () => {
  it('formats a multiplier as a percent bonus', () => {
    expect(formatTechnologyBonus(1.05)).toBe('+5 %')
    expect(formatTechnologyBonus(1.2)).toBe('+20 %')
    expect(formatTechnologyBonus(1)).toBe('—')
  })
})
