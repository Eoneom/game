import React, { useId } from 'react'
import { ExchangeSide, type ExchangeSummaryPair } from '@eoneom/api-client'

import { stepperClass, textButtonClass } from '#exchange/styles'
import { parsePositiveInteger } from '#exchange/quick-trade/validation'

/** Best price a new order of `side` can match: the best bid when selling, the best ask when buying. */
const marketPrice = (side: ExchangeSide, pair: ExchangeSummaryPair | undefined): number | null =>
  (side === ExchangeSide.SELL ? pair?.best_bid?.price : pair?.best_ask?.price) ?? null

const formatLevel = (label: string, level: ExchangeSummaryPair['best_bid']): string =>
  level ? `${label} ${level.price} (${level.lots} lot${level.lots > 1 ? 's' : ''})` : `${label} —`

/**
 * Water per lot with − / + steppers, the best bid / ask of other players and « Prix du marché » (slice 046), which
 * only fills the field: the order stays a limit order.
 */
export const PriceField: React.FC<{
  side: ExchangeSide
  pair: ExchangeSummaryPair | undefined
  value: string
  onChange: (value: string) => void
}> = ({ side, pair, value, onChange }) => {
  const id = useId()
  const price = parsePositiveInteger(value)
  const market = marketPrice(side, pair)
  const step = (delta: number) => onChange(String(Math.max(1, (price ?? 0) + delta)))

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="field-label">Prix</label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={stepperClass} aria-label="Baisser le prix" disabled={price === null || price <= 1} onClick={() => step(-1)}>−</button>
        <div className="w-28">
          <input
            id={id}
            className="field-input field-input--number"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={event => onChange(event.target.value)}
          />
        </div>
        <button type="button" className={stepperClass} aria-label="Monter le prix" onClick={() => step(1)}>+</button>
        <span className="text-meta text-label">eau pure / lot</span>
        <button
          type="button"
          className={textButtonClass}
          disabled={market === null}
          onClick={() => market !== null && onChange(String(market))}
        >
          Prix du marché
        </button>
      </div>
      <p className="m-0 font-mono text-meta tabular-nums text-label">
        {formatLevel('Meilleur achat', pair?.best_bid ?? null)} · {formatLevel('Meilleure vente', pair?.best_ask ?? null)}
      </p>
      {market === null && (
        <p className="m-0 text-meta text-label">Aucun ordre en face : votre ordre attendra dans le carnet.</p>
      )}
    </div>
  )
}
