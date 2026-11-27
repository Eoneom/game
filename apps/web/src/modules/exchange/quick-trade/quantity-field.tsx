import React, { useId } from 'react'
import { exchange_lot_size, type ExchangeResource } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { formatResourceAmount } from '#exchange/translations'
import { stepperClass } from '#exchange/styles'
import { parsePositiveInteger } from '#exchange/quick-trade/validation'

/** Lots with − / + steppers, « Max » and the resource equivalent (« = 300 plastique »), slice 046. */
export const QuantityField: React.FC<{
  resource: ExchangeResource
  value: string
  onChange: (value: string) => void
  /** `null` disables « Max ». */
  max: number | null
}> = ({ resource, value, onChange, max }) => {
  const id = useId()
  const lots = parsePositiveInteger(value)
  const step = (delta: number) => onChange(String(Math.max(1, (lots ?? 0) + delta)))

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="field-label">Quantité</label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={stepperClass} aria-label="Retirer un lot" disabled={lots === null || lots <= 1} onClick={() => step(-1)}>−</button>
        <div className="w-28">
          <input
            id={id}
            className="field-input field-input--number"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={event => onChange(event.target.value)}
          />
        </div>
        <button type="button" className={stepperClass} aria-label="Ajouter un lot" onClick={() => step(1)}>+</button>
        <span className="text-meta text-label">lots</span>
        <span className="font-mono text-body tabular-nums text-amber-dim" data-testid="quick-trade-equivalent">
          = {formatResourceAmount(resource, (lots ?? 0) * exchange_lot_size[resource])}
        </span>
        <Button variant="ghost" disabled={max === null} onClick={() => max !== null && onChange(String(Math.max(1, max)))}>
          Max
        </Button>
      </div>
    </div>
  )
}
