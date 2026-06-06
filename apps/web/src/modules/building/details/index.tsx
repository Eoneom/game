import React from 'react'

import { Building } from '#types'
import { BuildingTranslations } from '#building/translations'
import { buildingImageSrc } from '#building/image'
import { Requirement } from '#requirement/index'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { Cost } from '#cost/index'
import { BuildingDetailsMetadata } from '#building/details/metadata'
import { BuildingDetailsUpgrade } from '#building/details/upgrade'
import { useGetCity } from '#city/hooks'
import { EntityThumb } from '#ui/entity-thumb'

interface Props {
  cityId: string
  building: Building
}

export const BuildingDetails: React.FC<Props> = ({ cityId, building }) => {
  const { data: city } = useGetCity(cityId)
  const { name, description, effect } = BuildingTranslations[building.code]

  return <>
    <LayoutDetailsContent>
      <div className="flex gap-4">
        <EntityThumb src={buildingImageSrc(building.code)} alt="" />
        <div className="min-w-0 flex-1 space-y-2">
          <h2>{name}</h2>
          <p>{effect}</p>
        </div>
      </div>
      <BuildingDetailsUpgrade cityId={cityId} building={building} />
      <BuildingDetailsMetadata building={building} />
      <p className='description'>{description}</p>
    </LayoutDetailsContent>

    <aside className="mt-4 space-y-3 border-t border-rust/50 pt-3">
      <Requirement
        cityId={cityId}
        requirements={building.requirement}
        building_levels_used={city?.building_levels_used}
        building_levels_capacity={city?.maximum_building_levels}
      />
      <Cost cityId={cityId} {...building.upgrade_cost} />
    </aside>
  </>
}
