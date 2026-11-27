import React, { useState } from 'react'
import { ExchangeResource, ExchangeSide } from '@eoneom/api-client'

import { QUICK_TRADE_ID, QuickTrade } from '#exchange/quick-trade'
import { ExchangeMyOrders } from '#exchange/my-orders'
import { ExchangeMarket } from '#exchange/market'

export interface ExchangePageSearch {
  resource?: ExchangeResource
  side?: ExchangeSide
}

/**
 * Bourse de faction (slices 035, 046): « Échange rapide » first, « Mes ordres » second, the « Marché » last and
 * folded. Resource and side live in the URL; quantity and price are local state.
 */
export const ExchangePage: React.FC<{
  search: ExchangePageSearch
  onNavigate: (search: ExchangePageSearch) => void
}> = ({ search, onNavigate }) => {
  const resource = search.resource ?? ExchangeResource.PLASTIC
  const side = search.side ?? ExchangeSide.SELL
  const [ priceText, setPriceText ] = useState('')

  return (
    <div className="space-y-4">
      <h1 className="m-0 text-page text-amber">Bourse de faction</h1>
      <QuickTrade
        resource={resource}
        side={side}
        onResourceChange={next => onNavigate({ resource: next, side })}
        onSideChange={next => onNavigate({ resource, side: next })}
        priceText={priceText}
        onPriceTextChange={setPriceText}
      />
      <ExchangeMyOrders resource={resource} />
      <ExchangeMarket
        resource={resource}
        onPick={(nextSide, price) => {
          onNavigate({ resource, side: nextSide })
          setPriceText(String(price))
          document.getElementById(QUICK_TRADE_ID)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
        }}
      />
    </div>
  )
}
