import React from 'react'
import { CombatStrategy } from '@eoneom/api-client'

import { MovementCreateCombatStrategy } from '#movement/create/strategy'

interface Props {
  strategy: CombatStrategy
  pending: boolean
  onChange: (strategy: CombatStrategy) => void
}

export const GarrisonCombatStrategy: React.FC<Props> = ({ strategy, pending, onChange }) => (
  <article className="surface-panel space-y-3 p-3">
    <div>
      <h2 className="m-0 text-heading text-amber">Défense de la garnison</h2>
      <p className="m-0 mt-1 text-body text-amber-dim">
        Stratégie appliquée par vos troupes stationnées ici lorsqu&apos;elles sont attaquées.
      </p>
    </div>
    <MovementCreateCombatStrategy
      name="garrison_combat_strategy"
      legend="Stratégie défensive"
      strategy={strategy}
      disabled={pending}
      onChange={(next) => {
        if (next !== strategy) onChange(next)
      }}
    />
  </article>
)
