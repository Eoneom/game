import React from 'react'
import { render, screen, within } from '@testing-library/react'

import { transformDecimals } from '#helpers/transform'
import { getEnergyDisplayStatus } from '#helpers/energy'

import { HeaderResourcesItem } from './index'

describe('HeaderResourcesItem', () => {
  const baseProps = {
    earnings_per_second: 1,
    warehouse_full_in_seconds: 0,
    icon: <span aria-hidden>icon</span>,
  }

  it('does not render a progress bar when warehouse_capacity is omitted', () => {
    render(
      <ul>
        <HeaderResourcesItem
          value={50}
          icon={<span aria-hidden>icon</span>}
        />
      </ul>,
    )
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('sets progress max to warehouse_capacity', () => {
    render(
      <ul>
        <HeaderResourcesItem
          {...baseProps}
          value={50}
          warehouse_capacity={200}
        />
      </ul>,
    )
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('max', '200')
    expect(progress).toHaveAttribute('value', '50')
  })

  it('does not add warn class on progress when value is below 70% of capacity', () => {
    render(
      <ul>
        <HeaderResourcesItem
          {...baseProps}
          value={50}
          warehouse_capacity={100}
        />
      </ul>,
    )
    const progress = screen.getByRole('progressbar')
    expect(progress.className).not.toContain('warn')
  })

  it('adds warn class on progress when value is at or above 70% of capacity', () => {
    render(
      <ul>
        <HeaderResourcesItem
          {...baseProps}
          value={70}
          warehouse_capacity={100}
        />
      </ul>,
    )
    expect(screen.getByRole('progressbar').className).toContain('warn')
  })

  it('adds danger class on resource item when value is at or above capacity', () => {
    const { container } = render(
      <ul>
        <HeaderResourcesItem
          {...baseProps}
          value={100}
          warehouse_capacity={100}
        />
      </ul>,
    )
    const item = container.querySelector('.resource-item.danger')
    expect(item).toBeInTheDocument()
  })

  it('does not add danger class when below capacity', () => {
    const { container } = render(
      <ul>
        <HeaderResourcesItem
          {...baseProps}
          value={50}
          warehouse_capacity={100}
        />
      </ul>,
    )
    expect(container.querySelector('.resource-item.danger')).not.toBeInTheDocument()
  })

  it('displays transformDecimals output for non-zero value', () => {
    render(
      <ul>
        <HeaderResourcesItem
          {...baseProps}
          value={4242}
          warehouse_capacity={10000}
        />
      </ul>,
    )
    const li = screen.getByRole('listitem')
    expect(within(li).getByText(transformDecimals(4242))).toBeInTheDocument()
  })

  it('shows success styling when energy consumption is comfortably below production', () => {
    const { container } = render(
      <ul>
        <HeaderResourcesItem
          value={5}
          secondary_value={10}
          energy_production={10}
          icon={<span aria-hidden>icon</span>}
        />
      </ul>,
    )

    const item = container.querySelector('.resource-item')
    expect(item?.className).toContain('text-terminal')
  })

  it('shows amber when energy consumption is close to production', () => {
    const { container } = render(
      <ul>
        <HeaderResourcesItem
          value={8}
          secondary_value={10}
          energy_production={10}
          icon={<span aria-hidden>icon</span>}
        />
      </ul>,
    )

    const item = container.querySelector('.resource-item')
    expect(item).toBeInTheDocument()
    expect(item?.className).toContain('text-amber')
    expect(item?.className).not.toContain('text-terminal')
    expect(item?.className).not.toContain('text-danger')
  })

  it('shows danger styling when energy consumption exceeds production', () => {
    const { container } = render(
      <ul>
        <HeaderResourcesItem
          value={11}
          secondary_value={10}
          energy_production={10}
          icon={<span aria-hidden>icon</span>}
        />
      </ul>,
    )

    const item = container.querySelector('.resource-item')
    expect(item?.className).toContain('text-danger')
  })

  it('renders energy usage progress bar', () => {
    render(
      <ul>
        <HeaderResourcesItem
          value={8}
          secondary_value={10}
          energy_production={10}
          icon={<span aria-hidden>icon</span>}
        />
      </ul>,
    )

    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('value', '80')
    expect(progress).toHaveAttribute('max', '100')
  })
})

describe('getEnergyDisplayStatus', () => {
  it('returns success when consumption is below warn threshold', () => {
    expect(getEnergyDisplayStatus(5, 10)).toBe('success')
  })

  it('returns warn when consumption is at or above 70% of production', () => {
    expect(getEnergyDisplayStatus(7, 10)).toBe('warn')
    expect(getEnergyDisplayStatus(10, 10)).toBe('warn')
  })

  it('returns danger when consumption exceeds production', () => {
    expect(getEnergyDisplayStatus(11, 10)).toBe('danger')
  })
})
