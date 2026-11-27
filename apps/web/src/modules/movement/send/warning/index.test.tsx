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

  it('shows the movement limit warning when every slot is used', () => {
    render(
      <MovementCreateWarning
        isTemporaryOutpost={false}
        troops={troops}
        selectedTroops={{}}
        movementLimitReached
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Limite de mouvements simultanés atteinte : attendez le retour d\'un mouvement ou améliorez un centre de commandement.'
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

  it.each([
    [ { outpostLimitReached: true }, 'Limite d\'avant-postes atteinte : vos troupes reviendront à leur point de départ.' ],
    [ { spy: true }, 'En cas d\'échec, tous les éclaireurs envoyés sont détruits et la cible est prévenue.' ],
    [ { waterToOutpost: true }, 'L\'eau ne peut pas être stockée dans un avant-poste : elle reviendra avec les transporteurs.' ],
  ])('shows the summary warning %o (slice 045)', (props, text) => {
    render(<MovementCreateWarning isTemporaryOutpost={false} troops={troops} selectedTroops={{}} {...props} />)

    expect(screen.getByRole('status')).toHaveTextContent(text)
    expect(screen.getByRole('status')).not.toHaveAttribute('data-blocking')
  })

  it('marks only the movement cap as blocking (slice 045)', () => {
    render(<MovementCreateWarning isTemporaryOutpost={false} troops={troops} selectedTroops={{}} movementLimitReached spy />)

    const [ cap, spy ] = screen.getAllByRole('status')
    expect(cap).toHaveAttribute('data-blocking', 'true')
    expect(spy).not.toHaveAttribute('data-blocking')
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
