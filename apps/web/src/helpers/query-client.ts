import { QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { invalidateSession, isInvalidSessionError } from '#auth/session'
import { translateError } from '#helpers/error-translations'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const message = (error as Error).message
      if (isInvalidSessionError(message)) {
        invalidateSession()
        return
      }
      toast.error(translateError(message))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: false,
    },
  },
})
