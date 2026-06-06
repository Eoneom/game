import React, { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Coordinates } from '@eoneom/api-client'

import { useAuth } from '#auth/context'
import { cityKeys, useListCities } from '#city/hooks'
import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { formatCoordinates } from '#helpers/transform'
import { useListOutposts } from '#outpost/hooks'

interface Props {
  excludeCityId?: string
  excludeOutpostId?: string
  selectedKey: string
  onSelectedKeyChange: (key: string) => void
  onChange: (coordinates: Coordinates) => void
}

const cityKey = (id: string) => `city:${id}`
const outpostKey = (id: string) => `outpost:${id}`

export const MovementCreateDestinationLocationSelect: React.FC<Props> = ({
  excludeCityId,
  excludeOutpostId,
  selectedKey,
  onSelectedKeyChange,
  onChange,
}) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const { data: citiesData } = useListCities()
  const { data: outpostsData } = useListOutposts()
  const [loading, setLoading] = useState(false)

  const cities = useMemo(() => {
    return (citiesData?.cities ?? []).filter(city => city.id !== excludeCityId)
  }, [citiesData?.cities, excludeCityId])

  const outposts = useMemo(() => {
    return (outpostsData?.outposts ?? []).filter(outpost => outpost.id !== excludeOutpostId)
  }, [outpostsData?.outposts, excludeOutpostId])

  const handleChange = async (value: string) => {
    if (!value) {
      onSelectedKeyChange('')
      return
    }

    if (value.startsWith('outpost:')) {
      const id = value.slice('outpost:'.length)
      const outpost = outposts.find(item => item.id === id)
      if (!outpost) return
      onSelectedKeyChange(value)
      onChange(outpost.coordinates)
      return
    }

    if (value.startsWith('city:')) {
      const id = value.slice('city:'.length)
      if (!token) return

      setLoading(true)
      try {
        const city = await queryClient.fetchQuery({
          queryKey: cityKeys.detail(id),
          queryFn: async () => {
            const res = await client.city.get(token, { city_id: id })
            if (isError(res)) throw new Error(res.error_code)
            if (!res.data) throw new Error('Ville non trouvée')
            return res.data
          },
        })
        onSelectedKeyChange(value)
        onChange(city.coordinates)
      } finally {
        setLoading(false)
      }
    }
  }

  if (!cities.length && !outposts.length) {
    return null
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="field-label">Ville ou avant-poste</span>
      <select
        className="field-input"
        value={selectedKey}
        disabled={loading}
        onChange={event => {
          void handleChange(event.target.value)
        }}
      >
        <option value="">Choisir une ville ou un avant-poste</option>
        {Boolean(cities.length) && (
          <optgroup label="Villes">
            {cities.map(city => (
              <option key={city.id} value={cityKey(city.id)}>
                {city.name}
              </option>
            ))}
          </optgroup>
        )}
        {Boolean(outposts.length) && (
          <optgroup label="Avant-postes">
            {outposts.map(outpost => (
              <option key={outpost.id} value={outpostKey(outpost.id)}>
                {formatCoordinates(outpost.coordinates)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  )
}
