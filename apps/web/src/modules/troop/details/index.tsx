import React, { useState } from 'react'

import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import { TroopDetailsRecruit } from '#troop/details/recruit'
import { Requirement } from '#requirement/index'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { LayoutDetailsAction } from '#ui/layout/details/action'
import { Cost } from '#cost/index'
import { hasEnoughResources } from '#city/helper'
import { useRequirement } from '#requirement/hook'
import { useGetCity } from '#city/hooks'
import { useListCityTroops } from '#troop/hooks'
import { Troop, TroopItem } from '#types'
import { EntityThumb } from '#ui/entity-thumb'

type TroopWithRecruitment = TroopItem & { ongoing_recruitment: NonNullable<TroopItem['ongoing_recruitment']> }

/** Requirement, cost and recruit form of a city troop, right under the details header (slice 043). */
const TroopDetailsAction: React.FC<{ cityId: string, troop: Troop }> = ({ cityId, troop }) => {
  const { data: city } = useGetCity(cityId)
  const { data: troops = [] } = useListCityTroops(cityId)
  const [count, setCount] = useState(1)

  const numberCount = Number.isNaN(count) ? 1 : count
  const plasticCost = numberCount * troop.cost.plastic
  const mushroomCost = numberCount * troop.cost.mushroom
  const plasmaCost = numberCount * troop.cost.plasma

  const { isRequirementMet } = useRequirement({ cityId, requirement: troop.requirement })

  const inProgress = troops.find(
    (t): t is TroopWithRecruitment => Boolean(t.ongoing_recruitment)
  )

  const canRecruit = !inProgress &&
    hasEnoughResources({
      city: city ?? null,
      cost: {
        plastic: plasticCost,
        mushroom: mushroomCost,
        plasma: plasmaCost
      }
    }) &&
    isRequirementMet

  return (
    <LayoutDetailsAction>
      <Requirement cityId={cityId} requirements={troop.requirement} />
      <Cost
        cityId={cityId}
        plastic={plasticCost}
        mushroom={mushroomCost}
        plasma={plasmaCost}
        duration={numberCount * troop.cost.duration}
      />
      <TroopDetailsRecruit
        cityId={cityId}
        troop={troop}
        canRecruit={canRecruit}
        count={count}
        onChange={value => setCount(value)}
      />
    </LayoutDetailsAction>
  )
}

type Props =
  | { cityId: string, troop: Troop, readOnly?: false }
  /** Outposts cannot recruit (slice 043): no requirement, cost or recruit form. */
  | { cityId?: undefined, troop: Troop, readOnly: true }

export const TroopDetails: React.FC<Props> = (props) => {
  const { troop } = props
  const { name, description, effect } = TroopTranslations[troop.code]

  return <>
    <LayoutDetailsContent>
      <div className="flex gap-4">
        <EntityThumb src={troopImageSrc(troop.code)} alt={name} />
        <div className="min-w-0 flex-1 space-y-2">
          <h2>{name}</h2>
          <p>{effect}</p>
        </div>
      </div>
    </LayoutDetailsContent>

    {props.readOnly ? null : <TroopDetailsAction cityId={props.cityId} troop={troop} />}

    <LayoutDetailsContent>
      {props.readOnly ? (
        <p>
          Stationnées ici : <span className="font-mono text-amber">{troop.count}</span>
        </p>
      ) : null}
      <p className='description'>{description}</p>
    </LayoutDetailsContent>
  </>
}
