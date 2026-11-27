import React, { useId, useState } from 'react'
import type { ExchangeResource, ExchangeSide } from '@eoneom/api-client'

import { panelClass } from '#exchange/styles'
import { ExchangeResourceLabels, formatLotSize } from '#exchange/translations'
import { ExchangeBook } from '#exchange/market/book'
import { ExchangePriceLine, ExchangeTrades } from '#exchange/market/trades'
import { ExchangeHelp } from '#exchange/market/help'

const MARKET_OPEN_STORAGE_KEY = 'eoneom:exchange:market-open'

/** Open state of « Marché » in this browser; closed when storage is unavailable or holds something else. */
const readMarketOpen = (): boolean => {
  try {
    return window.localStorage.getItem(MARKET_OPEN_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const writeMarketOpen = (open: boolean): void => {
  try {
    window.localStorage.setItem(MARKET_OPEN_STORAGE_KEY, String(open))
  } catch {
    // Private mode or blocked storage: the section just opens closed next time.
  }
}

/**
 * « Marché » (slice 046): collapsed by default, open state remembered per browser. Depth (clickable levels), last
 * trades, price line and the rules, for the selected resource. Its queries only run while it is open.
 */
export const ExchangeMarket: React.FC<{
  resource: ExchangeResource
  onPick: (side: ExchangeSide, price: number) => void
}> = ({ resource, onPick }) => {
  const [ open, setOpen ] = useState(readMarketOpen)
  const panelId = useId()

  const toggle = () => {
    setOpen(!open)
    writeMarketOpen(!open)
  }

  return (
    <section className={panelClass} aria-label="Marché">
      <h2 className="m-0 text-heading">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left text-amber hover:text-ink"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          <span aria-hidden className="w-4">{open ? '▾' : '▸'}</span>
          Marché — {ExchangeResourceLabels[resource]} / eau pure
        </button>
      </h2>
      {open && (
        <div id={panelId} className="mt-4 space-y-6">
          <p className="m-0 text-meta text-label">{formatLotSize(resource)}</p>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ExchangeBook resource={resource} onPick={onPick} />
            <div className="min-w-0 space-y-6">
              <ExchangePriceLine resource={resource} />
              <ExchangeTrades resource={resource} />
            </div>
          </div>
          <ExchangeHelp />
        </div>
      )}
    </section>
  )
}
