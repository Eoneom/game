import { useQuery } from '@tanstack/react-query'
import { Navigate } from '@tanstack/react-router'
import React from 'react'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'

export const useAdminSession = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: [ 'admin', 'system-player-observability' ],
    enabled: Boolean(token),
    queryFn: async () => {
      if (!token) {
        throw new Error('token:not-found')
      }
      const res = await client.admin.getSystemPlayerObservability(token)
      if (isError(res)) {
        throw new Error(res.error_code)
      }
      return res.data
    },
  })
}

export type AdminRouteGateState =
  | { status: 'loading' }
  | { status: 'forbidden' }
  | { status: 'ready', session: NonNullable<ReturnType<typeof useAdminSession>['data']> }

function useAdminRouteGate(): AdminRouteGateState {
  const { data: session, isPending } = useAdminSession()

  if (isPending) {
    return { status: 'loading' }
  }
  if (!session?.is_admin) {
    return { status: 'forbidden' }
  }
  return { status: 'ready', session }
}

type AdminRouteGateProps = {
  loading?: React.ReactNode
  children: (session: NonNullable<ReturnType<typeof useAdminSession>['data']>) => React.ReactNode
}

export const AdminRouteGate: React.FC<AdminRouteGateProps> = ({
  loading,
  children,
}) => {
  const gate = useAdminRouteGate()

  if (gate.status === 'loading') {
    return loading ?? <p className="text-amber-dim">Chargement…</p>
  }
  if (gate.status === 'forbidden') {
    return <Navigate to="/inbox/report" />
  }
  return children(gate.session)
}
