import { useState } from 'react'
import { Coordinates } from '@eoneom/api-client'

import { WorldViewport } from '#types'
import { getCells } from '#map/api/cells'
import { useAuth } from '#auth/context'
import { viewportBoundsAround } from '#map/viewport'

export const useWorld = () => {
  const [viewport, setViewport] = useState<WorldViewport | null>(null)
  const { token } = useAuth()

  const fetch = async ({ center }: { center: Coordinates }) => {
    if (!token) return

    const bounds = viewportBoundsAround(center)
    const fetched = await getCells({
      token,
      bounds 
    })
    if (!fetched) return

    setViewport({
      bounds,
      cells: fetched.cells
    })
  }

  return {
    viewport,
    fetch 
  }
}
