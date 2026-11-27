import React from 'react'
import classNames from 'classnames'

import { formatCompactDuration, formatTime, transformDecimals } from '#helpers/transform'
import { IconDuration } from '#ui/icon/duration'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlasma } from '#ui/icon/plasma'
import { IconPlastic } from '#ui/icon/plastic'
import { IconWater } from '#ui/icon/water'
import { CatalogueBadge } from '#ui/catalogue/badge'
import { CatalogueCardState, CatalogueResources, isDimmedCardState } from '#ui/catalogue/state'

export interface CatalogueCardCost extends CatalogueResources {
  /** « ▸ niv. N+1 » for levels, « ▸ × 1 » for units. */
  target_label: string
  duration: number
}

/** Data of one card; the grid adds selection, focus and keyboard handling. */
export interface CatalogueCardData {
  code: string
  name: string
  image: string
  amount: { kind: 'level' | 'count', value: number }
  /** Extra lines under the level or count (reserved carriers, defense stats, Enceinte points). */
  extra?: React.ReactNode
  cost?: CatalogueCardCost
  /** City stock: a cost chip the city cannot pay is red (same rule as `modules/cost`). */
  stock?: Required<CatalogueResources>
  state: CatalogueCardState
  /** Elapsed share (0–1) of the entry in progress: 4 px bar along the bottom edge. */
  progress?: { elapsed: number }
  /** Spans the full grid row (the Enceinte card). */
  wide?: boolean
}

export interface CatalogueCardProps extends CatalogueCardData {
  selected: boolean
  onSelect: () => void
  tabIndex?: number
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>
  onFocus?: React.FocusEventHandler<HTMLDivElement>
}

const CostChip: React.FC<{
  icon: React.ReactNode
  value: number
  label: string
  short: boolean
}> = ({ icon, value, label, short }) => (
  <span
    className={classNames('inline-flex items-center gap-0.5 font-mono', short ? 'text-danger' : 'text-ink')}
    title={`${label} : ${value.toLocaleString('fr-FR')}${short ? ' (insuffisant)' : ''}`}
    data-short={short || undefined}
  >
    <span className="inline-flex text-label [&_svg]:h-4 [&_svg]:w-4" aria-hidden>{icon}</span>
    <span className="sr-only">{label}</span>
    {transformDecimals(value)}
  </span>
)

const CostRow: React.FC<{ cost: CatalogueCardCost, stock?: Required<CatalogueResources> }> = ({ cost, stock }) => {
  const isShort = (key: keyof CatalogueResources) => stock !== undefined && (cost[key] ?? 0) > stock[key]
  const water = cost.water ?? 0

  return (
    <p className="catalogue-card__cost m-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-label">
      <span>{cost.target_label}</span>
      <CostChip icon={<IconPlastic />} label="Plastique" value={cost.plastic} short={isShort('plastic')} />
      <CostChip icon={<IconMushroom />} label="Champignon" value={cost.mushroom} short={isShort('mushroom')} />
      {cost.plasma > 0 ? (
        <CostChip icon={<IconPlasma />} label="Plasma" value={cost.plasma} short={isShort('plasma')} />
      ) : null}
      {water > 0 ? (
        <CostChip icon={<IconWater />} label="Eau" value={water} short={isShort('water')} />
      ) : null}
      <span className="inline-flex items-center gap-0.5 font-mono text-ink" title={`Durée : ${formatTime(cost.duration)}`}>
        <span className="inline-flex text-label [&_svg]:h-4 [&_svg]:w-4" aria-hidden><IconDuration /></span>
        <span className="sr-only">Durée</span>
        {formatCompactDuration(cost.duration)}
      </span>
    </p>
  )
}

/** One catalogue entry (slice 043): picture, name, level or count, next cost and one state badge. */
export const CatalogueCard = React.forwardRef<HTMLDivElement, CatalogueCardProps>(({
  code,
  name,
  image,
  amount,
  extra,
  cost,
  stock,
  state,
  progress,
  wide,
  selected,
  onSelect,
  tabIndex,
  onKeyDown,
  onFocus,
}, ref) => {
  const dimmed = isDimmedCardState(state)
  const idBase = `catalogue-card-${code}`

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      aria-labelledby={`${idBase}-name`}
      aria-describedby={[
        `${idBase}-amount`,
        state.kind !== 'none' ? `${idBase}-badge` : null,
        cost ? `${idBase}-cost` : null,
      ].filter(Boolean).join(' ')}
      tabIndex={tabIndex}
      data-code={code}
      data-state={state.kind}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className={classNames(
        'catalogue-card relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-sm border p-2 transition-colors',
        selected
          ? 'border-amber/60 bg-chrome'
          : 'border-rust/40 bg-chrome-2/80 hover:border-rust',
        wide && 'col-span-full'
      )}
    >
      <div className="flex gap-3">
        <img
          src={image}
          alt=""
          className={classNames(
            'h-18 w-18 shrink-0 rounded-sm border border-rust/50 bg-chrome object-cover',
            dimmed && 'opacity-60'
          )}
          loading="lazy"
          decoding="async"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            id={`${idBase}-name`}
            className={classNames(
              'm-0 line-clamp-2 text-body leading-snug',
              dimmed ? 'text-amber-dim' : 'text-amber'
            )}
          >
            {name}
          </h3>
          <p id={`${idBase}-amount`} className="m-0 font-mono text-meta text-amber-dim">
            {amount.kind === 'level' ? `Niv. ${amount.value}` : `× ${amount.value}`}
          </p>
          {extra}
          <CatalogueBadge id={`${idBase}-badge`} state={state} />
        </div>
      </div>
      {cost ? (
        <div id={`${idBase}-cost`}>
          <CostRow cost={cost} stock={stock} />
        </div>
      ) : null}
      {progress ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-chrome" aria-hidden>
          <div
            className="catalogue-card__progress h-full bg-amber"
            style={{ width: `${Math.min(100, Math.max(0, progress.elapsed * 100))}%` }}
          />
        </div>
      ) : null}
    </div>
  )
})

CatalogueCard.displayName = 'CatalogueCard'
