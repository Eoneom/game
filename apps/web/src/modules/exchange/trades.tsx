import React from 'react'
import type { ExchangeResource, ExchangeTrade } from '@eoneom/api-client'

import { formatDate } from '#helpers/transform'
import { useExchangeTrades } from '#exchange/hooks'
import { headRowClass, rowClass, sectionTitleClass, tableClass } from '#exchange/styles'

const WIDTH = 300
const HEIGHT = 60

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

/** Last trades of the faction for the pair (slice 035), with their price line. */
export const ExchangeTrades: React.FC<{ resource: ExchangeResource }> = ({ resource }) => {
  const { data: trades = [], isPending } = useExchangeTrades(resource)
  const prices = trades.map(trade => trade.price)

  return (
    <section className="space-y-2" aria-label="Derniers échanges">
      <h3 className={sectionTitleClass}>Derniers échanges</h3>
      {isPending && <p className="m-0 text-sm text-label">Chargement…</p>}
      {!isPending && trades.length === 0 && <p className="m-0 text-sm text-label">Aucun échange pour l&apos;instant.</p>}
      {trades.length > 0 && (
        <>
          <figure className="m-0 space-y-1">
            <svg
              viewBox={`-4 -4 ${WIDTH + 8} ${HEIGHT + 8}`}
              className="h-16 w-full text-amber"
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
            <figcaption className="flex justify-between text-xs text-label">
              <span>Min {Math.min(...prices)}</span>
              <span>Dernier {trades[0].price}</span>
              <span>Max {Math.max(...prices)}</span>
            </figcaption>
          </figure>
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th scope="col" className="px-2 py-1">Date</th>
                <th scope="col" className="px-2 py-1 text-right">Prix</th>
                <th scope="col" className="px-2 py-1 text-right">Lots</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, index) => (
                <tr key={`${trade.executed_at}-${index}`} className={rowClass}>
                  <td className="px-2 py-1">{formatDate(trade.executed_at)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{trade.price}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{trade.lots}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
