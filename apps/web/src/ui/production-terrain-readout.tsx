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

interface Rates {
  plastic: number
  mushroom: number
}

interface Props {
  current: Rates
  base?: Rates
  terrain: Rates
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
  lede = 'Débits par heure. Le terrain multiplie la production de base.',
}) => {
  const rows: Array<{
    kind: 'plastic' | 'mushroom'
    label: string
    currentRate: number
    baseRate?: number
    terrainCoeff: number
  }> = [
    {
      kind: 'plastic',
      label: 'Plastique',
      currentRate: current.plastic,
      baseRate: base?.plastic,
      terrainCoeff: terrain.plastic,
    },
    {
      kind: 'mushroom',
      label: 'Champignon',
      currentRate: current.mushroom,
      baseRate: base?.mushroom,
      terrainCoeff: terrain.mushroom,
    },
  ]

  const showBase = Boolean(base)
  const gridCols = showBase
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
