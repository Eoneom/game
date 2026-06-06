import React from 'react'
import { BuildingCode } from '@eoneom/api-client'

import { BuildingItem } from '#types'
import { buildingImageSrc } from '#building/image'
import { BuildingTranslations } from '#building/translations'
import { ListItemLevel } from '#ui/list/item/level'

interface Props {
  buildingItem: BuildingItem
  active: boolean
  onSelect: (code: BuildingCode) => void
  badge?: string
  busy?: boolean
}

export const BuildingListItem: React.FC<Props> = ({
  buildingItem,
  active,
  onSelect,
  badge,
  busy,
}) => {
  const { name } = BuildingTranslations[buildingItem.code]

  return <ListItemLevel
    name={name}
    active={active}
    level={buildingItem.level}
    badge={badge}
    busy={busy}
    image={{
      src: buildingImageSrc(buildingItem.code),
      alt: '',
    }}
    onSelect={() => onSelect(buildingItem.code)}
  />
}
