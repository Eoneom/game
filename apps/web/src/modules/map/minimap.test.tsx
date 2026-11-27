import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { MapMinimap } from '#map/minimap'
import { mapWindow } from '#map/viewport'

afterEach(cleanup)

describe('MapMinimap (slice 044)', () => {
  const view = mapWindow({ center: { x: 20, y: 80 }, zoom: 3, stage: { width: 1480, height: 860 } })

  const renderMinimap = (onRecenter = vi.fn()) => {
    render(
      <MapMinimap view={view} terrain={undefined} explored={undefined} own={[]} allied={[]} threatened={[]} onRecenter={onRecenter} />
    )
    return onRecenter
  }

  it('frames the visible window at 2 px per cell, north up', () => {
    renderMinimap()
    const frame = screen.getByTestId('minimap-viewport')
    expect(parseFloat(frame.style.left)).toBeCloseTo((view.left - 0.5) * 2)
    expect(parseFloat(frame.style.top)).toBeCloseTo((100.5 - view.top) * 2)
    expect(parseFloat(frame.style.width)).toBeCloseTo(view.widthCells * 2)
    expect(parseFloat(frame.style.height)).toBeCloseTo(15 * 2)
  })

  it('recentres the map where it is clicked', () => {
    const onRecenter = renderMinimap()
    const surface = screen.getByRole('img', { name: /Minicarte/ })
    surface.getBoundingClientRect = () => ({ left: 10, top: 20, width: 200, height: 200, right: 210, bottom: 220, x: 10, y: 20, toJSON: () => ({}) })

    fireEvent.pointerDown(surface, { clientX: 10 + 120, clientY: 20 + 40, pointerId: 1 })

    expect(onRecenter).toHaveBeenCalledWith({ x: 60.5, y: 80.5 })
  })

  it('can be hidden and shown again', () => {
    renderMinimap()
    fireEvent.click(screen.getByRole('button', { name: 'Masquer la minicarte' }))
    expect(screen.queryByTestId('minimap-viewport')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Afficher la minicarte' }))
    expect(screen.getByTestId('minimap-viewport')).toBeInTheDocument()
  })
})
