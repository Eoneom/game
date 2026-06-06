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
    <section className="space-y-2">
      <h3 className="m-0 text-xs text-amber-dim">
        Avant-postes {outposts.length}/{countLimit}
      </h3>
      {Boolean(permanents.length) && (
        <div>
          <h5 className="m-0 mb-1 text-[0.65rem] uppercase tracking-wider text-label">
            Permanents
          </h5>
          <ul className="m-0 list-none space-y-1 p-0">
            {permanents.map(outpost => (
              <NavLocationItem
                key={outpost.id}
                kind="outpost"
                outpostId={outpost.id}
                text={formatCoordinates(outpost.coordinates)}
                linkClassName="font-mono"
              />
            ))}
          </ul>
        </div>
      )}
      {Boolean(temporaries.length) && (
        <div>
          <h5 className="m-0 mb-1 text-[0.65rem] uppercase tracking-wider text-label">
            Temporaires
          </h5>
          <ul className="m-0 list-none space-y-1 p-0">
            {temporaries.map(outpost => (
              <NavLocationItem
                key={outpost.id}
                kind="outpost"
                outpostId={outpost.id}
                text={formatCoordinates(outpost.coordinates)}
                linkClassName="font-mono"
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
