import React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { getEnergyDisplayStatus } from '#helpers/energy'

import { HeaderResourceChip } from './index'

const icon = <span aria-hidden>icon</span>

const valueOf = (container: HTMLElement) => container.querySelector('.header-resource-chip [aria-hidden="true"].font-mono')

describe('HeaderResourceChip', () => {
  it('shows the compact stock with the exact value in the title and for screen readers', () => {
    const { container } = render(<HeaderResourceChip kind="stock" name="Plastique" icon={icon} value={12480} capacity={100000} />)

    expect(valueOf(container)).toHaveTextContent('12.48k')
    const chip = container.querySelector('.header-resource-chip')
    expect(chip?.getAttribute('title')).toBe(`Plastique ${(12480).toLocaleString('fr-FR')}`)
    expect(chip?.textContent).toContain('Plastique')
  })

  it('shows « 0 » for an empty stock', () => {
    const { container } = render(<HeaderResourceChip kind="stock" name="Plasma" icon={icon} value={0} />)

    expect(valueOf(container)).toHaveTextContent(/^0$/)
  })

  it('shows no warning below 90 % of the warehouse', () => {
    const { container } = render(<HeaderResourceChip kind="stock" name="Plastique" icon={icon} value={89} capacity={100} />)

    expect(container.querySelector('[data-warning]')).toBeNull()
    expect(valueOf(container)?.className).toContain('text-amber')
  })

  it('shows a danger dot from 90 % of the warehouse', () => {
    const { container } = render(<HeaderResourceChip kind="stock" name="Plastique" icon={icon} value={90} capacity={100} />)

    const dot = container.querySelector('[data-warning]')
    expect(dot).toHaveAttribute('data-warning', 'near')
    expect(dot?.className).toContain('bg-danger')
    expect(valueOf(container)?.className).not.toContain('text-danger')
  })

  it('turns the value danger when the warehouse is full', () => {
    const { container } = render(<HeaderResourceChip kind="stock" name="Champignon" icon={icon} value={100} capacity={100} />)

    expect(container.querySelector('[data-warning]')).toHaveAttribute('data-warning', 'full')
    expect(valueOf(container)?.className).toContain('text-danger')
  })

  it('shows energy as consumption / production with its status colour', () => {
    const { container, rerender } = render(<HeaderResourceChip kind="energy" name="Énergie" icon={icon} consumption={5} production={10} />)
    expect(valueOf(container)).toHaveTextContent('5 / 10')
    expect(valueOf(container)?.className).toContain('text-terminal')

    rerender(<HeaderResourceChip kind="energy" name="Énergie" icon={icon} consumption={8} production={10} />)
    expect(valueOf(container)?.className).toContain('text-amber')

    rerender(<HeaderResourceChip kind="energy" name="Énergie" icon={icon} consumption={11} production={10} />)
    expect(valueOf(container)?.className).toContain('text-danger')
  })

  it('never renders a progress bar', () => {
    const { container } = render(<HeaderResourceChip kind="stock" name="Plastique" icon={icon} value={50} capacity={100} />)

    expect(container.querySelector('[role="progressbar"], progress')).toBeNull()
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
