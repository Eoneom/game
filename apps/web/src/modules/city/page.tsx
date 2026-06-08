import React from 'react'
import classNames from 'classnames'

import {
  formatCoordinates,
  transformDecimals,
  transformHourlyEarnings,
} from '#helpers/transform'
import { useGetCity } from '#city/hooks'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'
import { IconPlasma } from '#ui/icon/plasma'
import { ProductionTerrainReadout } from '#ui/production-terrain-readout'
import { EnergyReadout } from '#ui/energy-readout'

interface Props {
  cityId: string
}

const warehouseFillPercent = (capacity: number, spaceRemaining: number): number => {
  if (capacity <= 0) {
    return 0
  }
  const used = capacity - spaceRemaining
  return Math.min(100, Math.max(0, (used / capacity) * 100))
}

const Panel: React.FC<{ title: string; lede?: string; children: React.ReactNode }> = ({
  title,
  lede,
  children,
}) => (
  <article className="surface-chrome rounded-sm border border-rust/60 p-3">
    <h2 className="m-0 text-base tracking-wide text-amber">{title}</h2>
    {lede ? <p className="mt-1 text-xs text-amber-dim">{lede}</p> : null}
    <div className="mt-3 space-y-3">{children}</div>
  </article>
)

export const CityPage: React.FC<Props> = ({ cityId }) => {
  const { data: city } = useGetCity(cityId)

  if (!city || city.id !== cityId) {
    return <p className="text-amber-dim">Chargement…</p>
  }

  const plasticFill = warehouseFillPercent(
    city.warehouses_capacity.plastic,
    city.warehouse_space_remaining.plastic
  )
  const mushroomFill = warehouseFillPercent(
    city.warehouses_capacity.mushroom,
    city.warehouse_space_remaining.mushroom
  )

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rust/50 pb-3">
        <div>
          <h1 className="m-0 text-2xl tracking-wide text-amber">{city.name}</h1>
          <p className="m-0 mt-1 text-sm text-amber-dim">
            Tableau de bord de la colonie — stocks, production, terrain.
          </p>
        </div>
        <p className="m-0 font-mono text-sm text-label">
          {formatCoordinates(city.coordinates)}
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Disponibilité et stockage"
          lede="Stocks actuels, place libre et capacité maximale."
        >
          <ul className="m-0 list-none space-y-1 p-0 text-sm">
            <li className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-amber-dim">
                <IconPlastic /> Plastique
              </span>
              <span className="font-mono text-amber">{transformDecimals(city.plastic)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-amber-dim">
                <IconMushroom /> Champignon
              </span>
              <span className="font-mono text-amber">{transformDecimals(city.mushroom)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="flex items-center gap-1 text-amber-dim">
                <IconPlasma /> Plasma
              </span>
              <span className="font-mono text-amber">{transformDecimals(city.plasma)}</span>
            </li>
          </ul>

          <div className="space-y-2 border-t border-rust/50 pt-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-amber-dim">
                <span className="flex items-center gap-1">
                  <IconPlastic /> Entrepôt plastique
                </span>
                <span>
                  {transformDecimals(city.warehouse_space_remaining.plastic)} libre /{' '}
                  {transformDecimals(city.warehouses_capacity.plastic)}
                </span>
              </div>
              <progress
                value={plasticFill}
                max={100}
                className={classNames(
                  'h-2 w-full rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-value]:bg-amber [&::-moz-progress-bar]:bg-amber',
                  plasticFill >= 90 &&
                    '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger'
                )}
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-amber-dim">
                <span className="flex items-center gap-1">
                  <IconMushroom /> Entrepôt champignon
                </span>
                <span>
                  {transformDecimals(city.warehouse_space_remaining.mushroom)} libre /{' '}
                  {transformDecimals(city.warehouses_capacity.mushroom)}
                </span>
              </div>
              <progress
                value={mushroomFill}
                max={100}
                className={classNames(
                  'h-2 w-full rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-value]:bg-terminal [&::-moz-progress-bar]:bg-terminal',
                  mushroomFill >= 90 &&
                    '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger'
                )}
              />
            </div>
          </div>

          <p className="border-t border-rust/40 pt-3 text-xs text-amber-dim">
            Capacité de développement :{' '}
            <strong className="text-amber">{city.maximum_building_levels}</strong>
          </p>
        </Panel>

        <Panel title="Production, énergie et terrain">
          <ProductionTerrainReadout
            current={city.earnings_per_second}
            base={city.pre_cell_earnings_per_second}
            terrain={city.cell_resource_coefficient}
          />
          <p className="m-0 flex items-center justify-between gap-2 border-t border-rust/50 pt-3 text-sm">
            <span className="flex items-center gap-1 text-amber-dim">
              <IconPlasma /> Plasma
            </span>
            <span className="font-mono text-amber">
              {transformHourlyEarnings(city.earnings_per_second.plasma)}
            </span>
          </p>
          <div className="border-t border-rust/50 pt-3">
            <EnergyReadout
              consumption={city.energy_consumption}
              production={city.energy}
              baseProduction={city.neutral_photovoltaic_energy}
              photovoltaicOptimizationLevel={city.photovoltaic_optimization_level}
              solarCoefficient={city.cell_solar_coefficient}
              productionEnergyRatio={city.production_energy_ratio}
            />
          </div>
        </Panel>
      </div>
    </section>
  )
}
