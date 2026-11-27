import React from 'react'
import classNames from 'classnames'
import { BuildingCode, ExchangeSide, type ExchangeOrder } from '@eoneom/api-client'

import { useListBuildings } from '#building/hooks'
import { useMyExchangeOrders } from '#exchange/hooks'
import { ExchangeResourceLabels, ExchangeSideLabels, formatPrice } from '#exchange/translations'
import { DashboardCard, DashboardEmpty, DashboardLink, queryCardState } from '#location/dashboard/card'

const MAX_ORDERS = 3

const OrderLine: React.FC<{ order: ExchangeOrder }> = ({ order }) => {
  const percent = order.lots > 0 ? Math.round((order.filled_lots / order.lots) * 100) : 0
  return (
    <li className="space-y-1">
      <p className="m-0 flex items-baseline justify-between gap-2 text-meta">
        <span>
          <span className={order.side === ExchangeSide.BUY ? 'text-terminal' : 'text-danger'}>{ExchangeSideLabels[order.side]}</span>{' '}
          <span className="text-amber-dim">{ExchangeResourceLabels[order.resource].toLowerCase()}</span>
        </span>
        <span className="font-mono tabular-nums text-amber">{order.filled_lots} / {order.lots} lots</span>
      </p>
      <div className="h-1 overflow-hidden rounded-sm bg-chrome" aria-hidden>
        <div className="h-full bg-amber" style={{ width: `${percent}%` }} />
      </div>
      <p className="m-0 text-caption text-label">{formatPrice(order.price)}</p>
    </li>
  )
}

/** « Bourse » (slice 042): open orders placed from this city against its limit (trading post level, slice 035). */
export const ExchangeOrdersCard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const ordersQuery = useMyExchangeOrders()
  const buildingsQuery = useListBuildings(cityId)

  const tradingPostLevel = buildingsQuery.data?.buildings.find(building => building.code === BuildingCode.TRADING_POST)?.level ?? 0
  const orders = (ordersQuery.data?.open ?? [])
    .filter(order => order.city_id === cityId)
    .sort((a, b) => b.created_at - a.created_at)
  const visible = orders.slice(0, MAX_ORDERS)
  const more = orders.length - visible.length
  const full = tradingPostLevel > 0 && orders.length >= tradingPostLevel

  return (
    <DashboardCard
      title="Bourse"
      to="/exchange"
      state={queryCardState(ordersQuery, buildingsQuery)}
      onRetry={() => {
        if (ordersQuery.isError) void ordersQuery.refetch()
        if (buildingsQuery.isError) void buildingsQuery.refetch()
      }}
    >
      {tradingPostLevel === 0 && orders.length === 0 ? (
        <p className="m-0 text-meta text-amber-dim">Construisez un Comptoir d&apos;échange pour placer des ordres.</p>
      ) : (
        <div className="space-y-3">
          <p className="m-0 text-meta text-label">
            Ordres{' '}
            <span className={classNames('font-mono tabular-nums', full ? 'text-amber' : 'text-amber-dim')}>
              {orders.length} / {tradingPostLevel}
            </span>
          </p>
          {orders.length === 0 ? (
            <DashboardEmpty cta={{ label: 'Placer un ordre', to: '/exchange' }}>Aucun ordre ouvert.</DashboardEmpty>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {visible.map(order => <OrderLine key={order.id} order={order} />)}
            </ul>
          )}
          {more > 0 ? (
            <p className="m-0 text-meta">
              <DashboardLink to="/exchange" className="text-amber">+{more} autre{more > 1 ? 's' : ''}</DashboardLink>
            </p>
          ) : null}
        </div>
      )}
    </DashboardCard>
  )
}
