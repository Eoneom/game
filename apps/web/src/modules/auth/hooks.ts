import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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

const startSession = ({
  token,
  setToken,
}: {
  token: string
  setToken: (token: string) => void
}): void => {
  setToken(token)
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
    onSuccess: (token) => {
      startSession({
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
    onSuccess: (token) => {
      startSession({
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
  const { token, clearToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!token) return
      const res = await client.player.logout(token)
      if (isError(res)) {
        throw new Error(res.error_code)
      }
    },
    onSuccess: () => {
      clearToken()
      wsClient.disconnect()
      queryClient.clear()
    },
    onError: (err: Error) => {
      toast.error(translateError(err.message))
    },
  })
}

export const useInitStoredToken = () => {
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    registerCityWsListeners()
    registerBuildingWsListeners()
    registerTechnologyWsListeners()
    registerTroopWsListeners()
    registerOutpostWsListeners()
    wsClient.connect(token)
  }, [])
}

const AUTH_ERROR_CODES = new Set(['auth:not-found', 'token:not_found'])

export const useClearInvalidSession = (error: Error | null) => {
  const { clearToken } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!error || !AUTH_ERROR_CODES.has(error.message)) return
    clearToken()
    wsClient.disconnect()
    queryClient.clear()
  }, [error, clearToken, queryClient])
}
