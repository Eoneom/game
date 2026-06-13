import { QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'

import { translateError } from '#helpers/error-translations'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(translateError((error as Error).message))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: false,
    },
  },
})
