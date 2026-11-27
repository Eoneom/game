import { useEffect } from 'react'

import { useListCities } from '#city/hooks'
import { useLocation } from '#location/context'
import { useListOutposts } from '#outpost/hooks'
import { pickRestoredLocation, readStoredLocation } from '#location/storage'

/**
 * Empire pages (Bourse, Rapports, Courrier, Alliance, Classements) carry no city or outpost in their URL.
 * After a reload they would show no header resources and no « Colonie » menu: restore the last location instead.
 */
export const useRestoreLocation = (): void => {
  const { cityId, outpostId, setCity, setOutpost } = useLocation()
  const { data: citiesData } = useListCities()
  const { data: outpostsData, isPending: outpostsPending } = useListOutposts()

  useEffect(() => {
    if (cityId || outpostId || !citiesData) return
    const stored = readStoredLocation()
    if (stored?.kind === 'outpost' && outpostsPending) return

    const restored = pickRestoredLocation({
      stored,
      cityIds: citiesData.cities.map(city => city.id),
      outpostIds: outpostsData ? outpostsData.outposts.map(outpost => outpost.id) : null,
    })
    if (!restored) return
    if (restored.kind === 'city') {
      setCity(restored.id)
    } else {
      setOutpost(restored.id)
    }
    // Setters are recreated on every render by the provider; the ids and lists drive this effect.
  },[cityId, outpostId, citiesData, outpostsData, outpostsPending])
}
