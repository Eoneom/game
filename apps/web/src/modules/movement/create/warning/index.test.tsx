import { render, screen } from '@testing-library/react'
import { TroopCode } from '@eoneom/api-client'
import { describe, expect, it } from 'vitest'

import { MovementCreateWarning } from './index'

describe('MovementCreateWarning', () => {
  const troops = [
    {
      code: TroopCode.EXPLORER,
      count: 2,
    },
  ]

  it('shows destination capacity warning when exceeded', () => {
    render(
      <MovementCreateWarning
        isTemporaryOutpost={false}
        troops={troops}
        selectedTroops={{}}
        destinationCapacityExceeded
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Attention : les ressources dépassent la capacité de stockage de la destination. L\'excédent sera renvoyé.'
    )
  })

  it('shows temporary outpost warning when all troops are taken', () => {
    render(
      <MovementCreateWarning
        isTemporaryOutpost
        troops={troops}
        selectedTroops={{ [TroopCode.EXPLORER]: 2 }}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Attention : ce déplacement va supprimer l\'avant-poste temporaire.'
    )
  })

  it('renders nothing when there is no warning', () => {
    const { container } = render(
      <MovementCreateWarning
        isTemporaryOutpost={false}
        troops={troops}
        selectedTroops={{}}
        destinationCapacityExceeded={false}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
