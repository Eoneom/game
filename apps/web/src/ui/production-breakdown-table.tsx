import React from 'react'
import classNames from 'classnames'

import type { City, Outpost } from '#types'
import { transformDecimals } from '#helpers/transform'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlasma } from '#ui/icon/plasma'
import { IconPlastic } from '#ui/icon/plastic'
import { IconWater } from '#ui/icon/water'

export type ProductionResource = 'plastic' | 'mushroom' | 'plasma' | 'water'

const RESOURCE_LABELS: Record<ProductionResource, string> = {
  plastic: 'Plastique',
  mushroom: 'Champignon',
  plasma: 'Plasma',
  water: 'Eau pure',
}

const RESOURCE_ICONS: Record<ProductionResource, React.ReactNode> = {
  plastic: <IconPlastic />,
  mushroom: <IconMushroom />,
  plasma: <IconPlasma />,
  water: <IconWater />,
}

/** Technology (or faction) production multiplier as a bonus, e.g. 1.15 → "+15 %"; "—" when neutral. */
export const formatTechnologyBonus = (multiplier: number): string => {
  const percent = Math.round((multiplier - 1) * 100)
  if (!percent) {
    return '—'
  }
  return `${percent > 0 ? '+' : ''}${percent} %`
}

const formatCoefficient = (value: number): string => `×${Math.round(value * 100) / 100}`

/** Hourly amount from a per-second rate, e.g. 0.5 → "1.8k". */
const formatHourly = (perSecond: number): string => transformDecimals(Math.round(perSecond * 3600))

export interface ProductionBreakdownRow {
  resource: ProductionResource
  /** Pre-terrain rate per second (`pre_cell_earnings_per_second`). */
  base: number
  /** Cell coefficient; plasma and water are fixed at ×1 until the map rework. */
  terrain: number
  /** Faction multiplier; undefined when not exposed (plasma, water) → "—". */
  faction?: number
  /** Technology multiplier; undefined when it never applies (water) → "—". */
  technology?: number
  /** Final rate per second (`earnings_per_second`). */
  current: number
}

/** City rows: plastic, mushroom, plasma, water (slice 041). */
export const cityProductionRows = (city: City): ProductionBreakdownRow[] => [
  {
    resource: 'plastic',
    base: city.pre_cell_earnings_per_second.plastic,
    terrain: city.cell_resource_coefficient.plastic,
    faction: city.faction_production_multiplier.plastic,
    technology: city.technology_production_multiplier.plastic,
    current: city.earnings_per_second.plastic,
  },
  {
    resource: 'mushroom',
    base: city.pre_cell_earnings_per_second.mushroom,
    terrain: city.cell_resource_coefficient.mushroom,
    faction: city.faction_production_multiplier.mushroom,
    technology: city.technology_production_multiplier.mushroom,
    current: city.earnings_per_second.mushroom,
  },
  {
    resource: 'plasma',
    base: city.pre_cell_earnings_per_second.plasma,
    terrain: 1,
    technology: city.technology_production_multiplier.plasma,
    current: city.earnings_per_second.plasma,
  },
  {
    resource: 'water',
    base: city.pre_cell_earnings_per_second.water,
    terrain: 1,
    current: city.earnings_per_second.water,
  },
]

/** Outpost rows: plastic, mushroom, plasma (no water at outposts, slice 035). */
export const outpostProductionRows = (outpost: Outpost): ProductionBreakdownRow[] => [
  {
    resource: 'plastic',
    base: outpost.pre_cell_earnings_per_second.plastic,
    terrain: outpost.cell_resource_coefficient.plastic,
    faction: outpost.faction_production_multiplier.plastic,
    technology: outpost.technology_production_multiplier.plastic,
    current: outpost.earnings_per_second.plastic,
  },
  {
    resource: 'mushroom',
    base: outpost.pre_cell_earnings_per_second.mushroom,
    terrain: outpost.cell_resource_coefficient.mushroom,
    faction: outpost.faction_production_multiplier.mushroom,
    technology: outpost.technology_production_multiplier.mushroom,
    current: outpost.earnings_per_second.mushroom,
  },
  {
    resource: 'plasma',
    base: outpost.pre_cell_earnings_per_second.plasma,
    terrain: 1,
    technology: outpost.technology_production_multiplier.plasma,
    current: outpost.earnings_per_second.plasma,
  },
]

interface Props {
  rows: ProductionBreakdownRow[]
  /** `production_energy_ratio` (cities); omitted for outposts, which hides the « Énergie » column. */
  energyRatio?: number
}

const headClass = 'px-3 py-2 text-right text-caption uppercase tracking-wider text-label'
const cellClass = 'px-3 py-2 text-right font-mono text-body tabular-nums'

/**
 * Per-hour production breakdown (slice 041): Actuelle = base × terrain × faction × techno × énergie.
 * Replaces the former production / terrain readout.
 */
export const ProductionBreakdownTable: React.FC<Props> = ({ rows, energyRatio }) => {
  const showEnergy = energyRatio !== undefined
  const energyPercent = showEnergy ? Math.round(energyRatio * 100) : 100
  const energyShort = showEnergy && energyRatio < 1

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse rounded-sm border border-rust/50">
        <thead>
          <tr className="border-b border-rust/40">
            <th scope="col" className="px-3 py-2 text-left text-caption uppercase tracking-wider text-label">Ressource</th>
            <th scope="col" className={headClass}>Base</th>
            <th scope="col" className={headClass}>Terrain</th>
            <th scope="col" className={headClass}>Faction</th>
            <th scope="col" className={headClass}>Techno</th>
            {showEnergy ? <th scope="col" className={headClass}>Énergie</th> : null}
            <th scope="col" className={headClass}>Actuelle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.resource} data-resource={row.resource} className="border-b border-rust/30 last:border-b-0">
              <th scope="row" className="px-3 py-2 text-left text-body font-normal text-amber-dim">
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-label">
                    {RESOURCE_ICONS[row.resource]}
                  </span>
                  {RESOURCE_LABELS[row.resource]}
                </span>
              </th>
              <td className={classNames(cellClass, 'text-amber-dim')}>{formatHourly(row.base)}</td>
              <td className={classNames(cellClass, 'text-label')}>{formatCoefficient(row.terrain)}</td>
              <td className={classNames(cellClass, 'text-label')}>
                {row.faction === undefined ? '—' : formatTechnologyBonus(row.faction)}
              </td>
              <td className={classNames(cellClass, 'text-terminal')}>
                {row.technology === undefined ? '—' : formatTechnologyBonus(row.technology)}
              </td>
              {showEnergy ? (
                <td className={classNames(cellClass, energyShort ? 'text-danger' : 'text-label')}>
                  {energyPercent} %
                </td>
              ) : null}
              <td className={classNames(cellClass, 'font-semibold text-amber')}>{formatHourly(row.current)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 text-meta text-amber-dim">
        Actuelle = base × terrain × faction × techno{showEnergy ? ' × énergie' : ''} (valeurs arrondies par le serveur).
      </p>
      {energyShort ? (
        <p className="m-0 text-meta text-danger">
          Production réduite à {energyPercent} % par manque d&apos;énergie.
        </p>
      ) : null}
    </div>
  )
}
