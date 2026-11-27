import React from 'react'
import classNames from 'classnames'
import { OutpostType } from '@eoneom/api-client'

import { formatCompactDuration, transformDecimals, transformHourlyEarnings } from '#helpers/transform'
import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'
import { Button } from '#ui/button'
import { useResourcePanel } from '#ui/header/resources/context'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlasma } from '#ui/icon/plasma'
import { IconPlastic } from '#ui/icon/plastic'
import { IconWater } from '#ui/icon/water'
import type { City, Outpost } from '#types'
import { DashboardCard, queryCardState } from '#location/dashboard/card'

/** Fill from 90 % shows in danger (slice 042). */
const WAREHOUSE_DANGER_PERCENT = 90

interface StockRow {
  key: string
  label: string
  icon: React.ReactNode
  stock: number
  /** Rate per second; `null` → « — » (temporary outpost). */
  rate: number | null
  /** Fill percent; `null` for an unlimited resource (plasma, water). */
  fill: number | null
  /** Seconds until the warehouse is full; `null` → « — ». */
  fullInSeconds: number | null
}

/** Warehouse fill in percent, clamped to 0–100. */
const warehouseFillPercent = (capacity: number, stored: number): number => {
  if (capacity <= 0) return 0
  return Math.min(100, Math.max(0, (stored / capacity) * 100))
}

const fullInLabel = (row: StockRow): string => {
  if (row.fill === null) return '—'
  if (row.fill >= 100) return 'plein'
  if (!row.rate || row.rate <= 0 || row.fullInSeconds === null) return '—'
  return `~${formatCompactDuration(row.fullInSeconds)}`
}

const WarehouseBar: React.FC<{ label: string, fill: number | null }> = ({ label, fill }) => {
  if (fill === null) {
    return <span className="text-meta text-label">illimité</span>
  }
  const percent = Math.round(fill)
  return (
    <span className="flex items-center gap-2">
      <span
        role="progressbar"
        aria-label={`Entrepôt ${label.toLowerCase()}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 min-w-[4rem] flex-1 overflow-hidden rounded-sm bg-chrome"
      >
        <span
          className={classNames('block h-full', fill >= WAREHOUSE_DANGER_PERCENT ? 'bg-danger' : 'bg-amber')}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className={classNames('w-12 shrink-0 text-right font-mono text-meta tabular-nums', fill >= WAREHOUSE_DANGER_PERCENT ? 'text-danger' : 'text-amber-dim')}>
        {percent} %
      </span>
    </span>
  )
}

const StockTable: React.FC<{ rows: StockRow[] }> = ({ rows }) => (
  <table className="w-full border-collapse text-left">
    <thead>
      <tr className="text-caption uppercase tracking-wider text-label">
        <th scope="col" className="py-1 pr-2 font-medium"><span className="sr-only">Ressource</span></th>
        <th scope="col" className="px-2 py-1 text-right font-medium">Stock</th>
        <th scope="col" className="px-2 py-1 text-right font-medium">Production / h</th>
        <th scope="col" className="px-2 py-1 font-medium">Entrepôt</th>
        <th scope="col" className="py-1 pl-2 text-right font-medium">Plein dans</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(row => (
        <tr key={row.key} className="h-8 border-t border-rust/30">
          <th scope="row" className="py-1 pr-2 text-left text-meta font-normal text-label">
            <span className="flex items-center gap-1">{row.icon} {row.label}</span>
          </th>
          <td className="px-2 py-1 text-right font-mono text-body tabular-nums text-amber">{transformDecimals(row.stock)}</td>
          <td className="px-2 py-1 text-right font-mono text-meta tabular-nums text-amber-dim">
            {row.rate === null ? '—' : transformHourlyEarnings(row.rate)}
          </td>
          <td className="px-2 py-1"><WarehouseBar label={row.label} fill={row.fill} /></td>
          <td className="py-1 pl-2 text-right font-mono text-meta tabular-nums text-amber-dim">{fullInLabel(row)}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

const DetailButton: React.FC = () => {
  const { open } = useResourcePanel()
  return (
    <Button variant="ghost" className="py-1" onClick={open}>
      Détail de la production
    </Button>
  )
}

const cityRows = (city: City): StockRow[] => [
  {
    key: 'plastic',
    label: 'Plastique',
    icon: <IconPlastic />,
    stock: city.plastic,
    rate: city.earnings_per_second.plastic,
    fill: warehouseFillPercent(city.warehouses_capacity.plastic, city.warehouses_capacity.plastic - city.warehouse_space_remaining.plastic),
    fullInSeconds: city.warehouse_full_in_seconds.plastic,
  },
  {
    key: 'mushroom',
    label: 'Champignon',
    icon: <IconMushroom />,
    stock: city.mushroom,
    rate: city.earnings_per_second.mushroom,
    fill: warehouseFillPercent(city.warehouses_capacity.mushroom, city.warehouses_capacity.mushroom - city.warehouse_space_remaining.mushroom),
    fullInSeconds: city.warehouse_full_in_seconds.mushroom,
  },
  { key: 'plasma', label: 'Plasma', icon: <IconPlasma />, stock: city.plasma, rate: city.earnings_per_second.plasma, fill: null, fullInSeconds: null },
  { key: 'water', label: 'Eau pure', icon: <IconWater />, stock: city.water, rate: city.earnings_per_second.water, fill: null, fullInSeconds: null },
]

/** « Production et entrepôts » (slice 042): stocks, hourly rates, warehouse fill; the breakdown is in the header panel. */
export const CityProductionCard: React.FC<{ cityId: string }> = ({ cityId }) => {
  const query = useGetCity(cityId)
  const city = query.data?.id === cityId ? query.data : undefined

  return (
    <DashboardCard
      title="Production et entrepôts"
      to="/city/$cityId/base/building"
      params={{ cityId }}
      state={queryCardState({ data: city, isError: query.isError })}
      onRetry={() => void query.refetch()}
      action={<DetailButton />}
      className="col-span-2"
    >
      {city ? (
        <>
          <StockTable rows={cityRows(city)} />
          {city.production_energy_ratio < 1 ? (
            <p className="m-0 mt-2 text-meta text-danger">
              Production réduite à {Math.round(city.production_energy_ratio * 100)} % par manque d&apos;énergie.
            </p>
          ) : null}
        </>
      ) : null}
    </DashboardCard>
  )
}

const outpostRows = (outpost: Outpost): StockRow[] => {
  const permanent = outpost.type === OutpostType.PERMANENT
  return [
    {
      key: 'plastic',
      label: 'Plastique',
      icon: <IconPlastic />,
      stock: outpost.plastic,
      rate: permanent ? outpost.earnings_per_second.plastic : null,
      fill: warehouseFillPercent(outpost.warehouses_capacity.plastic, outpost.plastic),
      fullInSeconds: permanent ? outpost.warehouse_full_in_seconds.plastic : null,
    },
    {
      key: 'mushroom',
      label: 'Champignon',
      icon: <IconMushroom />,
      stock: outpost.mushroom,
      rate: permanent ? outpost.earnings_per_second.mushroom : null,
      fill: warehouseFillPercent(outpost.warehouses_capacity.mushroom, outpost.mushroom),
      fullInSeconds: permanent ? outpost.warehouse_full_in_seconds.mushroom : null,
    },
    {
      key: 'plasma',
      label: 'Plasma',
      icon: <IconPlasma />,
      stock: outpost.plasma,
      rate: permanent ? outpost.earnings_per_second.plasma : null,
      fill: null,
      fullInSeconds: null,
    },
  ]
}

/** « Stocks et production » of the outpost dashboard: production only once permanent. */
export const OutpostProductionCard: React.FC<{ outpostId: string }> = ({ outpostId }) => {
  const query = useGetOutpost(outpostId)
  const outpost = query.data?.id === outpostId ? query.data : undefined

  return (
    <DashboardCard
      title="Stocks et production"
      state={queryCardState({ data: outpost, isError: query.isError })}
      onRetry={() => void query.refetch()}
      action={<DetailButton />}
      className="col-span-2"
    >
      {outpost ? <StockTable rows={outpostRows(outpost)} /> : null}
    </DashboardCard>
  )
}
