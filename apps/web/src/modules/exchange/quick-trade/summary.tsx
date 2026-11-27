import React from 'react'
import classNames from 'classnames'
import { ExchangeSide, type ExchangeEstimateOrderDataResponse } from '@eoneom/api-client'

import { TroopTranslations } from '#troop/translations'
import { formatDeliveryDuration, formatReservedResources } from '#exchange/translations'

/** « ≈ 3 lots exécutés tout de suite pour ≈ 38 eau pure, le reste attend dans le carnet ». */
const formatImmediateFill = (fill: { lots: number, water: number }, lots: number): string => {
  if (fill.lots <= 0) return 'Votre ordre attendra dans le carnet'
  const head = `≈ ${fill.lots} lot${fill.lots > 1 ? 's' : ''} exécuté${fill.lots > 1 ? 's' : ''} tout de suite pour ≈ ${fill.water} eau pure`
  return fill.lots < lots ? `${head}, le reste attend dans le carnet` : head
}

const Line: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-3 border-t border-rust/30 py-2 first:border-t-0">
    <dt className="text-meta text-label">{label}</dt>
    <dd className="m-0 text-body text-ink">{children}</dd>
  </div>
)

/** Live summary of the quick trade (slice 046): total, reservation, carriers, delivery, immediate fill, open orders. */
export const QuickTradeSummary: React.FC<{
  side: ExchangeSide
  lots: number | null
  price: number | null
  /** Latest estimate answer, possibly for the previous order while the new one loads (`stale`). */
  estimate: ExchangeEstimateOrderDataResponse | undefined
  stale: boolean
  openOrderCount: number | null
  openOrderLimit: number | null
}> = ({ side, lots, price, estimate, stale, openOrderCount, openOrderLimit }) => {
  const total = lots !== null && price !== null ? lots * price : null

  return (
    <dl className={classNames('m-0', stale && 'opacity-60')} aria-live="polite" aria-busy={stale || undefined}>
      <Line label="Total">
        {total === null
          ? '—'
          : side === ExchangeSide.SELL
            ? <>Vous recevrez au moins <strong className="font-mono text-amber">{total}</strong> eau pure</>
            : <>Vous paierez au plus <strong className="font-mono text-amber">{total}</strong> eau pure</>}
      </Line>
      <Line label="Réservé">
        {estimate ? `${formatReservedResources(estimate.reserved_resources)} réservés` : '—'}
      </Line>
      <Line label="Transporteurs">
        {!estimate
          ? '—'
          : estimate.reserved_carriers
            ? estimate.reserved_carriers.map(carrier => `${carrier.count} ${TroopTranslations[carrier.code].name}`).join(', ') || 'aucun'
            : <span className="text-danger">insuffisants</span>}
      </Line>
      <Line label="Livraison">
        {estimate?.typical_delivery_duration != null
          ? `≈ ${formatDeliveryDuration(estimate.typical_delivery_duration)} vers une ville typique de la faction`
          : '—'}
      </Line>
      <Line label="Exécution immédiate">
        {estimate && lots !== null ? formatImmediateFill(estimate.immediate_fill, lots) : '—'}
      </Line>
      <Line label="Ordres ouverts">
        {openOrderCount !== null && openOrderLimit !== null
          ? `Ordres ouverts dans cette ville : ${openOrderCount} / ${openOrderLimit}`
          : '—'}
      </Line>
    </dl>
  )
}
