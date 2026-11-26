import React from 'react'

import { transformHourlyEarnings } from '#helpers/transform'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'

const formatRate = (valuePerSecond: number): string => {
  const hourly = Math.round(valuePerSecond * 3600)
  if (!hourly) {
    return '~0/h'
  }
  return transformHourlyEarnings(valuePerSecond)
}

const formatTerrainCoeff = (value: number): string => {
  const rounded = Math.round(value * 100) / 100
  return `×${rounded}`
}

/** Technology production multiplier as a bonus, e.g. 1.15 → "+15 %"; "—" when neutral. */
export const formatTechnologyBonus = (multiplier: number): string => {
  const percent = Math.round((multiplier - 1) * 100)
  if (!percent) {
    return '—'
  }
  return `${percent > 0 ? '+' : ''}${percent} %`
}

interface Rates {
  plastic: number
  mushroom: number
}

interface Props {
  current: Rates
  base?: Rates
  terrain: Rates
  /** Économie technology multipliers (slice 027); adds a "Techno" column when set. */
  technology?: Rates
  lede?: string
}

const ResourceIcon: React.FC<{ kind: 'plastic' | 'mushroom' }> = ({ kind }) => (
  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-label">
    {kind === 'plastic' ? <IconPlastic /> : <IconMushroom />}
  </span>
)

export const ProductionTerrainReadout: React.FC<Props> = ({
  current,
  base,
  terrain,
  technology,
  lede = 'Débits par heure. Le terrain multiplie la production de base.',
}) => {
  const rows: Array<{
    kind: 'plastic' | 'mushroom'
    label: string
    currentRate: number
    baseRate?: number
    terrainCoeff: number
    technologyMultiplier?: number
  }> = [
    {
      kind: 'plastic',
      label: 'Plastique',
      currentRate: current.plastic,
      baseRate: base?.plastic,
      terrainCoeff: terrain.plastic,
      technologyMultiplier: technology?.plastic,
    },
    {
      kind: 'mushroom',
      label: 'Champignon',
      currentRate: current.mushroom,
      baseRate: base?.mushroom,
      terrainCoeff: terrain.mushroom,
      technologyMultiplier: technology?.mushroom,
    },
  ]

  const showBase = Boolean(base)
  const showTechnology = Boolean(technology)
  const gridCols = showBase && showTechnology
    ? 'grid-cols-[minmax(0,1.4fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)_minmax(3.5rem,0.7fr)_minmax(3.5rem,0.7fr)]'
    : showBase || showTechnology
      ? 'grid-cols-[minmax(0,1.4fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)_minmax(3.5rem,0.7fr)]'
      : 'grid-cols-[minmax(0,1.4fr)_minmax(4.5rem,1fr)_minmax(3.5rem,0.7fr)]'

  return (
    <div className="space-y-3">
      {lede ? <p className="m-0 text-xs text-amber-dim">{lede}</p> : null}

      <div className="overflow-hidden rounded-sm border border-rust/50 bg-chrome/40">
        <div
          className={`grid ${gridCols} gap-2 border-b border-rust/40 px-3 py-2 text-[0.65rem] uppercase tracking-wider text-label`}
        >
          <span>Ressource</span>
          <span className="text-right">Actuelle</span>
          {showBase ? <span className="text-right">Base</span> : null}
          <span className="text-right">Terrain</span>
          {showTechnology ? <span className="text-right">Techno</span> : null}
        </div>

        <ul className="m-0 list-none divide-y divide-rust/30 p-0">
          {rows.map(row => (
            <li
              key={row.kind}
              className={`grid ${gridCols} items-center gap-2 px-3 py-2.5`}
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-amber-dim">
                <ResourceIcon kind={row.kind} />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="text-right font-mono text-sm tabular-nums text-amber">
                {formatRate(row.currentRate)}
              </span>
              {showBase ? (
                <span className="text-right font-mono text-xs tabular-nums text-amber-dim">
                  {formatRate(row.baseRate ?? 0)}
                </span>
              ) : null}
              <span className="text-right font-mono text-sm tabular-nums text-label">
                {formatTerrainCoeff(row.terrainCoeff)}
              </span>
              {showTechnology ? (
                <span className="text-right font-mono text-sm tabular-nums text-terminal">
                  {formatTechnologyBonus(row.technologyMultiplier ?? 1)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
