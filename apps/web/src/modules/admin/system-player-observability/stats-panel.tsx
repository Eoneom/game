import React, { useMemo } from 'react'

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

function formatWarehouseLine({
  warehouses_capacity,
  warehouse_space_remaining,
}: {
  warehouses_capacity: WarehouseCapacity
  warehouse_space_remaining: WarehouseCapacity
}): string {
  return [
    `${RESOURCE_LABEL.plastic} ${transformDecimals(warehouse_space_remaining.plastic)} / ${transformDecimals(warehouses_capacity.plastic)}`,
    `${RESOURCE_LABEL.mushroom} ${transformDecimals(warehouse_space_remaining.mushroom)} / ${transformDecimals(warehouses_capacity.mushroom)}`,
  ].join(' · ')
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
                    <span className="block text-xs text-amber-dim">
                      Entrepôts (libre / cap.) : {formatWarehouseLine(city)}
                    </span>
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
                        <span className="block text-xs text-amber-dim">
                          Entrepôts (libre / cap.) : {formatWarehouseLine(outpost)}
                        </span>
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
