import React, { useMemo } from 'react'
import classNames from 'classnames'

import {
  formatCoordinates,
  formatDate,
  transformDecimals,
  transformHourlyEarnings,
} from '#helpers/transform'
import type {
  AdminSystemPlayerCitySummary,
  AdminSystemPlayerPendingRecruitment,
  AdminSystemPlayerStatsSnapshot,
  AdminSystemPlayerTroopCount,
  Resource,
  WarehouseCapacity,
} from '@eoneom/api-client'
import { BuildingCode, TechnologyCode, TroopCode } from '@eoneom/api-client'
import { EnergyReadout } from '#ui/energy-readout'
import { CountdownProgress } from '#ui/countdown-progress'
import { useCountdownProgress } from '#hook/countdown-progress'

import {
  RESOURCE_LABEL,
  translateBuildingCode,
  translateOutpostType,
  translateTechnologyCode,
  translateTroopCode,
} from './labels'

type Props = {
  snapshots: AdminSystemPlayerStatsSnapshot[]
  name_filter: string
  is_loading: boolean
}

function formatProductionLine(earnings_per_second: Resource): string {
  return [
    `${RESOURCE_LABEL.plastic} ${transformHourlyEarnings(earnings_per_second.plastic)}`,
    `${RESOURCE_LABEL.mushroom} ${transformHourlyEarnings(earnings_per_second.mushroom)}`,
    `${RESOURCE_LABEL.plasma} ${transformHourlyEarnings(earnings_per_second.plasma)}`,
  ].join(' · ')
}

function formatTroopsLine(troops: AdminSystemPlayerTroopCount[]): string | null {
  const present = troops.filter(troop => troop.count > 0)
  if (present.length === 0) {
    return null
  }
  return present
    .map(troop => `${translateTroopCode(troop.code as TroopCode)} ×${troop.count}`)
    .join(' · ')
}

const CityPendingRecruitment: React.FC<{
  pending: AdminSystemPlayerPendingRecruitment
}> = ({ pending }) => {
  const { remainingSeconds, elapsedProgress } = useCountdownProgress({
    endAt: pending.finish_at,
    onDone: () => undefined,
  })

  return (
    <div className="text-xs text-amber-dim">
      <p className="m-0">
        Recrutement : {pending.remaining_count}{' '}
        {translateTroopCode(pending.troop_code as TroopCode)}
      </p>
      <CountdownProgress
        summary={<>Fin dans {remainingSeconds} s</>}
        elapsedProgress={elapsedProgress}
        remainingSeconds={remainingSeconds}
      />
    </div>
  )
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
    <div className="space-y-1.5">
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

function CityStatsSection({
  city,
  buildings,
}: {
  city: AdminSystemPlayerCitySummary
  buildings: { code: BuildingCode, level: number }[]
}): React.ReactElement {
  const troops_line = formatTroopsLine(city.troops)

  return (
    <section className="rounded-sm border border-rust/35 bg-chrome/20 p-2.5">
      <header className="mb-2 border-b border-rust/25 pb-2">
        <h4 className="m-0 text-sm font-medium text-amber">
          {city.name}
          <span className="font-normal text-amber-dim"> — {formatCoordinates(city.coordinates)}</span>
        </h4>
        <p className="m-0 mt-1 text-xs text-amber-dim">
          Prod. : {formatProductionLine(city.earnings_per_second)}
        </p>
      </header>

      <div className="space-y-2">
        <EnergyReadout
          consumption={city.energy_consumption}
          production={city.energy}
          productionEnergyRatio={city.production_energy_ratio}
          lede=""
        />
        <WarehouseStockBars
          resources={city.resources}
          warehouses_capacity={city.warehouses_capacity}
          warehouse_space_remaining={city.warehouse_space_remaining}
        />
        {troops_line && (
          <p className="m-0 text-xs text-amber-dim">Troupes : {troops_line}</p>
        )}
        {city.pending_recruitment && (
          <CityPendingRecruitment pending={city.pending_recruitment} />
        )}
        <div>
          <h5 className="m-0 mb-1 text-[10px] uppercase tracking-wider text-amber-dim">Bâtiments</h5>
          <ul className="m-0 grid list-none gap-0.5 p-0 text-xs text-amber sm:grid-cols-2">
            {buildings.map(building => (
              <li key={`${city.id}-${building.code}`}>
                {translateBuildingCode(building.code)}
                <span className="text-amber-dim"> — niv. {building.level}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
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
      {visible.map(snapshot => {
        const buildings_by_city_id = new Map(
          snapshot.buildings_by_city.map(row => [ row.city_id, row.buildings ])
        )

        return (
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

            <div className="space-y-3">
              <div className="space-y-2">
                <h3 className="m-0 text-xs uppercase tracking-wider text-amber-dim">
                  Colonies ({snapshot.cities.length})
                </h3>
                {snapshot.cities.map(city => (
                  <CityStatsSection
                    key={city.id}
                    city={city}
                    buildings={buildings_by_city_id.get(city.id) ?? []}
                  />
                ))}
              </div>

              {snapshot.outposts.length > 0 && (
                <section>
                  <h3 className="m-0 mb-1 text-xs uppercase tracking-wider text-amber-dim">
                    Avant-postes ({snapshot.outposts.length})
                  </h3>
                  <ul className="m-0 list-none space-y-2 p-0">
                    {snapshot.outposts.map(outpost => {
                      const troops_line = formatTroopsLine(outpost.troops)
                      return (
                        <li
                          key={outpost.id}
                          className="rounded-sm border border-rust/25 bg-chrome/15 p-2 text-sm text-amber"
                        >
                          {translateOutpostType(outpost.type)}
                          <span className="text-amber-dim"> — {formatCoordinates(outpost.coordinates)}</span>
                          {(outpost.earnings_per_second.plastic > 0
                            || outpost.earnings_per_second.mushroom > 0
                            || outpost.earnings_per_second.plasma > 0) && (
                            <p className="m-0 mt-1 text-xs text-amber-dim">
                              Prod. : {formatProductionLine(outpost.earnings_per_second)}
                            </p>
                          )}
                          {outpost.warehouses_capacity.plastic > 0 && (
                            <WarehouseStockBars
                              resources={outpost.resources}
                              warehouses_capacity={outpost.warehouses_capacity}
                              warehouse_space_remaining={outpost.warehouse_space_remaining}
                            />
                          )}
                          {troops_line && (
                            <p className="m-0 mt-1 text-xs text-amber-dim">Troupes : {troops_line}</p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="m-0 mb-1 text-xs uppercase tracking-wider text-amber-dim">Technologies</h3>
                <ul className="m-0 list-none space-y-0.5 p-0 text-sm text-amber">
                  {snapshot.technologies.map(tech => (
                    <li key={tech.code}>
                      {translateTechnologyCode(tech.code as TechnologyCode)}
                      <span className="text-amber-dim"> — niveau {tech.level}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </article>
        )
      })}
    </div>
  )
}
