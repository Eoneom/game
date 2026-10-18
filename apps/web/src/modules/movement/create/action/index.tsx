import { MovementAction } from '@eoneom/api-client'
import React from 'react'
import classNames from 'classnames'

import { MovementActionLabels } from '#movement/translations'

interface Props {
  action: MovementAction
  onChange: (action: MovementAction) => void
  /** When set, only these actions are shown (e.g. map panel: base/transport/attack). */
  allowedActions?: MovementAction[]
}

export const MovementCreateAction: React.FC<Props> = ({ action, onChange, allowedActions }) => {
  const choices = (allowedActions ?? Object.values(MovementAction)).slice().sort((a, b) => a.localeCompare(b))

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 px-0 field-label">Ordre</legend>
      <div
        className={`grid gap-2 ${choices.length <= 2 ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}
        role="radiogroup"
        aria-label="Type de déplacement"
      >
        {choices.map(movementAction => {
            const id = `movement-action-${movementAction}`
            const selected = action === movementAction
            return (
              <label
                key={movementAction}
                className={classNames(
                  'flex cursor-pointer items-center justify-center rounded-sm border px-3 py-3 text-center text-sm uppercase tracking-wide transition',
                  selected
                    ? 'border-amber bg-chrome text-amber'
                    : 'border-rust/50 bg-chrome/40 text-amber-dim hover:border-rust hover:text-amber'
                )}
                htmlFor={id}
              >
                <input
                  id={id}
                  type="radio"
                  name="action"
                  value={movementAction}
                  checked={selected}
                  className="sr-only"
                  onChange={event => onChange(event.target.value as MovementAction)}
                />
                <span>{MovementActionLabels[movementAction]}</span>
              </label>
            )
          })}
      </div>
    </fieldset>
  )
}
