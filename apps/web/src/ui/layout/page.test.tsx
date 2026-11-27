import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LayoutPage } from '#ui/layout/page'

describe('LayoutPage (043)', () => {
  it('uses a fixed 28rem details column on xl and stacks below', () => {
    const { container } = render(<LayoutPage details={<p>Détails</p>}><p>Grille</p></LayoutPage>)
    const grid = container.firstElementChild
    expect(grid).toHaveClass('grid-cols-1', 'xl:grid-cols-[minmax(0,1fr)_28rem]', 'xl:grid-rows-1')
    expect(grid?.className).not.toMatch(/lg:grid-cols/)
    expect(screen.getByText('Détails').closest('aside')).toBeInTheDocument()
  })

  it('renders the list alone without details', () => {
    const { container } = render(<LayoutPage><p>Grille</p></LayoutPage>)
    expect(container.firstElementChild).toHaveClass('flex', 'flex-col')
    expect(container.querySelector('aside')).toBeNull()
  })
})
