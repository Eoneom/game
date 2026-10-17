import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { FactionCode } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { wsClient } from '#helpers/websocket'
import { useAuth } from '#auth/context'
import { registerCityWsListeners } from '#city/ws-listener'
import { registerBuildingWsListeners } from '#building/ws-listener'
import { registerTechnologyWsListeners } from '#technology/ws-listener'
import { registerTroopWsListeners } from '#troop/ws-listener'
import { registerOutpostWsListeners } from '#outpost/ws-listener'
import { clearSystemPlayerObservabilityEvents } from '#admin/system-player-observability/event-store'
import { clearSystemPlayerStatsSnapshots } from '#admin/system-player-observability/stats-store'
import { invalidateSession, isInvalidSessionError } from '#auth/session'

const doLogin = async (playerName: string): Promise<string> => {
  const res = await client.player.login({ player_name: playerName })
  if (isError(res)) {
    throw new Error(res.error_code)
  }
  if (!res.data?.token) {
    throw new Error('token:not-in-response')
  }
  return res.data.token
}

const doSignup = async ({
  playerName,
  cityName,
  factionCode,
}: {
  playerName: string
  cityName: string
  factionCode: FactionCode
}): Promise<void> => {
  const res = await client.player.signup({
    player_name: playerName,
    city_name: cityName,
    faction_code: factionCode,
  })
  if (isError(res)) {
    throw new Error(res.error_code)
  }
}

const startSession = async ({
  token,
  setToken,
}: {
  token: string
  setToken: (token: string) => void
}): Promise<void> => {
  setToken(token)
  clearSystemPlayerObservabilityEvents()
  clearSystemPlayerStatsSnapshots()
  registerCityWsListeners()
  registerBuildingWsListeners()
  registerTechnologyWsListeners()
  registerTroopWsListeners()
  registerOutpostWsListeners()
  wsClient.connect(token)
}

export const useLogin = () => {
  const { setToken } = useAuth()

  return useMutation({
    mutationFn: async (playerName: string) => {
      return doLogin(playerName)
    },
    onSuccess: async (token) => {
      await startSession({
        token,
        setToken 
      })
    },
    onError: (err: Error) => {
      toast.error(translateError(err.message))
    },
  })
}

export const useSignup = () => {
  const { setToken } = useAuth()

  return useMutation({
    mutationFn: async ({
      playerName,
      cityName,
      factionCode,
    }: {
      playerName: string
      cityName: string
      factionCode: FactionCode
    }) => {
      await doSignup({
        playerName,
        cityName,
        factionCode 
      })
      return doLogin(playerName)
    },
    onSuccess: async (token) => {
      await startSession({
        token,
        setToken 
      })
    },
    onError: (err: Error) => {
      toast.error(translateError(err.message))
    },
  })
}

export const useLogout = () => {
  const { token } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!token) return
      const res = await client.player.logout(token)
      if (isError(res)) {
        throw new Error(res.error_code)
      }
    },
    onSuccess: () => {
      invalidateSession()
    },
    onError: (err: Error) => {
      if (isInvalidSessionError(err.message)) {
        invalidateSession()
        return
      }
      toast.error(translateError(err.message))
    },
  })
}

export const useInitStoredToken = () => {
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    void (async () => {
      registerCityWsListeners()
      registerBuildingWsListeners()
      registerTechnologyWsListeners()
      registerTroopWsListeners()
      registerOutpostWsListeners()
      wsClient.connect(token)
    })()
  }, [])
}

export const useClearInvalidSession = (error: Error | null) => {
  useEffect(() => {
    if (!error || !isInvalidSessionError(error.message)) return
    invalidateSession()
  }, [error])
}
