import React from 'react'
import { HeaderTitle } from '#ui/header/title'
import { HeaderResources } from '#ui/header/resources'
import { HeaderIncomingAttacks } from '#ui/header/incoming'
import { formatCoordinates } from '#helpers/transform'
import { useLocation } from '#location/context'
import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'

/** Shell header (slice 041): brand aligned with the left column, location title, compact resources. */
export const Header: React.FC = () => {
  const { cityId, outpostId } = useLocation()
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(outpostId)

  const text = city ? city.name : outpost ? formatCoordinates(outpost.coordinates) : ''

  return (
    <header className="command-bar surface-frame relative z-30 grid h-14 shrink-0 grid-cols-[16rem_minmax(0,1fr)_auto] items-center border-b border-rust/80 pr-4">
      <div className="px-4">
        <h3 className="m-0 text-title tracking-[0.12em] text-amber">EONEOM</h3>
        <p className="m-0 text-caption uppercase tracking-wider text-label">Command terminal</p>
      </div>
      <div className="flex min-w-0 items-center gap-3 px-6 [&_h1]:m-0 [&_h1]:truncate [&_h1]:text-heading [&_h1]:text-amber [&_a]:text-amber">
        <HeaderTitle
          text={text}
          cityId={city?.id}
          outpostId={city ? undefined : outpost?.id}
        />
        {city ? (
          <span className="shrink-0 font-mono text-meta text-label">{formatCoordinates(city.coordinates)}</span>
        ) : null}
        <HeaderIncomingAttacks cityId={cityId ?? undefined} outpostId={cityId ? undefined : outpostId ?? undefined} />
      </div>
      <div className="justify-self-end">
        <HeaderResources city={city ?? null} outpost={city ? null : outpost ?? null} />
      </div>
    </header>
  )
}
