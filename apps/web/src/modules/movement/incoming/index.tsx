import React from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { troopKeys, useListIncomingMovements } from '#troop/hooks'
import { IncomingMovementItem } from '#movement/incoming/item'

/**
 * "Attaques entrantes" (slice 030). The server returns nothing below detection 1, so the section
 * stays hidden until there is something to show; detail grows with the detection level.
 */
export const IncomingMovementList: React.FC = () => {
  const queryClient = useQueryClient()
  const { data: movements = [] } = useListIncomingMovements()

  if (!movements.length) {
    return null
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: troopKeys.incomingMovements })
  }

  return (
    <section
      className="surface-chrome rounded-sm border border-danger/60 p-4"
      aria-labelledby="movements-incoming-heading"
    >
      <h2 id="movements-incoming-heading" className="m-0 text-base uppercase tracking-wider text-danger">
        Attaques entrantes
      </h2>
      <p className="mt-1 text-sm text-amber-dim">
        Temps restant avant l&apos;arrivée des attaquants. La Détection révèle davantage de détails.
      </p>
      <ul className="mt-3 m-0 flex list-none flex-col gap-2 p-0">
        {movements.map(movement => (
          <IncomingMovementItem key={movement.id} movement={movement} onArrived={refresh} />
        ))}
      </ul>
    </section>
  )
}
