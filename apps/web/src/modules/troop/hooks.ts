import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { CombatStrategy, Coordinates, MovementAction, TroopCode, TroopListDataResponse } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'
import { cityKeys } from '#city/hooks'
import { outpostKeys } from '#outpost/hooks'
import { activityKeys } from '#location/activity-hooks'
import { triggerFxBurst } from '#ui/fx'

export const troopKeys = {
  cityList: (cityId: string) => ['troops', 'city', cityId] as const,
  outpostList: (outpostId: string) => ['troops', 'outpost', outpostId] as const,
  detail: (troopId: string) => ['troop', troopId] as const,
  movements: ['movements'] as const,
  movementCapacity: ['movements', 'capacity'] as const,
  incomingMovements: ['movements', 'incoming'] as const,
  movement: (id: string) => ['movement', id] as const,
}

/** Shared by the city troop list and its recruitment queue (one request, two selections). */
const useCityTroopListQuery = <T>(cityId: string, select: (data: TroopListDataResponse) => T) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: troopKeys.cityList(cityId),
    queryFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.troop.listCity(token, { city_id: cityId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    select,
    enabled: !!token && !!cityId,
  })
}

export const useListCityTroops = (cityId: string) => useCityTroopListQuery(cityId, data => data.troops)

/** Waiting recruitment batches of the city and how many slots its command center gives. */
export const useCityRecruitQueue = (cityId: string) => useCityTroopListQuery(cityId, data => ({
  queue: data.recruit_queue,
  limit: data.recruit_queue_limit,
}))

export const useListOutpostTroops = (outpostId: string) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: troopKeys.outpostList(outpostId),
    queryFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.troop.listOutpost(token, { outpost_id: outpostId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data.troops
    },
    enabled: !!token && !!outpostId,
  })
}

export const useListTroops = (
  scope: { cityId: string; outpostId?: never } | { cityId?: never; outpostId: string }
) => {
  const cityId = 'cityId' in scope && scope.cityId ? scope.cityId : ''
  const outpostId = 'outpostId' in scope && scope.outpostId ? scope.outpostId : ''
  const cityQuery = useListCityTroops(cityId)
  const outpostQuery = useListOutpostTroops(outpostId)
  return cityId ? cityQuery : outpostQuery
}

export const useGetTroop = (troopId: string | null | undefined) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: troopKeys.detail(troopId ?? ''),
    queryFn: async () => {
      if (!token || !troopId) throw new Error('no token')
      const res = await client.troop.get(token, { troop_id: troopId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token && !!troopId,
  })
}

export const useRecruitTroop = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ code, count }: { code: TroopCode; count: number }) => {
      if (!cityId || !token) throw new Error('no city id or token')
      const res = await client.troop.recruit(token, { city_id: cityId, troop_code: code, count })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: troopKeys.cityList(cityId ?? '') })
      queryClient.invalidateQueries({ queryKey: cityKeys.detail(cityId ?? '') })
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      triggerFxBurst()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useCancelTroop = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!cityId || !token) throw new Error('no city id or token')
      const res = await client.troop.cancel(token, { city_id: cityId })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: troopKeys.cityList(cityId ?? '') })
      queryClient.invalidateQueries({ queryKey: cityKeys.detail(cityId ?? '') })
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

export const useCancelQueuedTroopRecruitment = (cityId: string) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (queueItemId: string) => {
      if (!token) throw new Error('no token')
      const res = await client.troop.cancelQueued(token, {
        city_id: cityId,
        queue_item_id: queueItemId
      })
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: troopKeys.cityList(cityId) })
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

/** Movements in flight against the command-center cap (`GET /troop/movement/capacity`). */
export const useMovementCapacity = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: troopKeys.movementCapacity,
    queryFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.troop.getMovementCapacity(token)
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token,
  })
}

/** Incoming attacks filtered by the player's live detection level (slice 030); empty at level 0. */
export const useListIncomingMovements = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: troopKeys.incomingMovements,
    queryFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.troop.listIncomingMovement(token)
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data.movements
    },
    enabled: !!token,
  })
}

export const useListMovements = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: troopKeys.movements,
    queryFn: async () => {
      if (!token) throw new Error('no token')
      const res = await client.troop.listMovement(token)
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data.movements
    },
    enabled: !!token,
  })
}

export const useGetMovement = (movementId: string | null | undefined) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: troopKeys.movement(movementId ?? ''),
    queryFn: async () => {
      if (!token || !movementId) throw new Error('no token')
      const res = await client.troop.getMovement(token, { movement_id: movementId })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return res.data
    },
    enabled: !!token && !!movementId,
  })
}

export const useCreateMovement = () => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      action: MovementAction
      origin: Coordinates
      destination: Coordinates
      troops: { code: TroopCode; count: number }[]
      resources?: { plastic: number; mushroom: number; plasma: number }
      combat_strategy?: CombatStrategy
    }) => {
      if (!token) throw new Error('no token')
      const res = await client.troop.createMovement(token, params)
      if (isError(res)) throw new Error(res.error_code)
      return res.data
    },
    onSuccess: () => {
      toast.success('Les troupes sont en route')
      queryClient.invalidateQueries({ queryKey: troopKeys.movements })
      queryClient.invalidateQueries({ queryKey: outpostKeys.all })
      queryClient.invalidateQueries({ queryKey: ['outpost'] })
      queryClient.invalidateQueries({ queryKey: cityKeys.all })
      queryClient.invalidateQueries({ queryKey: ['city'] })
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
      triggerFxBurst()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}
