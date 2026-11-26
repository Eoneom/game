import React from 'react'
import classNames from 'classnames'

import { formatTime, transformDecimals } from '#helpers/transform'
import { IconPlastic } from '#ui/icon/plastic'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlasma } from '#ui/icon/plasma'
import { ResourceItem } from '#ui/resource-item'
import { IconDuration } from '#ui/icon/duration'
import { useGetCity } from '#city/hooks'

interface Props {
  cityId: string
  plastic: number
  mushroom: number
  plasma?: number
  duration: number
  action?: React.ReactNode
}

const CostResource: React.FC<{ short: boolean, icon: React.ReactNode, value: number }> = ({
  short,
  icon,
  value
}) => (
  <li
    className={classNames(
      'rounded-sm border px-2 py-1.5',
      short
        ? 'border-danger/60 bg-danger-deep/25'
        : 'border-terminal/40 bg-chrome/60'
    )}
  >
    <ResourceItem
      className={short ? 'danger' : 'success'}
      icon={icon}
      value={transformDecimals(value)}
    />
  </li>
)

export const Cost: React.FC<Props> = ({ cityId, plastic, mushroom, plasma = 0, duration, action }) => {
  const { data: city } = useGetCity(cityId)

  const plasticShort = plastic > (city?.plastic ?? 0)
  const mushroomShort = mushroom > (city?.mushroom ?? 0)
  const plasmaShort = plasma > (city?.plasma ?? 0)

  return (
    <div className="space-y-2">
      <h3 className="m-0 text-sm uppercase tracking-wider text-label">Coût</h3>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        <CostResource short={plasticShort} icon={<IconPlastic />} value={plastic} />
        <CostResource short={mushroomShort} icon={<IconMushroom />} value={mushroom} />
        {plasma > 0 ? (
          <CostResource short={plasmaShort} icon={<IconPlasma />} value={plasma} />
        ) : null}
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
