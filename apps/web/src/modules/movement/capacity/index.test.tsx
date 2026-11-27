import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MovementCapacityReadout } from './index'

describe('MovementCapacityReadout', () => {
  it('shows movements used against the limit', () => {
    render(<MovementCapacityReadout used={3} limit={7} />)

    expect(screen.getByText(/Mouvements/)).toHaveTextContent('Mouvements 3 / 7')
  })

  it('highlights a full movement cap', () => {
    render(<MovementCapacityReadout used={5} limit={5} />)

    expect(screen.getByText(/Mouvements/)).toHaveClass('text-danger')
  })
})
