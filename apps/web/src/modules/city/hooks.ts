import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'
import { useLocation } from '#location/context'

export const cityKeys = {
  all: ['cities'] as const,
  detail: (cityId: string) => ['city', cityId] as const,
}

export const useListCities = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: cityKeys.all,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const res = await client.city.list(token)
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('data not found')
      if (!res.data.cities.length) throw new Error('there is no city here 😬')
      return { cities: res.data.cities, count_limit: res.data.count_limit }
    },
    enabled: !!token,
  })
}

export const useGetCity = (cityId: string | null | undefined) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: cityKeys.detail(cityId ?? ''),
    queryFn: async () => {
      if (!token || !cityId) throw new Error('empty token or city id')
      const res = await client.city.get(token, { city_id: cityId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('Ville non trouvée')
      return res.data
    },
    enabled: !!token && !!cityId,
  })
}

export const useSettleCity = () => {
  const { token } = useAuth()
  const { outpostId } = useLocation()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cityName: string) => {
      if (!token) throw new Error('empty token')
      if (!outpostId) throw new Error('no outpost selected')
      const res = await client.city.settle(token, { city_name: cityName, outpost_id: outpostId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('data not found')
      return res.data.city_id
    },
    onSuccess: (newCityId) => {
      queryClient.invalidateQueries({ queryKey: cityKeys.all })
      queryClient.invalidateQueries({ queryKey: ['outposts'] })
      queryClient.invalidateQueries({ queryKey: cityKeys.detail(newCityId) })
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}
