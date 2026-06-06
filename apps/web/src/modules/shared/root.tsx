import React, { useEffect } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'

import { useListCities } from '#city/hooks'
import { useLocation } from '#location/context'

interface Props {
  children?: React.ReactNode
}

export const SharedRoot: React.FC<Props> = ({ children }) => {
  const { cityId, outpostId, setCity } = useLocation()
  const { data: citiesData } = useListCities()
  const navigate = useNavigate()

  useEffect(() => {
    if (cityId || outpostId) return
    const firstCity = citiesData?.cities[0]
    if (!firstCity) return
    setCity(firstCity.id)
    navigate({ to: `/city/${firstCity.id}/base` })
  }, [cityId, outpostId, citiesData, setCity, navigate])

  return children ? <>{children}</> : <Outlet />
}
