import { CombatStrategy } from '@eoneom/api-client'
import React from 'react'
import classNames from 'classnames'

import { CombatStrategyLabels } from '#movement/translations'

interface Props {
  strategy: CombatStrategy
  onChange: (strategy: CombatStrategy) => void
  /** Radio group name; must be unique on the page. */
  name?: string
  legend?: string
  disabled?: boolean
}

export const MovementCreateCombatStrategy: React.FC<Props> = ({
  strategy,
  onChange,
  name = 'combat_strategy',
  legend = 'Stratégie de combat',
  disabled = false,
}) => {
  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 px-0 field-label">{legend}</legend>
      <div className="grid gap-2" role="radiogroup" aria-label={legend}>
        {Object.values(CombatStrategy).map(value => {
          const id = `${name}-${value}`
          const selected = strategy === value
          return (
            <label
              key={value}
              className={classNames(
                'flex cursor-pointer items-center rounded-sm border px-3 py-2 text-sm transition',
                selected
                  ? 'border-amber bg-chrome text-amber'
                  : 'border-rust/50 bg-chrome/40 text-amber-dim hover:border-rust hover:text-amber'
              )}
              htmlFor={id}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={value}
                checked={selected}
                className="mr-2"
                onChange={() => onChange(value)}
              />
              {CombatStrategyLabels[value]}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
