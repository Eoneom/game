import React from 'react'
import classNames from 'classnames'

import { MOVEMENT_TABS, MovementTab, MovementTabLabels } from '#movement/list/sort'

interface Props {
  tab: MovementTab
  counts: Record<MovementTab, number>
  onSelect: (tab: MovementTab) => void
}

export const movementTabPanelId = 'movement-tab-panel'
export const movementTabId = (tab: MovementTab): string => `movement-tab-${tab}`

/** « Sortants (3) » / « Entrants » / « Retours » / « Convois » (slice 045); « Entrants » turns red when attacks come. */
export const MovementTabs: React.FC<Props> = ({ tab, counts, onSelect }) => (
  <div role="tablist" aria-label="Mouvements" className="flex flex-wrap gap-1">
    {MOVEMENT_TABS.map(value => {
      const selected = value === tab
      const alert = value === 'entrants' && counts.entrants > 0
      return (
        <button
          key={value}
          id={movementTabId(value)}
          type="button"
          role="tab"
          aria-selected={selected}
          aria-controls={movementTabPanelId}
          tabIndex={selected ? 0 : -1}
          onClick={() => onSelect(value)}
          onKeyDown={event => {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
            event.preventDefault()
            const index = MOVEMENT_TABS.indexOf(value)
            const next = MOVEMENT_TABS[(index + (event.key === 'ArrowRight' ? 1 : MOVEMENT_TABS.length - 1)) % MOVEMENT_TABS.length]
            onSelect(next)
            document.getElementById(movementTabId(next))?.focus()
          }}
          className={classNames(
            'rounded-sm border px-3 py-1 text-caption uppercase tracking-wider transition',
            selected
              ? 'border-amber/50 bg-chrome text-amber'
              : 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber',
            alert && 'border-danger/70 text-danger'
          )}
        >
          {MovementTabLabels[value]} ({counts[value]})
        </button>
      )
    })}
  </div>
)
