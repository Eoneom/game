import React from 'react'
import classNames from 'classnames'

import { formatCompactDuration } from '#helpers/transform'
import { CatalogueCardState, CatalogueKind } from '#ui/catalogue/state'

type CatalogueBadgeTone = 'amber' | 'amber_outline' | 'red_outline' | 'grey' | 'red' | 'green'

interface CatalogueBadgeCopy {
  text: string
  /** Secondary part after « · » (time left, affordability). */
  detail?: string
  tone: CatalogueBadgeTone
}

const available_label: Record<CatalogueKind, string> = {
  building: 'Améliorable',
  technology: 'Recherchable',
  troop: 'Recrutable',
  defense: 'Constructible',
}

const plural = (count: number, word: string): string => `${count} ${word}${count > 1 ? 's' : ''}`

/** French copy and tone of a card state (slice 043); `null` for read-only cards. */
export const catalogueBadge = (state: CatalogueCardState): CatalogueBadgeCopy | null => {
  switch (state.kind) {
    case 'in_progress':
      return {
        text: 'En cours',
        detail: state.remaining_units !== undefined
          ? plural(state.remaining_units, 'restant')
          : state.remaining_seconds !== undefined
            ? formatCompactDuration(state.remaining_seconds)
            : undefined,
        tone: 'amber',
      }
    case 'queued':
      return {
        text: [
          'En file',
          state.count > 1 ? `×${state.count}` : null,
          state.target_level !== undefined ? `→ niv. ${state.target_level}` : null,
        ].filter(Boolean).join(' '),
        tone: 'amber_outline',
      }
    case 'missing_requirement':
      return {
        text: `Requiert : ${state.first.name} niv. ${state.first.level}${state.more > 0 ? ` +${state.more}` : ''}`,
        tone: 'red_outline',
      }
    case 'capped':
      return {
        text: state.reason === 'building_levels' ? 'Plafond de niveaux atteint' : 'Capacité de défense pleine',
        tone: 'grey',
      }
    case 'queue_full':
      return { text: 'File pleine', tone: 'grey' }
    case 'insufficient_resources':
      return {
        text: 'Ressources insuffisantes',
        detail: state.warehouse_too_small
          ? 'Entrepôt trop petit'
          : state.affordable_in_seconds !== undefined
            ? `dans ${formatCompactDuration(state.affordable_in_seconds)}`
            : undefined,
        tone: 'red',
      }
    case 'available':
      return { text: available_label[state.catalogue], tone: 'green' }
    case 'none':
      return null
  }
}

const tone_class: Record<CatalogueBadgeTone, string> = {
  amber: 'border-amber/60 bg-amber/15 text-amber',
  amber_outline: 'border-amber/60 text-amber',
  red_outline: 'border-danger/60 text-danger',
  grey: 'border-edge text-label',
  red: 'border-danger/60 bg-danger-deep/40 text-danger',
  green: 'border-terminal/50 bg-terminal/10 text-terminal',
}

interface Props {
  state: CatalogueCardState
  id?: string
}

export const CatalogueBadge: React.FC<Props> = ({ state, id }) => {
  const copy = catalogueBadge(state)
  if (!copy) {
    return null
  }

  return (
    <span
      id={id}
      data-tone={copy.tone}
      className={classNames(
        'catalogue-badge inline-block max-w-full self-start rounded-sm border px-1.5 py-0.5 text-caption leading-snug',
        tone_class[copy.tone]
      )}
    >
      {copy.text}
      {copy.detail ? <> · {copy.detail}</> : null}
    </span>
  )
}
