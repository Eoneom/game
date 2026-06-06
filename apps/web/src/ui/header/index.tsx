import React from 'react'
import { HeaderTitle } from '#ui/header/title'
import { HeaderResources } from '#ui/header/resources'
import { formatCoordinates } from '#helpers/transform'
import { useLocation } from '#location/context'
import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'

export const Header: React.FC = () => {
  const { cityId, outpostId } = useLocation()
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(outpostId)

  const text = city ? city.name : outpost ? formatCoordinates(outpost.coordinates) : ''

  return (
    <header className="command-bar surface-chrome relative z-20 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-rust/80 px-4 py-2 neon-amber motion-safe-neon">
      <div className="justify-self-start">
        <h3 className="m-0 text-lg tracking-[0.12em] text-amber">EONEOM</h3>
        <p className="m-0 text-[0.6rem] uppercase tracking-[0.25em] text-label">Command terminal</p>
      </div>
      <div className="justify-self-center px-2 text-center [&_h1]:m-0 [&_h1]:text-base [&_h1]:text-amber [&_a]:text-amber">
        <HeaderTitle
          text={text}
          cityId={city?.id}
          outpostId={city ? undefined : outpost?.id}
        />
      </div>
      <div className="justify-self-end [&_ul]:m-0 [&_ul]:flex [&_ul]:list-none [&_ul]:gap-3 [&_ul]:p-0">
        <HeaderResources city={city ?? null} outpost={outpost ?? null} />
      </div>
    </header>
  )
}
