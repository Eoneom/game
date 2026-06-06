import React, { useState } from 'react'

import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import { TroopDetailsRecruit } from '#troop/details/recruit'
import { Requirement } from '#requirement/index'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { Cost } from '#cost/index'
import { hasEnoughResources } from '#city/helper'
import { useRequirement } from '#requirement/hook'
import { useGetCity } from '#city/hooks'
import { useListCityTroops } from '#troop/hooks'
import { Troop, TroopItem } from '#types'
import { EntityThumb } from '#ui/entity-thumb'

type TroopWithRecruitment = TroopItem & { ongoing_recruitment: NonNullable<TroopItem['ongoing_recruitment']> }

interface Props {
  cityId: string
  troop: Troop
}

export const TroopDetails: React.FC<Props> = ({ cityId, troop }) => {
  const { data: city } = useGetCity(cityId)
  const { data: troops = [] } = useListCityTroops(cityId)
  const [count, setCount] = useState(1)

  const { name, description, effect } = TroopTranslations[troop.code]
  const numberCount = Number.isNaN(count) ? 1 : count
  const plasticCost = numberCount * troop.cost.plastic
  const mushroomCost = numberCount * troop.cost.mushroom

  const { isRequirementMet } = useRequirement({ cityId, requirement: troop.requirement })

  const inProgress = troops.find(
    (t): t is TroopWithRecruitment => Boolean(t.ongoing_recruitment)
  )

  const canRecruit = !inProgress &&
    hasEnoughResources({
      city: city ?? null,
      cost: {
        plastic: plasticCost,
        mushroom: mushroomCost
      }
    }) &&
    isRequirementMet

  return <>
    <LayoutDetailsContent>
      <div className="flex gap-4">
        <EntityThumb src={troopImageSrc(troop.code)} alt="" />
        <div className="min-w-0 flex-1 space-y-2">
          <h2>{name}</h2>
          <p>{effect}</p>
        </div>
      </div>

      <TroopDetailsRecruit
        cityId={cityId}
        troop={troop}
        canRecruit={canRecruit}
        count={count}
        onChange={value => setCount(value)}
      />
      <p className='description'>{description}</p>
    </LayoutDetailsContent>

    <aside className="mt-4 space-y-3 border-t border-rust/50 pt-3">
      <Requirement cityId={cityId} requirements={troop.requirement} />
      <Cost
        cityId={cityId}
        plastic={plasticCost}
        mushroom={mushroomCost}
        duration={numberCount * troop.cost.duration}
      />
    </aside>
  </>
}
