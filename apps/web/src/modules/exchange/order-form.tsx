import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import { ExchangeSide, type ExchangeOrderInput, type ExchangeResource, type Resource } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { useListCities } from '#city/hooks'
import { useLocation } from '#location/context'
import { TroopTranslations } from '#troop/translations'
import { useExchangeEstimate, usePlaceExchangeOrder } from '#exchange/hooks'
import { fieldClass, sectionTitleClass } from '#exchange/styles'
import {
  ExchangeSideLabels,
  formatDeliveryDuration,
  formatLotSize,
  formatLots,
} from '#exchange/translations'

const toPositiveInteger = (value: string): number | null => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null
}

export const formatReservedResources = (resources: Resource): string => [
  resources.plastic > 0 ? `${resources.plastic} plastique` : null,
  resources.mushroom > 0 ? `${resources.mushroom} champignon` : null,
  resources.plasma > 0 ? `${resources.plasma} plasma` : null,
  resources.water > 0 ? `${resources.water} eau pure` : null,
].filter(Boolean).join(', ')

const sideClass = (active: boolean) => classNames(
  'flex-1 rounded-sm border px-3 py-1 text-caption uppercase tracking-wider transition',
  active
    ? 'neon-amber motion-safe-neon border-amber/50 bg-chrome text-amber'
    : 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber'
)

/**
 * Limit order form (slice 035): side, city, lots and price, with the reservation the order makes (resources and
 * carriers) and the delivery time to a typical faction city.
 */
export const ExchangeOrderForm: React.FC<{ resource: ExchangeResource }> = ({ resource }) => {
  const { cityId } = useLocation()
  const { data: cityList } = useListCities()
  const cities = cityList?.cities ?? []
  const [ side, setSide ] = useState<ExchangeSide>(ExchangeSide.BUY)
  const [ selectedCityId, setSelectedCityId ] = useState<string>('')
  const [ lotsText, setLotsText ] = useState('1')
  const [ priceText, setPriceText ] = useState('1')
  const place = usePlaceExchangeOrder()

  useEffect(() => {
    if (!selectedCityId && cities.length > 0) {
      setSelectedCityId(cities.find(city => city.id === cityId)?.id ?? cities[0].id)
    }
  }, [ cities, cityId, selectedCityId ])

  const lots = toPositiveInteger(lotsText)
  const price = toPositiveInteger(priceText)
  const input: ExchangeOrderInput | null = selectedCityId && lots && price
    ? { city_id: selectedCityId, side, resource, lots, price }
    : null
  const { data: estimate, error: estimateError } = useExchangeEstimate(input)

  const canPlace = Boolean(
    input
    && estimate
    && estimate.enough_resources
    && estimate.reserved_carriers
    && estimate.open_order_limit > 0
    && estimate.open_order_count < estimate.open_order_limit
  )

  return (
    <form
      className="space-y-2"
      aria-label="Passer un ordre"
      onSubmit={event => {
        event.preventDefault()
        if (input && canPlace) place.mutate(input)
      }}
    >
      <h3 className={sectionTitleClass}>Passer un ordre</h3>
      <div className="flex gap-1" role="radiogroup" aria-label="Sens">
        {[ ExchangeSide.BUY, ExchangeSide.SELL ].map(value => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={side === value}
            className={sideClass(side === value)}
            onClick={() => setSide(value)}
          >
            {ExchangeSideLabels[value]}
          </button>
        ))}
      </div>
      <label className="block space-y-1 text-meta text-label">
        Ville
        <select
          className={fieldClass}
          value={selectedCityId}
          onChange={event => setSelectedCityId(event.target.value)}
        >
          {cities.map(city => (
            <option key={city.id} value={city.id}>{city.name}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1 text-meta text-label">
          Lots
          <input
            className={fieldClass}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={lotsText}
            onChange={event => setLotsText(event.target.value)}
          />
        </label>
        <label className="block space-y-1 text-meta text-label">
          Prix (eau pure / lot)
          <input
            className={fieldClass}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={priceText}
            onChange={event => setPriceText(event.target.value)}
          />
        </label>
      </div>
      <p className="m-0 text-meta text-label">
        {formatLotSize(resource)}
        {lots ? ` · ${side === ExchangeSide.BUY ? 'achat de' : 'vente de'} ${formatLots(resource, lots)}` : ''}
      </p>

      {!input && <p className="m-0 text-meta text-danger">Lots et prix doivent être des entiers d&apos;au moins 1.</p>}
      {input && estimateError && <p className="m-0 text-meta text-danger">Estimation indisponible.</p>}
      {input && estimate && (
        <div className="space-y-1 rounded-sm border border-rust/40 p-2 text-meta text-amber-dim" aria-live="polite">
          <p className="m-0">
            Réservé à la passation : <strong className="text-amber">{formatReservedResources(estimate.reserved_resources)}</strong>
            {!estimate.enough_resources && <span className="text-danger"> (stock insuffisant)</span>}
          </p>
          <p className="m-0">
            Transporteurs réservés :{' '}
            {estimate.reserved_carriers
              ? <strong className="text-amber">
                {estimate.reserved_carriers.map(carrier => `${carrier.count} ${TroopTranslations[carrier.code].name}`).join(', ')}
              </strong>
              : <span className="text-danger">pas assez de transporteurs disponibles</span>}
          </p>
          {estimate.typical_delivery_duration !== null && (
            <p className="m-0">
              Livraison estimée vers une ville typique de la faction :{' '}
              <strong className="text-amber">{formatDeliveryDuration(estimate.typical_delivery_duration)}</strong>
            </p>
          )}
          <p className="m-0">
            {estimate.open_order_limit === 0
              ? <span className="text-danger">Construisez un comptoir d&apos;échange dans cette ville pour trader.</span>
              : <>Ordres ouverts dans cette ville : {estimate.open_order_count} / {estimate.open_order_limit}</>}
          </p>
        </div>
      )}
      <p className="m-0 text-meta text-label">
        Les ressources et les transporteurs restent réservés jusqu&apos;à l&apos;exécution, l&apos;annulation ou
        l&apos;expiration de l&apos;ordre (7 jours). Les convois ne peuvent pas être interceptés.
      </p>
      <Button type="submit" disabled={!canPlace || place.isPending}>
        {side === ExchangeSide.BUY ? 'Acheter' : 'Vendre'}
      </Button>
    </form>
  )
}
