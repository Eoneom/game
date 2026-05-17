import React, { useEffect } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { toast } from 'react-toastify'

import { useLocation } from '#location/context'
import { useListOutposts, useGetOutpost } from '#outpost/hooks'
import { useListCities } from '#city/hooks'
import { useGetCity } from '#city/hooks'

interface Props {
  outpostId: string
}

export const OutpostRoot: React.FC<Props> = ({ outpostId }) => {
  const { setOutpost, setCity } = useLocation()
  const navigate = useNavigate()

  const { data: outpost } = useGetOutpost(outpostId)
  const { data: outpostsData } = useListOutposts()
  const outposts = outpostsData?.outposts
  const { data: citiesData } = useListCities()
  const firstCityId = citiesData?.cities[0]?.id
  useGetCity(firstCityId)

  useEffect(() => {
    setOutpost(outpostId)
  }, [outpostId, setOutpost])

  // redirect if outpost no longer exists
  useEffect(() => {
    if (!outposts) return
    const outpostExists = outposts.some(o => o.id === outpostId)
    if (!outpostExists && outpost === undefined) return  // still loading
    if (!outpostExists) {
      const cityId = citiesData?.cities[0]?.id
      if (!cityId) return
      toast.warn('L\'avant poste temporaire a été supprimé')
      setCity(cityId)
      navigate({ to: `/city/${cityId}` })
    }
  }, [outposts, outpostId, outpost, citiesData, setCity, navigate])

  return <Outlet />
}
