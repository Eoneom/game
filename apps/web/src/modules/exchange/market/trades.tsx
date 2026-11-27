import React, { useState } from 'react'
import type { ExchangeResource, ExchangeTrade } from '@eoneom/api-client'

import { formatDate } from '#helpers/transform'
import { useExchangeTrades } from '#exchange/hooks'
import { headRowClass, rowClass, sectionTitleClass, tableClass, textButtonClass } from '#exchange/styles'
import { formatTradeSpan } from '#exchange/translations'

const WIDTH = 300
const HEIGHT = 60
const VISIBLE_TRADES = 10

/** Simple price line of the trades, oldest to newest. */
export const priceLinePoints = (trades: ExchangeTrade[]): string => {
  const chronological = [ ...trades ].reverse()
  if (chronological.length === 0) return ''
  const prices = chronological.map(trade => trade.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  const step = chronological.length > 1 ? WIDTH / (chronological.length - 1) : 0
  return chronological
    .map((trade, index) => {
      const x = chronological.length > 1 ? index * step : WIDTH / 2
      const y = max === min ? HEIGHT / 2 : HEIGHT - ((trade.price - min) / span) * HEIGHT
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`
    })
    .join(' ')
}

/** « Courbe des prix » (slices 035, 046): the line of the last trades with min / last / max and its time span. */
export const ExchangePriceLine: React.FC<{ resource: ExchangeResource }> = ({ resource }) => {
  const { data: trades = [] } = useExchangeTrades(resource)
  if (trades.length === 0) return null
  const prices = trades.map(trade => trade.price)

  return (
    <section className="space-y-2" aria-label="Courbe des prix">
      <h3 className={sectionTitleClass}>Courbe des prix</h3>
      <figure className="m-0 space-y-1">
        <svg
          viewBox={`-4 -4 ${WIDTH + 8} ${HEIGHT + 8}`}
          className="h-20 w-full text-amber"
          role="img"
          aria-label={`Prix des ${trades.length} derniers échanges, de ${Math.min(...prices)} à ${Math.max(...prices)} eau pure par lot`}
          preserveAspectRatio="none"
        >
          <polyline
            points={priceLinePoints(trades)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="flex justify-between font-mono text-meta tabular-nums text-label">
          <span>Min {Math.min(...prices)}</span>
          <span>Dernier {trades[0].price}</span>
          <span>Max {Math.max(...prices)}</span>
        </div>
        <figcaption className="text-caption text-label">{formatTradeSpan(trades)}</figcaption>
      </figure>
    </section>
  )
}

/** « Derniers échanges » (slices 035, 046): the 10 newest trades, « Voir les 50 » for the whole list. */
export const ExchangeTrades: React.FC<{ resource: ExchangeResource }> = ({ resource }) => {
  const { data: trades = [], isPending } = useExchangeTrades(resource)
  const [ expanded, setExpanded ] = useState(false)
  const visible = expanded ? trades : trades.slice(0, VISIBLE_TRADES)

  return (
    <section className="space-y-2" aria-label="Derniers échanges">
      <h3 className={sectionTitleClass}>Derniers échanges</h3>
      {isPending && <p className="m-0 text-body text-label">Chargement…</p>}
      {!isPending && trades.length === 0 && <p className="m-0 text-body text-label">Aucun échange pour l&apos;instant.</p>}
      {trades.length > 0 && (
        <table className={tableClass}>
          <thead>
            <tr className={headRowClass}>
              <th scope="col" className="px-2 py-1">Date</th>
              <th scope="col" className="px-2 py-1 text-right">Prix</th>
              <th scope="col" className="px-2 py-1 text-right">Lots</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((trade, index) => (
              <tr key={`${trade.executed_at}-${index}`} className={rowClass}>
                <td className="px-2 py-1 text-meta">{formatDate(trade.executed_at)}</td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">{trade.price}</td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">{trade.lots}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {trades.length > VISIBLE_TRADES && (
        <button type="button" className={textButtonClass} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Voir moins' : `Voir les ${trades.length}`}
        </button>
      )}
    </section>
  )
}
