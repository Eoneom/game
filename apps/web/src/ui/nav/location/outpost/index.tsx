import React, { useMemo } from 'react'

import { OutpostItem } from '#types'
import { NavLocationItem } from '#ui/nav/location/item'
import { formatCoordinates } from '#helpers/transform'
import { OutpostType } from '@eoneom/api-client'

interface Props {
  outposts: OutpostItem[]
  countLimit: number
}

export const NavLocationOutposts: React.FC<Props> = ({ outposts, countLimit }) => {
  const temporaries = useMemo(() => {
    return outposts
      .filter(outpost => outpost.type === OutpostType.TEMPORARY)
      .sort((a, b) => formatCoordinates(a.coordinates).localeCompare(formatCoordinates(b.coordinates)))
  }, [outposts])

  const permanents = useMemo(() => {
    return outposts
      .filter(outpost => outpost.type !== OutpostType.TEMPORARY)
      .sort((a, b) => formatCoordinates(a.coordinates).localeCompare(formatCoordinates(b.coordinates)))
  }, [outposts])

  if (!outposts.length) {
    return null
  }

  return (
    <section className="nav-location-section">
      <h3>Avant-postes {outposts.length}/{countLimit}</h3>
      {Boolean(permanents.length) && (
        <>
          <h5>Permanents</h5>
          <ul>
            {permanents.map(outpost => (
              <NavLocationItem
                key={outpost.id}
                kind="outpost"
                outpostId={outpost.id}
                text={formatCoordinates(outpost.coordinates)}
                linkClassName="nav-location-link--coords"
              />
            ))}
          </ul>
        </>
      )}
      {Boolean(temporaries.length) && (
        <>
          <h5>Temporaires</h5>
          <ul>
            {temporaries.map(outpost => (
              <NavLocationItem
                key={outpost.id}
                kind="outpost"
                outpostId={outpost.id}
                text={formatCoordinates(outpost.coordinates)}
                linkClassName="nav-location-link--coords"
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
