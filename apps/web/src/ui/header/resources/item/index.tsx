import { transformApproximateTimeUntilSeconds, transformDailyEarnings, transformDecimals, transformHourlyEarnings } from '#helpers/transform'
import { getEnergyDisplayStatus, getEnergyUsagePercent } from '#helpers/energy'
import { ResourceItem } from '#ui/resource-item'
import { Tooltip } from '#ui/tooltip'
import React from 'react'
import classNames from 'classnames'

interface Props {
  value: number
  icon: React.ReactNode
  warehouse_capacity?: number
  earnings_per_second?: number
  warehouse_full_in_seconds?: number
  secondary_value?: number
  energy_production?: number
}

export const HeaderResourcesItem: React.FC<Props> = ({
  value,
  warehouse_capacity,
  earnings_per_second,
  warehouse_full_in_seconds,
  secondary_value,
  energy_production,
  icon
}) => {
  const warnCapacity = 70 / 100
  const energyStatus = energy_production !== undefined
    ? getEnergyDisplayStatus(value, energy_production)
    : undefined
  const className = energyStatus !== undefined
    ? energyStatus === 'warn' ? undefined : energyStatus
    : warehouse_capacity !== undefined && value >= warehouse_capacity
      ? 'danger'
      : ''
  const displayValue = secondary_value !== undefined ? `${transformDecimals(value)} / ${transformDecimals(secondary_value)}` : transformDecimals(value)

  const resourceItem = (
    <ResourceItem
      className={className}
      icon={icon}
      value={displayValue}
    />
  )

  const hasWarehouse = warehouse_capacity !== undefined
  const hasEnergy = energy_production !== undefined
  const hasEarnings = earnings_per_second !== undefined

  const energyUsagePercent = hasEnergy ? getEnergyUsagePercent(value, energy_production) : 0
  const energyProgressClass = energyStatus === 'danger'
    ? '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger'
    : energyStatus === 'warn'
      ? '[&::-webkit-progress-value]:bg-amber [&::-moz-progress-bar]:bg-amber'
      : '[&::-webkit-progress-value]:bg-terminal [&::-moz-progress-bar]:bg-terminal'
  const energyTooltipContent = hasEnergy ? (
    <>
      {Math.round(energyUsagePercent)}%
      <br />
      {transformDecimals(value)} / {transformDecimals(energy_production)}
    </>
  ) : null

  const earningsTooltipContent = hasEarnings ? (
    <>
      {transformHourlyEarnings(earnings_per_second)}
      <br />
      {transformDailyEarnings(earnings_per_second)}
    </>
  ) : null

  const storageLevel = hasWarehouse ? Math.round((value / warehouse_capacity) * 100 * 100) / 100 : 0
  const progressWarn = hasWarehouse && value >= warehouse_capacity * warnCapacity
  const storageTooltipContent = hasWarehouse ? (
    <>
      {storageLevel}%
      <br />
      Max = {transformDecimals(warehouse_capacity)}
      {warehouse_full_in_seconds !== undefined && warehouse_full_in_seconds > 0 ? (
        <>
          <br />
          Plein dans {transformApproximateTimeUntilSeconds(warehouse_full_in_seconds)}
        </>
      ) : null}
    </>
  ) : null

  return (
    <li className="flex flex-col gap-1">
      {earningsTooltipContent ? (
        <Tooltip content={earningsTooltipContent} position="bottom">
          {resourceItem}
        </Tooltip>
      ) : (
        resourceItem
      )}
      {hasWarehouse && storageTooltipContent && (
        <Tooltip content={storageTooltipContent} position="bottom">
          <progress
            className={classNames(
              'h-1.5 w-full overflow-hidden rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-bar]:bg-chrome [&::-webkit-progress-value]:bg-amber [&::-moz-progress-bar]:bg-amber',
              progressWarn && '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger'
            )}
            value={value}
            max={warehouse_capacity}
          />
        </Tooltip>
      )}
      {hasEnergy && energyTooltipContent && (
        <Tooltip content={energyTooltipContent} position="bottom">
          <progress
            className={classNames(
              'h-1.5 w-full overflow-hidden rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-bar]:bg-chrome',
              energyProgressClass
            )}
            value={energyUsagePercent}
            max={100}
          />
        </Tooltip>
      )}
    </li>
  )
}
