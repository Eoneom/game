import React, { useId, useState } from 'react'
import classNames from 'classnames'
import type { ExchangeOrder, ExchangeResource } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { formatDate } from '#helpers/transform'
import { useNow } from '#hook/now'
import { TroopTranslations } from '#troop/translations'
import { useCancelExchangeOrder, useMyExchangeOrders } from '#exchange/hooks'
import { headRowClass, panelClass, rowClass, sideToneClass, tableClass, textButtonClass } from '#exchange/styles'
import {
  ExchangeResourceLabels,
  ExchangeSideLabels,
  ExchangeStatusLabels,
  formatPrice,
  formatRelativeExpiry,
  formatReservedResources,
} from '#exchange/translations'

const Reservation: React.FC<{ order: ExchangeOrder }> = ({ order }) => (
  <>
    {order.reserved_resources ? formatReservedResources(order.reserved_resources) : '—'}
    {order.reserved_carriers.length > 0 && (
      <span className="block text-label">
        {order.reserved_carriers.map(carrier => `${carrier.count} ${TroopTranslations[carrier.code].name}`).join(', ')}
      </span>
    )}
  </>
)

const Progress: React.FC<{ order: ExchangeOrder }> = ({ order }) => {
  const percent = order.lots > 0 ? Math.round((order.filled_lots / order.lots) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-24 shrink-0 overflow-hidden rounded-sm bg-chrome"
        role="progressbar"
        aria-label="Lots exécutés"
        aria-valuemin={0}
        aria-valuemax={order.lots}
        aria-valuenow={order.filled_lots}
      >
        <div className="h-full bg-amber" style={{ width: `${percent}%` }} />
      </div>
      <span className="font-mono text-meta tabular-nums">{order.filled_lots} / {order.lots} lots</span>
    </div>
  )
}

const OrderLabel: React.FC<{ order: ExchangeOrder }> = ({ order }) => (
  <span className={sideToneClass(order.side)}>
    {ExchangeSideLabels[order.side]} · {ExchangeResourceLabels[order.resource]}
  </span>
)

/**
 * « Mes ordres » (slices 035, 046): open orders of every pair, newest first, with fill progress, relative expiry and
 * « Annuler » (no confirmation: escrow and carriers come back); the selected pair is highlighted. The closed history
 * is folded.
 */
export const ExchangeMyOrders: React.FC<{ resource: ExchangeResource }> = ({ resource }) => {
  const titleId = useId()
  const historyId = useId()
  const now = useNow(60_000)
  const { data, isPending } = useMyExchangeOrders()
  const cancel = useCancelExchangeOrder()
  const [ historyOpen, setHistoryOpen ] = useState(false)
  const open = [ ...(data?.open ?? []) ].sort((a, b) => b.created_at - a.created_at)
  const closed = data?.closed ?? []

  return (
    <section className={classNames(panelClass, 'space-y-3')} aria-labelledby={titleId}>
      <h2 id={titleId} className="m-0 text-heading text-amber">Mes ordres</h2>
      {isPending && <p className="m-0 text-body text-label">Chargement…</p>}
      {!isPending && open.length === 0 && <p className="m-0 text-body text-label">Aucun ordre ouvert.</p>}
      {open.length > 0 && (
        <table className={tableClass}>
          <thead>
            <tr className={headRowClass}>
              <th scope="col" className="px-2 py-1">Ordre</th>
              <th scope="col" className="px-2 py-1">Ville</th>
              <th scope="col" className="px-2 py-1">Progression</th>
              <th scope="col" className="px-2 py-1 text-right">Prix</th>
              <th scope="col" className="px-2 py-1">Réservé</th>
              <th scope="col" className="px-2 py-1">Expire dans</th>
              <th scope="col" className="px-2 py-1"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {open.map(order => (
              <tr
                key={order.id}
                className={classNames(rowClass, order.resource === resource && 'bg-chrome-2')}
                aria-current={order.resource === resource ? 'true' : undefined}
              >
                <td className="px-2 py-1"><OrderLabel order={order} /></td>
                <td className="px-2 py-1">{order.city_name || '—'}</td>
                <td className="px-2 py-1"><Progress order={order} /></td>
                <td className="px-2 py-1 text-right font-mono tabular-nums">{formatPrice(order.price)}</td>
                <td className="px-2 py-1 text-meta"><Reservation order={order} /></td>
                <td className="px-2 py-1 text-meta">
                  <span title={formatDate(order.expires_at)}>{formatRelativeExpiry(order.expires_at, now)}</span>
                </td>
                <td className="px-2 py-1 text-right">
                  <Button variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate(order.id)}>
                    Annuler
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        type="button"
        className={textButtonClass}
        aria-expanded={historyOpen}
        aria-controls={historyId}
        onClick={() => setHistoryOpen(!historyOpen)}
      >
        <span aria-hidden>{historyOpen ? '▾' : '▸'} </span>Historique (50 derniers)
      </button>
      <div id={historyId} hidden={!historyOpen}>
        {!isPending && closed.length === 0 && <p className="m-0 text-body text-label">Aucun ordre clos.</p>}
        {closed.length > 0 && (
          <table className={tableClass}>
            <thead>
              <tr className={headRowClass}>
                <th scope="col" className="px-2 py-1">Ordre</th>
                <th scope="col" className="px-2 py-1">Ville</th>
                <th scope="col" className="px-2 py-1 text-right">Exécuté</th>
                <th scope="col" className="px-2 py-1 text-right">Prix limite</th>
                <th scope="col" className="px-2 py-1">Statut</th>
                <th scope="col" className="px-2 py-1">Clos le</th>
              </tr>
            </thead>
            <tbody>
              {closed.map(order => (
                <tr key={order.id} className={rowClass}>
                  <td className="px-2 py-1"><OrderLabel order={order} /></td>
                  <td className="px-2 py-1">{order.city_name || '—'}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{order.filled_lots} / {order.lots}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{order.price}</td>
                  <td className="px-2 py-1">{ExchangeStatusLabels[order.status]}</td>
                  <td className="px-2 py-1 text-meta">{order.closed_at ? formatDate(order.closed_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
