import React from 'react'
import { ExchangeSide } from '@eoneom/api-client'

import { ExchangeSideActionLabels } from '#exchange/translations'
import { segmentClass } from '#exchange/styles'

/** « Vendre | Acheter » (slice 046): selling in `danger`, buying in `terminal`. */
export const SideToggle: React.FC<{
  side: ExchangeSide
  onChange: (side: ExchangeSide) => void
}> = ({ side, onChange }) => (
  <div role="radiogroup" aria-label="Sens" className="grid grid-cols-2 gap-2">
    {[ ExchangeSide.SELL, ExchangeSide.BUY ].map(value => (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={value === side}
        className={`${segmentClass(value === side, value)} text-center text-meta font-semibold uppercase tracking-wide`}
        onClick={() => onChange(value)}
      >
        {ExchangeSideActionLabels[value]}
      </button>
    ))}
  </div>
)
