import React from 'react'

import { MovementListItem } from '#movement/list/item'
import { useListMovements } from '#troop/hooks'
import { MovementCapacity } from '#movement/capacity'

export const MovementList: React.FC = () => {
  const { data: movements = [] } = useListMovements()

  return (
    <section
      className="surface-panel p-4"
      aria-labelledby="movements-active-heading"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 id="movements-active-heading" className="m-0 text-heading text-amber">
          Déplacements en cours
        </h2>
        <MovementCapacity />
      </header>
      <p className="mt-1 text-body text-amber-dim">
        Temps restant jusqu&apos;à l&apos;arrivée sur la case indiquée.
      </p>
      {movements.length ? (
        <ul className="mt-3 m-0 flex list-none flex-col gap-2 p-0">
          {movements.map(movement => (
            <MovementListItem key={movement.id} movement={movement} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 m-0 text-body text-amber-dim">Aucun déplacement en cours.</p>
      )}
    </section>
  )
}
