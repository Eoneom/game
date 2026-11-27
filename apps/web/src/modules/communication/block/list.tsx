import React from 'react'

import { formatDate } from '#helpers/transform'
import { Button } from '#ui/button'
import { useListBlockedPlayers, useUnblockPlayer } from '#communication/block/hooks'

export const BlockedPlayers: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data: players = [], isPending } = useListBlockedPlayers()
  const unblock = useUnblockPlayer()

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-base text-amber">Joueurs bloqués</h2>
        <Button variant="ghost" onClick={onClose}>Fermer</Button>
      </header>
      <p className="m-0 text-xs text-amber-dim">
        Vous ne recevez ni leurs lettres ni leurs messages de discussion. Ils n’en sont pas informés.
      </p>
      {!isPending && players.length === 0 && <p className="m-0 text-sm text-label">Aucun joueur bloqué.</p>}
      <ul className="m-0 list-none space-y-2 p-0">
        {players.map(player => (
          <li key={player.id} className="flex items-center justify-between gap-2 rounded-sm border border-rust/30 p-2">
            <div>
              <div className="text-sm text-amber">{player.name}</div>
              <div className="text-xs text-label">Bloqué le {formatDate(player.blocked_at)}</div>
            </div>
            <Button variant="ghost" disabled={unblock.isPending} onClick={() => unblock.mutate(player.id)}>
              Débloquer
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
