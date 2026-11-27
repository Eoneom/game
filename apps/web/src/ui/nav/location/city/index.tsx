import React from 'react'

import { CityItem } from '#types'
import { NavLocationItem } from '#ui/nav/location/item'

interface Props {
  cities: CityItem[]
  countLimit: number
  /** Ids targeted by an incoming attack (slice 041). */
  threatenedIds?: ReadonlySet<string>
}

export const NavLocationCities: React.FC<Props> = ({ cities, countLimit, threatenedIds }) => {
  return (
    <section>
      <h3 className="m-0 mb-2 text-meta text-label">
        Villes {cities.length}/{countLimit}
      </h3>
      <ul className="m-0 list-none space-y-0.5 p-0">
        {cities.map(city => (
          <NavLocationItem
            key={city.id}
            kind="city"
            cityId={city.id}
            text={city.name}
            threatened={threatenedIds?.has(city.id) ?? false}
          />
        ))}
      </ul>
    </section>
  )
}
