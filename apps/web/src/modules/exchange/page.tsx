import React from 'react'
import classNames from 'classnames'
import { ExchangeResource } from '@eoneom/api-client'

import { LayoutPage } from '#ui/layout/page'
import { ExchangeBook } from '#exchange/book'
import { ExchangeTrades } from '#exchange/trades'
import { ExchangeOrderForm } from '#exchange/order-form'
import { ExchangeMyOrders } from '#exchange/my-orders'
import { ExchangeResourceLabels, formatLotSize } from '#exchange/translations'

export interface ExchangePageSearch {
  resource?: ExchangeResource
}

const tabClass = (active: boolean) => classNames(
  'rounded-sm border px-3 py-1 text-xs uppercase tracking-wider transition',
  active
    ? 'neon-amber motion-safe-neon border-amber/50 bg-chrome text-amber'
    : 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber'
)

/** Bourse de faction (slice 035): one book per pair against water, players of the faction only. */
export const ExchangePage: React.FC<{
  search: ExchangePageSearch
  onNavigate: (search: ExchangePageSearch) => void
}> = ({ search, onNavigate }) => {
  const resource = search.resource ?? ExchangeResource.PLASTIC

  return (
    <LayoutPage details={<ExchangeOrderForm resource={resource} />}>
      <div className="space-y-4">
        <header className="space-y-2">
          <h2 className="m-0 text-base text-amber">Bourse de faction</h2>
          <p className="m-0 text-xs text-label">
            Ordres à cours limité contre de l&apos;eau pure, entre joueurs de votre faction. Priorité au meilleur prix
            puis au plus ancien ; exécution au prix de l&apos;ordre en attente. Pas de frais.
          </p>
          <nav aria-label="Marché" className="flex flex-wrap gap-1">
            {Object.values(ExchangeResource).map(value => (
              <button
                key={value}
                type="button"
                className={tabClass(value === resource)}
                aria-pressed={value === resource}
                onClick={() => onNavigate({ resource: value })}
              >
                {ExchangeResourceLabels[value]} / eau pure
              </button>
            ))}
          </nav>
          <p className="m-0 text-xs text-label">{formatLotSize(resource)}</p>
        </header>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ExchangeBook resource={resource} />
          <ExchangeTrades resource={resource} />
        </div>
        <ExchangeMyOrders />
      </div>
    </LayoutPage>
  )
}
