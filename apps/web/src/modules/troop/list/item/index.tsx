import React from 'react'

import { TroopItem } from '#types'
import { troopImageSrc } from '#troop/image'
import { TroopTranslations } from '#troop/translations'
import { ListItemCount } from '#ui/list/item/count'

interface Props {
  active: boolean
  troop: TroopItem
  onSelect: (id: string) => void
  badge?: string
  busy?: boolean
}

export const TroopListItem: React.FC<Props> = ({
  active,
  troop,
  onSelect,
  badge,
  busy,
}) => {
  return <ListItemCount
    active={active}
    name={TroopTranslations[troop.code].name}
    count={troop.count}
    badge={badge}
    busy={busy}
    detail={troop.exchange_reserved > 0 ? `dont ${troop.exchange_reserved} réservés pour la bourse` : undefined}
    image={{
      src: troopImageSrc(troop.code),
      alt: TroopTranslations[troop.code].name,
    }}
    onSelect={() => onSelect(troop.id)}
  />
}
