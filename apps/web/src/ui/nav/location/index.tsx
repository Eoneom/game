import React, { useMemo } from 'react'
import { NavLocationCities } from '#ui/nav/location/city'
import { NavLocationOutposts } from '#ui/nav/location/outpost'
import { useListCities } from '#city/hooks'
import { useListOutposts } from '#outpost/hooks'
import { useListIncomingMovements } from '#troop/hooks'

/** Right column (slice 041): cities and outposts, current location highlighted, incoming-attack dots. */
export const NavLocation: React.FC = () => {
  const { data: citiesData } = useListCities()
  const { data: outpostsData } = useListOutposts()
  // Same query as the header badge; empty below detection 1 (slice 030).
  const { data: incoming } = useListIncomingMovements()

  const cities = citiesData?.cities ?? []
  const cityCountLimit = citiesData?.count_limit ?? 0
  const outposts = outpostsData?.outposts ?? []
  const outpostCountLimit = outpostsData?.count_limit ?? 0

  const threatenedIds = useMemo(
    () => new Set((incoming ?? []).flatMap(movement => movement.target.id ? [ movement.target.id ] : [])),
    [ incoming ]
  )

  return (
    <aside
      aria-label="Emplacements"
      className="locations surface-frame flex h-full min-h-0 w-56 shrink-0 flex-col gap-4 overflow-y-auto border-l border-rust/70 p-3"
    >
      <h2 className="m-0 text-caption uppercase tracking-wider text-label">Emplacements</h2>
      {Boolean(cities.length) && (
        <NavLocationCities cities={cities} countLimit={cityCountLimit} threatenedIds={threatenedIds} />
      )}
      {Boolean(outposts.length) && (
        <NavLocationOutposts outposts={outposts} countLimit={outpostCountLimit} threatenedIds={threatenedIds} />
      )}
    </aside>
  )
}
