import { transformApproximateTimeUntilSeconds, transformDailyEarnings, transformDecimals, transformHourlyEarnings } from '#helpers/transform'
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
}

export const HeaderResourcesItem: React.FC<Props> = ({ value, warehouse_capacity, earnings_per_second, warehouse_full_in_seconds, icon }) => {
  const warnCapacity = 70 / 100
  const className = warehouse_capacity !== undefined && value >= warehouse_capacity ? 'danger' : ''

  const resourceItem = (
    <ResourceItem
      className={className}
      icon={icon}
      value={transformDecimals(value)}
    />
  )

  const hasWarehouse = warehouse_capacity !== undefined
  const hasEarnings = earnings_per_second !== undefined

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
    </li>
  )
}
