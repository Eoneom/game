import { useMutation } from '@tanstack/react-query'
import type { CommunicationCreateAbuseReportRequest } from '@eoneom/api-client'
import { toast } from 'react-toastify'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'
import { useAuth } from '#auth/context'

export const useReportAbuse = () => {
  const { token } = useAuth()

  return useMutation({
    mutationFn: async (body: CommunicationCreateAbuseReportRequest) => {
      if (!token) throw new Error('empty token')
      const res = await client.communication.reportAbuse(token, body)
      if (isError(res)) throw new Error(res.error_code)
    },
    onSuccess: () => toast.success('Signalement envoyé'),
    onError: (err: Error) => toast.error(translateError(err.message)),
  })
}

/** Optional reason typed by the player; `null` when they cancel. */
export const promptAbuseReason = (): string | null => {
  const reason = window.prompt('Motif du signalement (facultatif, 500 caractères max.)', '')
  if (reason === null) return null
  return reason.slice(0, 500)
}
