import React, { useMemo } from 'react'
import classNames from 'classnames'

import {
  formatCoordinates,
  formatDate,
  transformDecimals,
  transformHourlyEarnings,
} from '#helpers/transform'
import type {
  AdminSystemPlayerStatsSnapshot,
  Resource,
  WarehouseCapacity,
} from '@eoneom/api-client'
import { BuildingCode, TechnologyCode } from '@eoneom/api-client'

import {
  RESOURCE_LABEL,
  translateBuildingCode,
  translateOutpostType,
  translateTechnologyCode,
} from './labels'

type Props = {
  snapshots: AdminSystemPlayerStatsSnapshot[]
  name_filter: string
  is_loading: boolean
}

function formatResourceLine(resources: Resource): string {
  return [
    `${RESOURCE_LABEL.plastic} ${transformDecimals(resources.plastic)}`,
    `${RESOURCE_LABEL.mushroom} ${transformDecimals(resources.mushroom)}`,
    `${RESOURCE_LABEL.plasma} ${transformDecimals(resources.plasma)}`,
  ].join(' · ')
}

function formatProductionLine(earnings_per_second: Resource): string {
  return [
    `${RESOURCE_LABEL.plastic} ${transformHourlyEarnings(earnings_per_second.plastic)}`,
    `${RESOURCE_LABEL.mushroom} ${transformHourlyEarnings(earnings_per_second.mushroom)}`,
    `${RESOURCE_LABEL.plasma} ${transformHourlyEarnings(earnings_per_second.plasma)}`,
  ].join(' · ')
}

const warehouseFillPercent = (capacity: number, space_remaining: number): number => {
  if (capacity <= 0) {
    return 0
  }
  const used = capacity - space_remaining
  return Math.min(100, Math.max(0, (used / capacity) * 100))
}

function WarehouseStockBars({
  resources,
  warehouses_capacity,
  warehouse_space_remaining,
}: {
  resources: Resource
  warehouses_capacity: WarehouseCapacity
  warehouse_space_remaining: WarehouseCapacity
}): React.ReactElement {
  const plastic_fill = warehouseFillPercent(
    warehouses_capacity.plastic,
    warehouse_space_remaining.plastic
  )
  const mushroom_fill = warehouseFillPercent(
    warehouses_capacity.mushroom,
    warehouse_space_remaining.mushroom
  )

  return (
    <div className="mt-1 space-y-1.5">
      <div>
        <div className="mb-0.5 flex justify-between text-[11px] text-amber-dim">
          <span>{RESOURCE_LABEL.plastic}</span>
          <span>
            {transformDecimals(resources.plastic)} / {transformDecimals(warehouses_capacity.plastic)}
          </span>
        </div>
        <progress
          value={plastic_fill}
          max={100}
          className={classNames(
            'h-1.5 w-full rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-value]:bg-amber [&::-moz-progress-bar]:bg-amber',
            plastic_fill >= 90 &&
              '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger'
          )}
        />
      </div>
      <div>
        <div className="mb-0.5 flex justify-between text-[11px] text-amber-dim">
          <span>{RESOURCE_LABEL.mushroom}</span>
          <span>
            {transformDecimals(resources.mushroom)} / {transformDecimals(warehouses_capacity.mushroom)}
          </span>
        </div>
        <progress
          value={mushroom_fill}
          max={100}
          className={classNames(
            'h-1.5 w-full rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-value]:bg-terminal [&::-moz-progress-bar]:bg-terminal',
            mushroom_fill >= 90 &&
              '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger'
          )}
        />
      </div>
    </div>
  )
}

function formatEnergyLine({
  energy,
  energy_consumption,
  production_energy_ratio,
}: {
  energy: number
  energy_consumption: number
  production_energy_ratio: number
}): string {
  const ratio_percent = Math.round(production_energy_ratio * 100)
  return `Énergie ${transformDecimals(energy)} / ${transformDecimals(energy_consumption)} (${ratio_percent} % prod.)`
}

export const SystemPlayerStatsPanel: React.FC<Props> = ({
  snapshots,
  name_filter,
  is_loading,
}) => {
  const visible = useMemo(() => {
    if (!name_filter) {
      return snapshots
    }
    return snapshots.filter(snapshot => snapshot.player_name === name_filter)
  }, [ snapshots, name_filter ])

  if (is_loading && visible.length === 0) {
    return (
      <p className="text-sm text-amber-dim">Chargement des statistiques…</p>
    )
  }

  if (visible.length === 0) {
    return (
      <p className="text-sm text-amber-dim">Aucun joueur système à afficher.</p>
    )
  }

  return (
    <div className="space-y-3">
      {visible.map(snapshot => (
        <article
          key={snapshot.player_id}
          className="rounded-sm border border-rust/40 bg-chrome/30 p-3"
        >
          <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-rust/30 pb-2">
            <h2 className="m-0 text-base text-amber">{snapshot.player_name}</h2>
            <time className="text-xs text-amber-dim" dateTime={String(snapshot.updated_at)}>
              Mis à jour {formatDate(snapshot.updated_at)}
            </time>
          </header>

          <div className="grid gap-3 md:grid-cols-2">
            <section>
              <h3 className="m-0 mb-1 text-xs uppercase tracking-wider text-amber-dim">
                Villes ({snapshot.cities.length})
              </h3>
              <ul className="m-0 list-none space-y-1 p-0 text-sm text-amber">
                {snapshot.cities.map(city => (
                  <li key={city.id}>
                    {city.name}
                    <span className="text-amber-dim">
                      {' '}
                      — {formatCoordinates(city.coordinates)}
                    </span>
                    <span className="block text-xs text-amber-dim">
                      Stock : {formatResourceLine(city.resources)}
                    </span>
                    <span className="block text-xs text-amber-dim">
                      Prod. : {formatProductionLine(city.earnings_per_second)}
                    </span>
                    <span className="block text-xs text-amber-dim">
                      {formatEnergyLine(city)}
                    </span>
                    <WarehouseStockBars
                      resources={city.resources}
                      warehouses_capacity={city.warehouses_capacity}
                      warehouse_space_remaining={city.warehouse_space_remaining}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="m-0 mb-1 text-xs uppercase tracking-wider text-amber-dim">
                Avant-postes ({snapshot.outposts.length})
              </h3>
              {snapshot.outposts.length === 0 ? (
                <p className="m-0 text-sm text-amber-dim">Aucun</p>
              ) : (
                <ul className="m-0 list-none space-y-1 p-0 text-sm text-amber">
                  {snapshot.outposts.map(outpost => (
                    <li key={outpost.id}>
                      {translateOutpostType(outpost.type)}
                      <span className="text-amber-dim">
                        {' '}
                        — {formatCoordinates(outpost.coordinates)}
                      </span>
                      <span className="block text-xs text-amber-dim">
                        Stock : {formatResourceLine(outpost.resources)}
                      </span>
                      {(outpost.earnings_per_second.plastic > 0
                        || outpost.earnings_per_second.mushroom > 0
                        || outpost.earnings_per_second.plasma > 0) && (
                        <span className="block text-xs text-amber-dim">
                          Prod. : {formatProductionLine(outpost.earnings_per_second)}
                        </span>
                      )}
                      {outpost.warehouses_capacity.plastic > 0 && (
                        <WarehouseStockBars
                          resources={outpost.resources}
                          warehouses_capacity={outpost.warehouses_capacity}
                          warehouse_space_remaining={outpost.warehouse_space_remaining}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="m-0 mb-1 text-xs uppercase tracking-wider text-amber-dim">
                Technologies
              </h3>
              <ul className="m-0 list-none space-y-1 p-0 text-sm text-amber">
                {snapshot.technologies.map(tech => (
                  <li key={tech.code}>
                    {translateTechnologyCode(tech.code as TechnologyCode)}
                    <span className="text-amber-dim"> — niveau {tech.level}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="md:col-span-2">
              <h3 className="m-0 mb-1 text-xs uppercase tracking-wider text-amber-dim">
                Bâtiments par ville
              </h3>
              <div className="space-y-2">
                {snapshot.buildings_by_city.map(city_buildings => (
                  <div key={city_buildings.city_id} className="rounded-sm border border-rust/25 p-2">
                    <p className="m-0 mb-1 text-sm font-medium text-amber">{city_buildings.city_name}</p>
                    <ul className="m-0 grid list-none gap-1 p-0 text-sm text-amber sm:grid-cols-2">
                      {city_buildings.buildings.map(building => (
                        <li key={`${city_buildings.city_id}-${building.code}`}>
                          {translateBuildingCode(building.code as BuildingCode)}
                          <span className="text-amber-dim"> — niv. {building.level}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </article>
      ))}
    </div>
  )
}
