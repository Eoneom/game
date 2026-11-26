import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { Cost } from './index'

const city = { plastic: 1000, mushroom: 1000, plasma: 50 }

vi.mock('#city/hooks', () => ({
  useGetCity: () => ({ data: city }),
}))

const plasmaItem = (container: HTMLElement): Element | null =>
  container.querySelector('.game-icon--plasma')?.closest('.resource-item') ?? null

describe('Cost', () => {
  it('hides plasma when the cost is 0', () => {
    const { container } = render(
      <Cost cityId="city-1" plastic={100} mushroom={100} duration={60} />
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(plasmaItem(container)).toBeNull()
  })

  it('shows plasma within stock as affordable', () => {
    const { container } = render(
      <Cost cityId="city-1" plastic={100} mushroom={100} plasma={40} duration={60} />
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    const item = plasmaItem(container)
    expect(item).toHaveTextContent('40')
    expect(item).toHaveClass('text-terminal')
  })

  it('flags plasma as short when above city stock', () => {
    const { container } = render(
      <Cost cityId="city-1" plastic={100} mushroom={100} plasma={60} duration={60} />
    )

    const item = plasmaItem(container)
    expect(item).toHaveTextContent('60')
    expect(item).toHaveClass('text-danger')
  })
})
