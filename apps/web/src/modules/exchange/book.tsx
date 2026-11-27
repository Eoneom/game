import React from 'react'
import type { ExchangeBookLevel, ExchangeResource } from '@eoneom/api-client'

import { useExchangeBook } from '#exchange/hooks'
import { headRowClass, rowClass, sectionTitleClass, tableClass } from '#exchange/styles'

const Levels: React.FC<{ title: string, levels: ExchangeBookLevel[], tone: string }> = ({ title, levels, tone }) => (
  <div className="min-w-0 flex-1 space-y-1">
    <h4 className="m-0 text-xs uppercase tracking-wider text-label">{title}</h4>
    {levels.length === 0 ? (
      <p className="m-0 text-xs text-label">Aucun ordre.</p>
    ) : (
      <table className={tableClass}>
        <thead>
          <tr className={headRowClass}>
            <th scope="col" className="px-2 py-1">Prix</th>
            <th scope="col" className="px-2 py-1 text-right">Lots</th>
          </tr>
        </thead>
        <tbody>
          {levels.map(level => (
            <tr key={level.price} className={rowClass}>
              <td className={`px-2 py-1 tabular-nums ${tone}`}>{level.price}</td>
              <td className="px-2 py-1 text-right tabular-nums">{level.lots}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)

/** Depth of the faction book (slice 035): top 10 price levels per side, anonymous. */
export const ExchangeBook: React.FC<{ resource: ExchangeResource }> = ({ resource }) => {
  const { data, isPending } = useExchangeBook(resource)

  return (
    <section className="space-y-2" aria-label="Carnet d'ordres">
      <h3 className={sectionTitleClass}>Carnet d&apos;ordres (eau pure par lot)</h3>
      {isPending ? (
        <p className="m-0 text-sm text-label">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Levels title="Achats" levels={data?.bids ?? []} tone="text-terminal" />
          <Levels title="Ventes" levels={data?.asks ?? []} tone="text-danger" />
        </div>
      )}
    </section>
  )
}
