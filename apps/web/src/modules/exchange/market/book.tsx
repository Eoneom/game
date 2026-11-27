import React from 'react'
import classNames from 'classnames'
import { ExchangeSide, type ExchangeBookLevel, type ExchangeResource } from '@eoneom/api-client'

import { useExchangeBook } from '#exchange/hooks'
import { sectionTitleClass, sideToneClass } from '#exchange/styles'
import { ExchangeSideActionLabels } from '#exchange/translations'

/** Side a click on a level of `levelSide` fills: an ask is bought, a bid is sold into (slice 046). */
const prefillSideFor = (levelSide: ExchangeSide): ExchangeSide =>
  levelSide === ExchangeSide.SELL ? ExchangeSide.BUY : ExchangeSide.SELL

const Levels: React.FC<{
  title: string
  levelSide: ExchangeSide
  levels: ExchangeBookLevel[]
  maxLots: number
  onPick: (side: ExchangeSide, price: number) => void
}> = ({ title, levelSide, levels, maxLots, onPick }) => {
  const side = prefillSideFor(levelSide)

  return (
    <div className="min-w-0 flex-1 space-y-1">
      <h4 className={sectionTitleClass}>{title}</h4>
      {levels.length === 0 ? (
        <p className="m-0 text-meta text-label">Aucun ordre.</p>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0">
          {levels.map(level => (
            <li key={level.price}>
              <button
                type="button"
                className="grid w-full grid-cols-[4rem_5rem_minmax(0,1fr)] items-center gap-3 rounded-sm border border-transparent px-2 py-1 text-left transition hover:border-rust hover:bg-chrome-2"
                aria-label={`${ExchangeSideActionLabels[side]} à ${level.price} eau pure / lot — ${level.lots} lot${level.lots > 1 ? 's' : ''}${level.own_lots > 0 ? `, dont ${level.own_lots} à vous` : ''}`}
                title={`${ExchangeSideActionLabels[side]} à ${level.price} eau pure / lot`}
                onClick={() => onPick(side, level.price)}
              >
                <span className={classNames('font-mono text-body tabular-nums', sideToneClass(levelSide))}>{level.price}</span>
                <span className="text-right font-mono text-body tabular-nums text-amber-dim">
                  {level.lots} lot{level.lots > 1 ? 's' : ''}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-chrome" aria-hidden>
                    <span
                      className={classNames('block h-full', levelSide === ExchangeSide.BUY ? 'bg-terminal/70' : 'bg-danger/70')}
                      style={{ width: `${Math.round((level.lots / maxLots) * 100)}%` }}
                    />
                  </span>
                  {level.own_lots > 0 && (
                    <span className="shrink-0 text-caption text-amber">dont {level.own_lots} à vous</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * « Profondeur » (slices 035, 046): top 10 levels per side; levels holding own orders say « dont N à vous », and a
 * click fills the quick trade with the opposite side at that price.
 */
export const ExchangeBook: React.FC<{
  resource: ExchangeResource
  onPick: (side: ExchangeSide, price: number) => void
}> = ({ resource, onPick }) => {
  const { data, isPending } = useExchangeBook(resource)
  const bids = data?.bids ?? []
  const asks = data?.asks ?? []
  const maxLots = Math.max(1, ...bids.map(level => level.lots), ...asks.map(level => level.lots))

  return (
    <section className="space-y-2" aria-label="Profondeur">
      <h3 className={sectionTitleClass}>Profondeur (eau pure par lot)</h3>
      {isPending ? (
        <p className="m-0 text-body text-label">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-4 2xl:flex-row">
          <Levels title="Achats" levelSide={ExchangeSide.BUY} levels={bids} maxLots={maxLots} onPick={onPick} />
          <Levels title="Ventes" levelSide={ExchangeSide.SELL} levels={asks} maxLots={maxLots} onPick={onPick} />
        </div>
      )}
      <p className="m-0 text-caption text-label">Cliquez sur un niveau pour reprendre son prix dans l&apos;échange rapide.</p>
    </section>
  )
}
