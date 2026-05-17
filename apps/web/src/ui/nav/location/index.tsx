import React from 'react'
import { NavLocationCities } from '#ui/nav/location/city'
import { NavLocationOutposts } from '#ui/nav/location/outpost'
import { useListCities } from '#city/hooks'
import { useListOutposts } from '#outpost/hooks'

export const NavLocation: React.FC = () => {
  const { data: citiesData } = useListCities()
  const { data: outpostsData } = useListOutposts()

  const cities = citiesData?.cities ?? []
  const cityCountLimit = citiesData?.count_limit ?? 0
  const outposts = outpostsData?.outposts ?? []
  const outpostCountLimit = outpostsData?.count_limit ?? 0

  return <nav id="location">
    { Boolean(cities.length) && <NavLocationCities cities={cities} countLimit={cityCountLimit} /> }
    { Boolean(outposts.length) && <NavLocationOutposts outposts={outposts} countLimit={outpostCountLimit} />}
  </nav>
}
