import React from 'react'

import { CityItem } from '#types'
import { NavLocationItem } from '#ui/nav/location/item'

interface Props {
  cities: CityItem[]
  countLimit: number
}

export const NavLocationCities: React.FC<Props> = ({ cities, countLimit }) => {
  return (
    <section>
      <h3 className="m-0 mb-2 text-xs text-amber-dim">
        Villes {cities.length}/{countLimit}
      </h3>
      <ul className="m-0 list-none space-y-1 p-0">
        {cities.map(city => (
          <NavLocationItem key={city.id} kind="city" cityId={city.id} text={city.name} />
        ))}
      </ul>
    </section>
  )
}
