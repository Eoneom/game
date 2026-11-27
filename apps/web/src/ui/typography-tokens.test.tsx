import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'
import { CountdownProgress } from './countdown-progress'
import { CatalogueCard } from './catalogue/card'
import { QueuePanel } from './queue-panel'

/** Slice 040: shared components carry the semantic type tokens. */
describe('typography tokens on shared components (040)', () => {
  it('Button uses text-meta semibold uppercase', () => {
    render(<Button>Construire</Button>)
    expect(screen.getByRole('button', { name: 'Construire' })).toHaveClass('text-meta', 'font-semibold', 'uppercase')
  })

  it('QueuePanel collapses to one text-meta line when nothing runs or waits (043)', () => {
    render(<QueuePanel title="Construction" depth="0/3" empty="Aucune construction en cours" />)
    expect(screen.getByText('Aucune construction en cours')).toHaveClass('text-meta')
    expect(screen.getByText('· File 0/3')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Construction' })).not.toBeInTheDocument()
  })

  it('QueuePanel uses text-heading for the title and text-caption for depth and queue label', () => {
    render(<QueuePanel title="Construction" depth="1/3" active={<span>actif</span>} queue={<span>suivant</span>} />)
    expect(screen.getByRole('heading', { name: 'Construction' })).toHaveClass('text-heading')
    expect(screen.getByText('1/3')).toHaveClass('text-caption')
    expect(screen.getByRole('heading', { name: "File d'attente" })).toHaveClass('text-caption', 'uppercase')
  })

  it('CountdownProgress uses text-meta for the summary and text-body for the time', () => {
    render(<CountdownProgress summary="Mine niveau 2" elapsedProgress={0.5} remainingSeconds={65} />)
    expect(screen.getByText('Mine niveau 2')).toHaveClass('text-meta')
    expect(screen.getByText('01:05')).toHaveClass('text-body', 'font-mono')
  })

  it('CatalogueCard uses text-body for the name, text-meta for the level and text-caption for the badge (043)', () => {
    render(
      <CatalogueCard
        code="mine"
        name="Mine"
        image="/mine.png"
        amount={{ kind: 'level', value: 2 }}
        state={{ kind: 'queue_full' }}
        selected={false}
        onSelect={() => undefined}
      />
    )
    expect(screen.getByRole('heading', { name: 'Mine' })).toHaveClass('text-body')
    expect(screen.getByText('Niv. 2')).toHaveClass('text-meta')
    expect(screen.getByText('File pleine')).toHaveClass('text-caption')
  })
})
