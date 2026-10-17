import React, { useMemo } from 'react'
import { Navigate } from '@tanstack/react-router'

import { formatDate } from '#helpers/transform'
import {
  useLiveSystemPlayerEvents,
  useObservabilitySession,
  useRegisterObservabilityWsWhenAdmin,
  useSystemPlayerNameFilter,
} from './hooks'
import type { SystemPlayerTickObservabilityOutcome } from './types'

const OUTCOME_LABEL: Record<SystemPlayerTickObservabilityOutcome, string> = {
  success: 'Succès',
  idle: 'Inactif',
  error: 'Erreur',
}

const OUTCOME_CLASS: Record<SystemPlayerTickObservabilityOutcome, string> = {
  success: 'border-emerald-600/50 text-emerald-400',
  idle: 'border-amber/40 text-amber-dim',
  error: 'border-red-600/50 text-red-400',
}

export const SystemPlayerObservabilityPage: React.FC = () => {
  const { data: session, isPending } = useObservabilitySession()
  useRegisterObservabilityWsWhenAdmin(session?.is_admin)
  const events = useLiveSystemPlayerEvents()
  const { filter, setFilter } = useSystemPlayerNameFilter()

  const filtered_events = useMemo(() => {
    if (!filter) {
      return events
    }
    return events.filter(event => event.player_name === filter)
  }, [ events, filter ])

  if (isPending) {
    return (
      <p className="text-amber-dim">Chargement de l&apos;observabilité…</p>
    )
  }

  if (!session?.is_admin) {
    return <Navigate to="/inbox/report" />
  }

  const system_players = session.system_players ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="space-y-1 border-b border-rust/50 pb-2">
        <h1 className="m-0 text-lg text-amber">Observabilité des joueurs système</h1>
        <p className="m-0 text-sm text-amber-dim">
          Flux en direct de chaque tick des joueurs système : succès, essais sans action (inactif) et erreurs.
          Vue opérateur sans historique serveur.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs uppercase tracking-wider text-amber-dim" htmlFor="system-player-filter">
          Filtrer par joueur
        </label>
        <select
          id="system-player-filter"
          className="rounded-sm border border-rust/60 bg-chrome px-2 py-1 text-sm text-amber"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">Tous les joueurs système</option>
          {system_players.map(player => (
            <option key={player.id} value={player.name}>
              {player.name}
            </option>
          ))}
        </select>
      </div>

      <ul className="m-0 min-h-0 flex-1 list-none space-y-2 overflow-y-auto p-0">
        {filtered_events.length === 0 ? (
          <li className="text-sm text-amber-dim">En attente d&apos;un tick joueur système…</li>
        ) : (
          filtered_events.map((event, index) => (
            <li
              key={`${event.committed_at}-${event.player_id}-${event.tick_index}-${index}`}
              className="rounded-sm border border-rust/40 bg-chrome/40 p-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span
                    className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${OUTCOME_CLASS[event.outcome]}`}
                  >
                    {OUTCOME_LABEL[event.outcome]}
                  </span>
                  <p className="m-0 text-sm text-amber">{event.summary}</p>
                </div>
                <time className="shrink-0 text-xs text-amber-dim" dateTime={String(event.committed_at)}>
                  tick {event.tick_index} · {formatDate(event.committed_at)}
                </time>
              </div>
              {event.attempts.length > 0 && (
                <p className="mt-1 m-0 text-xs text-amber-dim">
                  Essais :{' '}
                  {event.attempts.map((attempt, attempt_index) => (
                    <span key={`${attempt.category}-${attempt_index}`}>
                      {attempt_index > 0 ? ' → ' : ''}
                      <span className={attempt.result === 'success' ? 'text-emerald-400' : ''}>
                        {attempt.category}
                        {attempt.result === 'skipped' ? ' (ignoré)' : ''}
                      </span>
                    </span>
                  ))}
                </p>
              )}
              <details className="mt-2 text-xs text-amber-dim">
                <summary className="cursor-pointer text-amber">Détails JSON</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-sm border border-rust/30 bg-void/40 p-2 text-[11px] text-amber-dim">
                  {JSON.stringify({
                    outcome: event.outcome,
                    attempts: event.attempts,
                    category: event.category,
                    payload: event.payload,
                  }, null, 2)}
                </pre>
              </details>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
