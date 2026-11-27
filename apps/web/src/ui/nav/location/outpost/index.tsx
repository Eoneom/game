import React, { useMemo } from 'react'

import { OutpostItem } from '#types'
import { NavLocationItem } from '#ui/nav/location/item'
import { formatCoordinates } from '#helpers/transform'
import { OutpostType } from '@eoneom/api-client'

interface Props {
  outposts: OutpostItem[]
  countLimit: number
  /** Ids targeted by an incoming attack (slice 041). */
  threatenedIds?: ReadonlySet<string>
}

export const NavLocationOutposts: React.FC<Props> = ({ outposts, countLimit, threatenedIds }) => {
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
      <h3 className="m-0 text-meta text-label">
        Avant-postes {outposts.length}/{countLimit}
      </h3>
      {Boolean(permanents.length) && (
        <div>
          <h4 className="m-0 mb-1 text-caption uppercase tracking-wider text-label">
            Permanents
          </h4>
          <ul className="m-0 list-none space-y-0.5 p-0">
            {permanents.map(outpost => (
              <NavLocationItem
                key={outpost.id}
                kind="outpost"
                outpostId={outpost.id}
                text={formatCoordinates(outpost.coordinates)}
                linkClassName="font-mono"
                threatened={threatenedIds?.has(outpost.id) ?? false}
              />
            ))}
          </ul>
        </div>
      )}
      {Boolean(temporaries.length) && (
        <div>
          <h4 className="m-0 mb-1 text-caption uppercase tracking-wider text-label">
            Temporaires
          </h4>
          <ul className="m-0 list-none space-y-0.5 p-0">
            {temporaries.map(outpost => (
              <NavLocationItem
                key={outpost.id}
                kind="outpost"
                outpostId={outpost.id}
                text={formatCoordinates(outpost.coordinates)}
                linkClassName="font-mono"
                threatened={threatenedIds?.has(outpost.id) ?? false}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
