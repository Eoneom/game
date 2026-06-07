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

  return (
    <aside className="locations surface-chrome flex h-full min-h-0 w-44 shrink-0 flex-col gap-4 overflow-y-auto border-l border-rust/70 p-3">
      <h2 className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-label">Emplacements</h2>
      {Boolean(cities.length) && (
        <NavLocationCities cities={cities} countLimit={cityCountLimit} />
      )}
      {Boolean(outposts.length) && (
        <NavLocationOutposts outposts={outposts} countLimit={outpostCountLimit} />
      )}
    </aside>
  )
}
