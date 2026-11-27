import React, { useEffect, useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BuildingCode, type ExchangeOrderInput, type ExchangeResource, type ExchangeSide } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { useGetCity, useListCities } from '#city/hooks'
import { useLocation } from '#location/context'
import {
  useExchangeEstimate,
  useExchangeSummary,
  useMyExchangeOrders,
  usePlaceExchangeOrder,
} from '#exchange/hooks'
import { panelClass } from '#exchange/styles'
import { ResourceSelector } from '#exchange/quick-trade/resource-selector'
import { SideToggle } from '#exchange/quick-trade/side-toggle'
import { QuantityField } from '#exchange/quick-trade/quantity-field'
import { PriceField } from '#exchange/quick-trade/price-field'
import { QuickTradeSummary } from '#exchange/quick-trade/summary'
import { maxLots } from '#exchange/quick-trade/max-lots'
import { NO_TRADING_POST_MESSAGE, firstQuickTradeIssue, parsePositiveInteger } from '#exchange/quick-trade/validation'

const RouterLink = Link as unknown as React.ComponentType<{
  to: string
  params: Record<string, string>
  search: Record<string, string>
  className?: string
  children: React.ReactNode
}>

export const QUICK_TRADE_ID = 'quick-trade'

interface Props {
  resource: ExchangeResource
  side: ExchangeSide
  onResourceChange: (resource: ExchangeResource) => void
  onSideChange: (side: ExchangeSide) => void
  /** Price field, held by the page so a book level can fill it. */
  priceText: string
  onPriceTextChange: (value: string) => void
}

/**
 * « Échange rapide » (slice 046): inputs on the left (resource, side, city, quantity, price), live summary on the
 * right (estimate, validation, « Placer l'ordre »). Cities without a trading post cannot trade.
 */
export const QuickTrade: React.FC<Props> = ({
  resource,
  side,
  onResourceChange,
  onSideChange,
  priceText,
  onPriceTextChange,
}) => {
  const titleId = useId()
  const cityFieldId = useId()
  const { cityId } = useLocation()
  const { data: cityList } = useListCities()
  const { data: mine, isPending: minePending } = useMyExchangeOrders()
  const { data: summary } = useExchangeSummary()
  const tradingPosts = mine?.trading_posts ?? []

  const [ selectedCityId, setSelectedCityId ] = useState('')
  const [ lotsText, setLotsText ] = useState('1')
  const [ capacityByCity, setCapacityByCity ] = useState<Record<string, number>>({})

  // Default city: the current one when it can trade, else the first trading-post city.
  const tradingPost = tradingPosts.find(entry => entry.city_id === selectedCityId)
    ?? tradingPosts.find(entry => entry.city_id === cityId)
    ?? tradingPosts[0]
  const tradeCityId = tradingPost?.city_id ?? null
  const { data: city } = useGetCity(tradeCityId)
  const stock = city && city.id === tradeCityId ? city : undefined

  const lots = parsePositiveInteger(lotsText)
  const price = parsePositiveInteger(priceText)
  const input: ExchangeOrderInput | null = tradeCityId && lots !== null && price !== null
    ? { city_id: tradeCityId, side, resource, lots, price }
    : null
  const estimate = useExchangeEstimate(input)
  const place = usePlaceExchangeOrder()

  // The free carrier capacity only depends on the city: keep the last answer per city for « Max ».
  const answeredCityId = !estimate.isPlaceholderData && estimate.data ? estimate.input?.city_id : undefined
  const answeredCapacity = estimate.data?.available_carrier_capacity
  useEffect(() => {
    if (answeredCityId && answeredCapacity !== undefined) {
      setCapacityByCity(previous => previous[answeredCityId] === answeredCapacity
        ? previous
        : { ...previous, [answeredCityId]: answeredCapacity })
    }
  }, [ answeredCityId, answeredCapacity ])

  const pair = summary?.pairs.find(entry => entry.resource === resource)
  const currentEstimate = estimate.isCurrent ? estimate.data : undefined
  const openOrderCount = currentEstimate?.open_order_count ?? tradingPost?.open_order_count ?? null
  const openOrderLimit = currentEstimate?.open_order_limit ?? tradingPost?.level ?? null
  const estimateFailed = !!input && estimate.isError && JSON.stringify(estimate.input) === JSON.stringify(input)

  const issue = firstQuickTradeIssue({
    side,
    resource,
    tradingPostCount: minePending ? 1 : tradingPosts.length,
    lots,
    price,
    openOrderCount,
    openOrderLimit,
    stock,
    estimate: currentEstimate,
    estimateFailed,
  })
  const max = maxLots({
    side,
    resource,
    price,
    stock,
    availableCarrierCapacity: tradeCityId ? capacityByCity[tradeCityId] ?? null : null,
  })
  const canPlace = !!input && !issue && !!currentEstimate && !place.isPending

  if (minePending) {
    return (
      <section id={QUICK_TRADE_ID} aria-labelledby={titleId} aria-busy className={panelClass}>
        <h2 id={titleId} className="m-0 mb-3 text-heading text-amber">Échange rapide</h2>
        <p className="m-0 text-body text-label">Chargement…</p>
      </section>
    )
  }

  if (tradingPosts.length === 0) {
    const buildingCityId = cityId ?? cityList?.cities[0]?.id
    return (
      <section id={QUICK_TRADE_ID} aria-labelledby={titleId} className={panelClass}>
        <h2 id={titleId} className="m-0 mb-3 text-heading text-amber">Échange rapide</h2>
        <p className="m-0 text-body text-amber-dim">{NO_TRADING_POST_MESSAGE}</p>
        {buildingCityId && (
          <p className="m-0 mt-2 text-meta">
            <RouterLink
              to="/city/$cityId/base/building"
              params={{ cityId: buildingCityId }}
              search={{ code: BuildingCode.TRADING_POST }}
              className="text-amber underline-offset-2 hover:underline"
            >
              Voir les bâtiments
            </RouterLink>
          </p>
        )}
      </section>
    )
  }

  return (
    <section id={QUICK_TRADE_ID} aria-labelledby={titleId} className={panelClass}>
      <h2 id={titleId} className="m-0 mb-3 text-heading text-amber">Échange rapide</h2>
      <form
        aria-labelledby={titleId}
        className="grid grid-cols-1 gap-6 xl:grid-cols-2"
        onSubmit={event => {
          event.preventDefault()
          if (input && canPlace) {
            place.mutate(input, { onSuccess: () => setLotsText('1') })
          }
        }}
      >
        <div className="min-w-0 space-y-4">
          <ResourceSelector resource={resource} pairs={summary?.pairs} onChange={onResourceChange} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-72">
              <SideToggle side={side} onChange={onSideChange} />
            </div>
            {tradingPosts.length > 1 ? (
              <div className="space-y-1">
                <label htmlFor={cityFieldId} className="field-label">Ville</label>
                <div className="w-64">
                  <select
                    id={cityFieldId}
                    className="field-input"
                    value={tradeCityId ?? ''}
                    onChange={event => setSelectedCityId(event.target.value)}
                  >
                    {tradingPosts.map(entry => (
                      <option key={entry.city_id} value={entry.city_id}>
                        {entry.city_name} — {entry.open_order_count} / {entry.level} ordres
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="m-0 text-meta text-label">Depuis {tradingPost?.city_name}</p>
            )}
          </div>
          <QuantityField resource={resource} value={lotsText} onChange={setLotsText} max={max} />
          <PriceField side={side} pair={pair} value={priceText} onChange={onPriceTextChange} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <QuickTradeSummary
            side={side}
            lots={lots}
            price={price}
            estimate={input ? estimate.data : undefined}
            stale={!!input && !estimate.isCurrent}
            openOrderCount={openOrderCount}
            openOrderLimit={openOrderLimit}
          />
          <div className="mt-auto space-y-2 border-t border-rust/30 pt-3">
            <p aria-live="polite" className="m-0 min-h-6 text-meta text-danger" data-testid="quick-trade-issue">
              {issue?.message}
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={!canPlace}>
                {place.isPending ? 'Envoi…' : 'Placer l\'ordre'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  )
}
