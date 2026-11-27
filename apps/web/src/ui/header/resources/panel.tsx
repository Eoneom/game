import React from 'react'
import classNames from 'classnames'
import { OutpostType } from '@eoneom/api-client'

import type { City, Outpost } from '#types'
import { transformApproximateTimeUntilSeconds, transformHourlyEarnings } from '#helpers/transform'
import { Button } from '#ui/button'
import { EnergyReadout } from '#ui/energy-readout'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlasma } from '#ui/icon/plasma'
import { IconPlastic } from '#ui/icon/plastic'
import { IconWater } from '#ui/icon/water'
import {
  cityProductionRows,
  outpostProductionRows,
  ProductionBreakdownTable,
} from '#ui/production-breakdown-table'
import { formatExactAmount, WAREHOUSE_WARN_RATIO } from '#ui/header/resources/item'

export const RESOURCE_PANEL_ID = 'resource-panel'

interface StockRow {
  name: string
  icon: React.ReactNode
  stock: number
  /** Warehouse capacity; undefined for unlimited storage (plasma, water). */
  capacity?: number
  /** Undefined when the location produces nothing (temporary outpost). */
  earningsPerSecond?: number
  warehouseFullInSeconds?: number
}

const headClass = 'px-3 py-2 text-right text-caption uppercase tracking-wider text-label'
const cellClass = 'px-3 py-2 text-right font-mono text-body tabular-nums'

const FillCell: React.FC<{ stock: number, capacity: number, name: string }> = ({ stock, capacity, name }) => {
  const percent = capacity > 0 ? Math.min(100, Math.max(0, Math.round((stock / capacity) * 100))) : 0
  const danger = capacity > 0 && stock >= capacity * WAREHOUSE_WARN_RATIO
  return (
    <span className="flex items-center justify-end gap-2">
      <span
        role="progressbar"
        aria-label={`Remplissage ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent} %`}
        className="h-2 w-24 overflow-hidden rounded-sm bg-chrome"
      >
        <span className={classNames('block h-full', danger ? 'bg-danger' : 'bg-amber')} style={{ width: `${percent}%` }} />
      </span>
      <span className={classNames('w-12 text-right', danger ? 'text-danger' : 'text-amber')}>{percent} %</span>
    </span>
  )
}

const fullIn = (row: StockRow): string => {
  if (row.capacity === undefined) return '—'
  if (row.stock >= row.capacity) return 'plein'
  if (!row.earningsPerSecond || !row.warehouseFullInSeconds) return '—'
  return transformApproximateTimeUntilSeconds(row.warehouseFullInSeconds)
}

const StockTable: React.FC<{ rows: StockRow[] }> = ({ rows }) => (
  <table className="w-full border-collapse rounded-sm border border-rust/50">
    <thead>
      <tr className="border-b border-rust/40">
        <th scope="col" className="px-3 py-2 text-left text-caption uppercase tracking-wider text-label">Ressource</th>
        <th scope="col" className={headClass}>Stock</th>
        <th scope="col" className={headClass}>Capacité</th>
        <th scope="col" className={headClass}>Remplissage</th>
        <th scope="col" className={headClass}>Plein dans</th>
        <th scope="col" className={headClass}>Production / h</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(row => (
        <tr key={row.name} className="border-b border-rust/30 last:border-b-0">
          <th scope="row" className="px-3 py-2 text-left text-body font-normal text-amber-dim">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-label">{row.icon}</span>
              {row.name}
            </span>
          </th>
          <td className={classNames(cellClass, 'text-amber')}>{formatExactAmount(row.stock)}</td>
          <td className={classNames(cellClass, 'text-amber-dim')}>
            {row.capacity === undefined ? <span className="font-display text-meta text-label">illimitée</span> : formatExactAmount(row.capacity)}
          </td>
          <td className={cellClass}>
            {row.capacity === undefined ? <span className="text-label">—</span> : <FillCell stock={row.stock} capacity={row.capacity} name={row.name} />}
          </td>
          <td className={classNames(cellClass, row.capacity !== undefined && row.stock >= row.capacity ? 'text-danger' : 'text-amber-dim')}>
            {fullIn(row)}
          </td>
          <td className={classNames(cellClass, 'text-amber')}>
            {row.earningsPerSecond === undefined ? '—' : transformHourlyEarnings(row.earningsPerSecond)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)

const sectionTitleClass = 'm-0 mb-2 text-caption uppercase tracking-wider text-label'

const cityStockRows = (city: City): StockRow[] => [
  {
    name: 'Plastique',
    icon: <IconPlastic />,
    stock: city.plastic,
    capacity: city.warehouses_capacity.plastic,
    earningsPerSecond: city.earnings_per_second.plastic,
    warehouseFullInSeconds: city.warehouse_full_in_seconds.plastic,
  },
  {
    name: 'Champignon',
    icon: <IconMushroom />,
    stock: city.mushroom,
    capacity: city.warehouses_capacity.mushroom,
    earningsPerSecond: city.earnings_per_second.mushroom,
    warehouseFullInSeconds: city.warehouse_full_in_seconds.mushroom,
  },
  {
    name: 'Plasma',
    icon: <IconPlasma />,
    stock: city.plasma,
    earningsPerSecond: city.earnings_per_second.plasma,
  },
  {
    name: 'Eau pure',
    icon: <IconWater />,
    stock: city.water,
    earningsPerSecond: city.earnings_per_second.water,
  },
]

const outpostStockRows = (outpost: Outpost, producing: boolean): StockRow[] => [
  {
    name: 'Plastique',
    icon: <IconPlastic />,
    stock: outpost.plastic,
    capacity: outpost.warehouses_capacity.plastic,
    earningsPerSecond: producing ? outpost.earnings_per_second.plastic : undefined,
    warehouseFullInSeconds: producing ? outpost.warehouse_full_in_seconds.plastic : undefined,
  },
  {
    name: 'Champignon',
    icon: <IconMushroom />,
    stock: outpost.mushroom,
    capacity: outpost.warehouses_capacity.mushroom,
    earningsPerSecond: producing ? outpost.earnings_per_second.mushroom : undefined,
    warehouseFullInSeconds: producing ? outpost.warehouse_full_in_seconds.mushroom : undefined,
  },
  {
    name: 'Plasma',
    icon: <IconPlasma />,
    stock: outpost.plasma,
    earningsPerSecond: producing ? outpost.earnings_per_second.plasma : undefined,
  },
]

interface Props {
  city: City | null
  outpost: Outpost | null
  onClose: () => void
}

/**
 * Header resource panel (slice 041): non-modal disclosure under the compact resource button.
 * Stocks and warehouses, per-hour production breakdown, and the city energy readout.
 */
export const HeaderResourcePanel = React.forwardRef<HTMLDivElement, Props>(({ city, outpost, onClose }, ref) => {
  const titleId = `${RESOURCE_PANEL_ID}-title`
  const temporary = !city && outpost?.type === OutpostType.TEMPORARY

  return (
    <div
      ref={ref}
      id={RESOURCE_PANEL_ID}
      role="region"
      aria-labelledby={titleId}
      className="surface-panel absolute right-0 top-full z-30 mt-2 w-[760px] space-y-4 p-4 text-left shadow-[0_8px_24px_rgba(0,0,0,.45)]"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="m-0 text-heading text-amber">Ressources</h2>
        <Button variant="ghost" className="py-1" onClick={onClose}>Fermer</Button>
      </div>

      <section aria-labelledby={`${RESOURCE_PANEL_ID}-stocks`}>
        <h3 id={`${RESOURCE_PANEL_ID}-stocks`} className={sectionTitleClass}>Stocks et entrepôts</h3>
        {city ? <StockTable rows={cityStockRows(city)} /> : null}
        {!city && outpost ? <StockTable rows={outpostStockRows(outpost, !temporary)} /> : null}
        {temporary ? (
          <p className="m-0 mt-2 text-meta text-amber-dim">
            Avant-poste temporaire : aucune production. Rendez-le permanent pour produire.
          </p>
        ) : null}
      </section>

      {city || (outpost && !temporary) ? (
        <section aria-labelledby={`${RESOURCE_PANEL_ID}-production`}>
          <h3 id={`${RESOURCE_PANEL_ID}-production`} className={sectionTitleClass}>Détail de la production (par heure)</h3>
          {city ? (
            <ProductionBreakdownTable rows={cityProductionRows(city)} energyRatio={city.production_energy_ratio} />
          ) : outpost ? (
            <ProductionBreakdownTable rows={outpostProductionRows(outpost)} />
          ) : null}
        </section>
      ) : null}

      {city ? (
        <section aria-labelledby={`${RESOURCE_PANEL_ID}-energy`}>
          <h3 id={`${RESOURCE_PANEL_ID}-energy`} className={sectionTitleClass}>Énergie</h3>
          <EnergyReadout
            consumption={city.energy_consumption}
            production={city.energy}
            baseProduction={city.neutral_photovoltaic_energy}
            photovoltaicOptimizationLevel={city.photovoltaic_optimization_level}
            solarCoefficient={city.cell_solar_coefficient}
            lede=""
          />
        </section>
      ) : null}
    </div>
  )
})

HeaderResourcePanel.displayName = 'HeaderResourcePanel'
