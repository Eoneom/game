import React, { useMemo } from 'react'
import { DefenseCode } from '@eoneom/api-client'

import { DefenseTranslations } from '#defense/translations'
import { defenseImageSrc } from '#defense/image'
import { useCityDefenses } from '#defense/hooks'
import { List } from '#ui/list'
import { ListItem } from '#ui/list/item'

interface Props {
  cityId: string
  selectedCode: DefenseCode | null
  onSelect: (code: DefenseCode) => void
  inProgress: React.ReactNode
}

export const DefenseList: React.FC<Props> = ({ cityId, selectedCode, onSelect, inProgress }) => {
  const { data } = useCityDefenses(cityId)
  const defenses = useMemo(() => data?.defenses ?? [], [data])
  const building = data?.ongoing_build?.defense_code

  const items = useMemo(() => defenses.map(defense => (
    <ListItem
      key={defense.code}
      active={defense.code === selectedCode}
      name={DefenseTranslations[defense.code].name}
      image={{
        src: defenseImageSrc(defense.code),
        alt: DefenseTranslations[defense.code].name,
      }}
      badge={defense.code === building ? 'En cours' : undefined}
      busy={defense.code === building}
      onSelect={() => onSelect(defense.code)}
    >
      <p className="m-0 text-xs text-amber-dim">× {defense.count}</p>
      <p className="m-0 text-[11px] text-label">
        ATK {defense.attack} / VIE {defense.life} · {defense.points} pt{defense.points > 1 ? 's' : ''}
      </p>
    </ListItem>
  )), [defenses, selectedCode, onSelect, building])

  return <List inProgress={inProgress} items={items} />
}
