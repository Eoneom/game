import { City, Outpost } from '#types'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'
import { HeaderResourcesItem } from '#ui/header/resources/item'
import { OutpostType } from '@eoneom/api-client'
import React from 'react'

interface Props {
  city: City | null
  outpost: Outpost | null
}

export const HeaderResources: React.FC<Props> = ({ city, outpost }) => {
  if (city) {
    return <ul>
      <HeaderResourcesItem
        value={city.plastic}
        icon={<IconPlastic />}
        warehouse_capacity={city.warehouses_capacity.plastic}
        earnings_per_second={city.earnings_per_second.plastic}
        warehouse_full_in_seconds={city.warehouse_full_in_seconds.plastic}
      />
      <HeaderResourcesItem
        value={city.mushroom}
        icon={<IconMushroom />}
        warehouse_capacity={city.warehouses_capacity.mushroom}
        earnings_per_second={city.earnings_per_second.mushroom}
        warehouse_full_in_seconds={city.warehouse_full_in_seconds.mushroom}
      />
    </ul>
  }

  if (outpost) {
    const showEarnings = outpost.type === OutpostType.PERMANENT
    return <ul>
      <HeaderResourcesItem
        value={outpost.plastic}
        icon={<IconPlastic />}
        earnings_per_second={showEarnings ? outpost.earnings_per_second.plastic : undefined}
      />
      <HeaderResourcesItem
        value={outpost.mushroom}
        icon={<IconMushroom />}
        earnings_per_second={showEarnings ? outpost.earnings_per_second.mushroom : undefined}
      />
    </ul>
  }

  return <ul></ul>
}
