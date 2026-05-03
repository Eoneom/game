import React, { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'

import { useLocation } from '#location/context'

interface Props {
  cityId: string
}

export const CityRoot: React.FC<Props> = ({ cityId }) => {
  const { setCity } = useLocation()

  useEffect(() => {
    setCity(cityId)
  }, [cityId, setCity])

  return <Outlet />
}
