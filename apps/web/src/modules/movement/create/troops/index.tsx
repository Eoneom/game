import { MovementCreateTroopsInput } from '#movement/create/troops/input'
import { TroopTranslations } from '#troop/translations'
import { TroopItem } from '#types'
import { TroopCode } from '@eoneom/api-client'
import React from 'react'
import classNames from 'classnames'

interface Props {
  troops: TroopItem[]
  selectedTroops: Partial<Record<TroopCode, number>>
  onChange: (troops: Partial<Record<TroopCode, number>>) => void
}

export const MovementCreateTroops: React.FC<Props> = ({ troops, selectedTroops, onChange }) => {
  if (!troops.length) {
    return <p className="m-0 text-sm text-amber-dim">Aucune troupe disponible.</p>
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {troops.map(troop => {
        const { name } = TroopTranslations[troop.code]
        const count = selectedTroops[troop.code] ?? 0
        const selected = count > 0
        return (
          <li
            key={troop.code}
            className={classNames(
              'flex items-center justify-between gap-3 rounded-sm border px-3 py-2',
              selected
                ? 'border-amber/50 bg-chrome text-amber'
                : 'border-rust/40 bg-chrome/50 text-amber-dim'
            )}
          >
            <span className="min-w-0 flex-1 text-sm">{name}</span>
            <div className="flex items-center gap-2">
              <MovementCreateTroopsInput
                max={troop.count}
                value={count}
                onChange={value => onChange({
                  ...selectedTroops,
                  [troop.code]: value
                })}
              />
              <span className="inline-block w-10 text-right font-mono text-xs tabular-nums text-label">
                / {troop.count}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
