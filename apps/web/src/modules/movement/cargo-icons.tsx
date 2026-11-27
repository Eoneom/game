import React from 'react'
import type { Resource } from '@eoneom/api-client'

import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'
import { IconPlasma } from '#ui/icon/plasma'
import { IconWater } from '#ui/icon/water'
import { formatCargo } from '#movement/cargo'

const ENTRIES: { key: keyof Resource; label: string; icon: React.ReactNode }[] = [
  { key: 'plastic', label: 'plastique', icon: <IconPlastic /> },
  { key: 'mushroom', label: 'champignon', icon: <IconMushroom /> },
  { key: 'plasma', label: 'plasma', icon: <IconPlasma /> },
  { key: 'water', label: 'eau pure', icon: <IconWater /> },
]

/** Cargo with resource icons (slice 045); « — » when the movement carries nothing. */
export const CargoIcons: React.FC<{ resources: Resource }> = ({ resources }) => {
  const carried = ENTRIES.filter(entry => resources[entry.key] > 0)
  if (!carried.length) {
    return <span className="text-label">—</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5" title={formatCargo(resources)}>
      {carried.map(entry => (
        <span key={entry.key} className="inline-flex items-center gap-0.5 tabular-nums">
          {entry.icon}
          <span className="sr-only">{entry.label}</span>
          {resources[entry.key]}
        </span>
      ))}
    </span>
  )
}
