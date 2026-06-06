import React from 'react'
import classNames from 'classnames'

import { formatTime, transformDecimals } from '#helpers/transform'
import { IconPlastic } from '#ui/icon/plastic'
import { IconMushroom } from '#ui/icon/mushroom'
import { ResourceItem } from '#ui/resource-item'
import { IconDuration } from '#ui/icon/duration'
import { useGetCity } from '#city/hooks'

interface Props {
  cityId: string
  plastic: number
  mushroom: number
  duration: number
  action?: React.ReactNode
}

export const Cost: React.FC<Props> = ({ cityId, plastic, mushroom, duration, action }) => {
  const { data: city } = useGetCity(cityId)

  const plasticShort = plastic > (city?.plastic ?? 0)
  const mushroomShort = mushroom > (city?.mushroom ?? 0)

  return (
    <div className="space-y-2">
      <h3 className="m-0 text-sm uppercase tracking-wider text-label">Coût</h3>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        <li
          className={classNames(
            'rounded-sm border px-2 py-1.5',
            plasticShort
              ? 'border-danger/60 bg-danger-deep/25'
              : 'border-terminal/40 bg-chrome/60'
          )}
        >
          <ResourceItem
            className={plasticShort ? 'danger' : 'success'}
            icon={<IconPlastic />}
            value={transformDecimals(plastic)}
          />
        </li>
        <li
          className={classNames(
            'rounded-sm border px-2 py-1.5',
            mushroomShort
              ? 'border-danger/60 bg-danger-deep/25'
              : 'border-terminal/40 bg-chrome/60'
          )}
        >
          <ResourceItem
            className={mushroomShort ? 'danger' : 'success'}
            icon={<IconMushroom />}
            value={transformDecimals(mushroom)}
          />
        </li>
        <li className="rounded-sm border border-rust/50 bg-chrome/60 px-2 py-1.5">
          <ResourceItem
            icon={<IconDuration />}
            value={formatTime(duration)}
          />
        </li>
      </ul>
      {action}
    </div>
  )
}
