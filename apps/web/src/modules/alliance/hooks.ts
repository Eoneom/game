import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'

export const allianceKeys = {
  all: ['alliance'] as const,
  mine: ['alliance', 'mine'] as const,
  search: (q: string) => ['alliance', 'search', q] as const,
  invitations: ['alliance', 'invitations'] as const,
  applications: ['alliance', 'applications'] as const,
  reinforcements: (cityId: string) => ['reinforcements', 'city', cityId] as const,
  reinforcementsAbroad: ['reinforcements', 'abroad'] as const,
}

type ApiResult<T> = { status: 'ok'; data?: T } | { status: 'nok'; error_code: string }

const unwrap = <T>(res: ApiResult<T>): T | undefined => {
  if (isError(res)) throw new Error(res.error_code)
  return res.data
}

/** The caller's alliance with members (or `null`) and the leave cooldown (slice 033). */
export const useMyAlliance = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: allianceKeys.mine,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const data = unwrap(await client.alliance.mine(token))
      if (!data) throw new Error('no data')
      return data
    },
    enabled: !!token,
  })
}

export const useAllianceSearch = (q: string, enabled: boolean) => {
  const { token } = useAuth()
  const trimmed = q.trim()

  return useQuery({
    queryKey: allianceKeys.search(trimmed),
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.alliance.search(token, { q: trimmed }))?.alliances ?? []
    },
    enabled: !!token && enabled,
    staleTime: 15_000,
  })
}

export const useAllianceInvitations = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: allianceKeys.invitations,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.alliance.listInvitations(token))?.invitations ?? []
    },
    enabled: !!token,
  })
}

export const useAllianceApplications = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: allianceKeys.applications,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      const data = unwrap(await client.alliance.listApplications(token))
      return data ?? { received: [], sent: [] }
    },
    enabled: !!token,
  })
}

/** Every alliance action refreshes the alliance data; `success` is the toast shown on success. */
export const useAllianceAction = <V>(
  action: (token: string, variables: V) => Promise<ApiResult<unknown>>,
  { success, onSuccess }: { success?: string; onSuccess?: () => void } = {}
) => {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: V) => {
      if (!token) throw new Error('empty token')
      unwrap(await action(token, variables))
    },
    onSuccess: () => {
      if (success) toast.success(success)
      queryClient.invalidateQueries({ queryKey: allianceKeys.all })
      queryClient.invalidateQueries({ queryKey: ['reinforcements'] })
      queryClient.invalidateQueries({ queryKey: ['chat'] })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

/** Allied troops stationed in one of the player's cities (read only). */
export const useCityReinforcements = (cityId: string) => {
  const { token } = useAuth()

  return useQuery({
    queryKey: allianceKeys.reinforcements(cityId),
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.troop.listReinforcement(token, { city_id: cityId }))?.reinforcements ?? []
    },
    enabled: !!token && !!cityId,
  })
}

/** The player's troops stationed in allied cities. */
export const useReinforcementsAbroad = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: allianceKeys.reinforcementsAbroad,
    queryFn: async () => {
      if (!token) throw new Error('empty token')
      return unwrap(await client.troop.listReinforcementAbroad(token))?.reinforcements ?? []
    },
    enabled: !!token,
  })
}
