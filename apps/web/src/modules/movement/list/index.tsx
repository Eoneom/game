import React from 'react'

import { MovementListItem } from '#movement/list/item'
import { useListMovements } from '#troop/hooks'

export const MovementList: React.FC = () => {
  const { data: movements = [] } = useListMovements()

  return (
    <section
      className="surface-chrome rounded-sm p-4"
      aria-labelledby="movements-active-heading"
    >
      <h2 id="movements-active-heading" className="m-0 text-base uppercase tracking-wider text-amber">
        Déplacements en cours
      </h2>
      <p className="mt-1 text-sm text-amber-dim">
        Temps restant jusqu&apos;à l&apos;arrivée sur la case indiquée.
      </p>
      {movements.length ? (
        <ul className="mt-3 m-0 flex list-none flex-col gap-2 p-0">
          {movements.map(movement => (
            <MovementListItem key={movement.id} movement={movement} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 m-0 text-sm text-amber-dim">Aucun déplacement en cours.</p>
      )}
    </section>
  )
}
