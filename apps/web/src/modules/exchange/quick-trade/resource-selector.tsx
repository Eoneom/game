import React from 'react'
import { ExchangeResource, type ExchangeSummaryPair } from '@eoneom/api-client'

import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlasma } from '#ui/icon/plasma'
import { IconPlastic } from '#ui/icon/plastic'
import { ExchangeResourceLabels } from '#exchange/translations'
import { segmentClass } from '#exchange/styles'

const ResourceIcons: Record<ExchangeResource, React.ReactNode> = {
  [ExchangeResource.PLASTIC]: <IconPlastic />,
  [ExchangeResource.MUSHROOM]: <IconMushroom />,
  [ExchangeResource.PLASMA]: <IconPlasma />,
}

/** « 12 | 14 »: best bid | best ask, « — » for an empty side. */
const formatBidAsk = (pair: ExchangeSummaryPair | undefined): string =>
  `${pair?.best_bid?.price ?? '—'} | ${pair?.best_ask?.price ?? '—'}`

/** Three pairs with the best bid | ask of other players under each (slice 046). */
export const ResourceSelector: React.FC<{
  resource: ExchangeResource
  pairs: ExchangeSummaryPair[] | undefined
  onChange: (resource: ExchangeResource) => void
}> = ({ resource, pairs, onChange }) => (
  <div role="radiogroup" aria-label="Ressource" className="grid grid-cols-3 gap-2">
    {Object.values(ExchangeResource).map(value => (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={value === resource}
        className={`${segmentClass(value === resource)} text-left`}
        onClick={() => onChange(value)}
      >
        <span className="flex items-center gap-2 text-body">
          {ResourceIcons[value]}
          {ExchangeResourceLabels[value]}
        </span>
        <span className="block font-mono text-meta tabular-nums text-label" title="Meilleur achat | meilleure vente">
          {formatBidAsk(pairs?.find(pair => pair.resource === value))}
        </span>
      </button>
    ))}
  </div>
)
