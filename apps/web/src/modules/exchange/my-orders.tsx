import React from 'react'
import { ExchangeSide, type ExchangeOrder } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { formatDate } from '#helpers/transform'
import { TroopTranslations } from '#troop/translations'
import { useCancelExchangeOrder, useMyExchangeOrders } from '#exchange/hooks'
import { formatReservedResources } from '#exchange/order-form'
import { headRowClass, rowClass, sectionTitleClass, tableClass } from '#exchange/styles'
import {
  ExchangeResourceLabels,
  ExchangeSideLabels,
  ExchangeStatusLabels,
} from '#exchange/translations'

const sideTone = (order: ExchangeOrder) => order.side === ExchangeSide.BUY ? 'text-terminal' : 'text-danger'

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

/** Own open orders with cancel, then the last closed orders (slice 035). */
export const ExchangeMyOrders: React.FC = () => {
  const { data, isPending } = useMyExchangeOrders()
  const cancel = useCancelExchangeOrder()
  const open = data?.open ?? []
  const closed = data?.closed ?? []

  return (
    <section className="space-y-3" aria-label="Mes ordres">
      <h3 className={sectionTitleClass}>Mes ordres ouverts</h3>
      {isPending && <p className="m-0 text-sm text-label">Chargement…</p>}
      {!isPending && open.length === 0 && <p className="m-0 text-sm text-label">Aucun ordre ouvert.</p>}
      {open.length > 0 && (
        <table className={tableClass}>
          <thead>
            <tr className={headRowClass}>
              <th scope="col" className="px-2 py-1">Ordre</th>
              <th scope="col" className="px-2 py-1">Ville</th>
              <th scope="col" className="px-2 py-1 text-right">Exécuté</th>
              <th scope="col" className="px-2 py-1 text-right">Prix</th>
              <th scope="col" className="px-2 py-1">Réservé pour la bourse</th>
              <th scope="col" className="px-2 py-1">Expire</th>
              <th scope="col" className="px-2 py-1"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {open.map(order => (
              <tr key={order.id} className={rowClass}>
                <td className={`px-2 py-1 ${sideTone(order)}`}>
                  {ExchangeSideLabels[order.side]} · {ExchangeResourceLabels[order.resource]}
                </td>
                <td className="px-2 py-1">{order.city_name}</td>
                <td className="px-2 py-1 text-right tabular-nums">{order.filled_lots} / {order.lots}</td>
                <td className="px-2 py-1 text-right tabular-nums">{order.price}</td>
                <td className="px-2 py-1 text-xs"><Reservation order={order} /></td>
                <td className="px-2 py-1 text-xs">{formatDate(order.expires_at)}</td>
                <td className="px-2 py-1 text-right">
                  <Button
                    variant="ghost"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(order.id)}
                  >
                    Annuler
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 className={sectionTitleClass}>Historique</h3>
      {!isPending && closed.length === 0 && <p className="m-0 text-sm text-label">Aucun ordre clos.</p>}
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
                <td className={`px-2 py-1 ${sideTone(order)}`}>
                  {ExchangeSideLabels[order.side]} · {ExchangeResourceLabels[order.resource]}
                </td>
                <td className="px-2 py-1">{order.city_name || '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums">{order.filled_lots} / {order.lots}</td>
                <td className="px-2 py-1 text-right tabular-nums">{order.price}</td>
                <td className="px-2 py-1">{ExchangeStatusLabels[order.status]}</td>
                <td className="px-2 py-1 text-xs">{order.closed_at ? formatDate(order.closed_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
