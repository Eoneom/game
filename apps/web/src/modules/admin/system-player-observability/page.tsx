import React, { useMemo } from 'react'

import { AdminRouteGate } from '#admin/session'
import { formatDate } from '#helpers/transform'
import {
  useLiveSystemPlayerEvents,
  useObservabilitySession,
  useRegisterObservabilityWsWhenAdmin,
  useSystemPlayerNameFilter,
  useSystemPlayerStats,
  useForceSystemPlayerTick,
} from './hooks'
import type { SystemPlayerTickObservabilityOutcome } from './types'
import { SystemPlayerStatsPanel } from './stats-panel'
import {
  formatObservabilityAttemptLabel,
  formatObservabilityEventSummary,
  observabilityAttemptsForDisplay,
} from './format-event'
import type { ObservabilityTickCategory } from './labels'

const OUTCOME_LABEL: Record<SystemPlayerTickObservabilityOutcome, string> = {
  success: 'Succès',
  partial: 'Partiel',
  idle: 'Inactif',
  error: 'Erreur',
}

const OUTCOME_CLASS: Record<SystemPlayerTickObservabilityOutcome, string> = {
  success: 'border-emerald-600/50 text-emerald-400',
  partial: 'border-emerald-600/40 text-emerald-300',
  idle: 'border-amber/40 text-amber-dim',
  error: 'border-red-600/50 text-red-400',
}

export const SystemPlayerObservabilityPage: React.FC = () => {
  return (
    <AdminRouteGate loading={<p className="text-amber-dim">Chargement de l&apos;observabilité…</p>}>
      {session => <SystemPlayerObservabilityContent session={session} />}
    </AdminRouteGate>
  )
}

const SystemPlayerObservabilityContent: React.FC<{
  session: NonNullable<ReturnType<typeof useObservabilitySession>['data']>
}> = ({ session }) => {
  useRegisterObservabilityWsWhenAdmin(session.is_admin)
  const events = useLiveSystemPlayerEvents()
  const { filter, setFilter } = useSystemPlayerNameFilter()
  const {
    snapshots,
    isPending: stats_pending,
    refetch: refetch_stats,
  } = useSystemPlayerStats(session.is_admin)
  const {
    mutate: force_tick,
    isPending: force_tick_pending,
  } = useForceSystemPlayerTick(session.is_admin)

  const filtered_events = useMemo(() => {
    if (!filter) {
      return events
    }
    return events.filter(event => event.player_name === filter)
  }, [ events, filter ])

  const system_players = session.system_players ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="admin-surface-toolbar shrink-0 space-y-1">
        <h1 className="m-0 text-lg text-amber">Observabilité des joueurs système</h1>
        <p className="m-0 text-sm text-amber-dim">
          Colonnes : état des joueurs système et flux des ticks en direct.
        </p>
      </header>

      <div className="admin-surface-toolbar flex shrink-0 flex-wrap items-center gap-2">
        <label className="field-label text-label" htmlFor="system-player-filter">
          Filtrer par joueur
        </label>
        <select
          id="system-player-filter"
          className="field-input max-w-xs py-1 text-sm"
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
        <button
          type="button"
          className="rounded-sm border border-rust/60 bg-chrome-3 px-2 py-1 text-sm text-amber shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:border-amber/50"
          onClick={() => refetch_stats()}
        >
          Actualiser les stats
        </button>
        <button
          type="button"
          className="rounded-sm border border-amber/45 bg-chrome-3 px-2 py-1 text-sm text-amber shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:border-amber/65 disabled:opacity-50"
          disabled={force_tick_pending}
          onClick={() => force_tick()}
        >
          {force_tick_pending ? 'Tick en cours…' : 'Forcer un tick IA'}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <section
          className="admin-surface-panel flex min-h-0 flex-col overflow-hidden rounded-sm"
          aria-label="État des joueurs système"
        >
          <h2 className="m-0 shrink-0 border-b border-rust/45 bg-chrome-3/40 px-3 py-2 text-sm uppercase tracking-wider text-label">
            État
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <SystemPlayerStatsPanel
              snapshots={snapshots}
              name_filter={filter}
              is_loading={stats_pending}
            />
          </div>
        </section>

        <section
          className="admin-surface-panel flex min-h-0 flex-col overflow-hidden rounded-sm"
          aria-label="Flux des ticks"
        >
          <h2 className="m-0 shrink-0 border-b border-rust/45 bg-chrome-3/40 px-3 py-2 text-sm uppercase tracking-wider text-label">
            Ticks
          </h2>
          <ul className="m-0 min-h-0 flex-1 list-none space-y-2 overflow-y-auto p-2">
            {filtered_events.length === 0 ? (
              <li className="text-sm text-amber-dim">En attente d&apos;un tick joueur système…</li>
            ) : (
              filtered_events.map((event, index) => {
                const attempts = observabilityAttemptsForDisplay(event)

                return (
                  <li
                    key={`${event.committed_at}-${event.player_id}-${event.tick_index}-${index}`}
                    className="admin-surface-card rounded-sm p-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span
                          className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${OUTCOME_CLASS[event.outcome]}`}
                        >
                          {OUTCOME_LABEL[event.outcome]}
                        </span>
                        <p className="m-0 whitespace-pre-line text-sm text-amber">
                          {formatObservabilityEventSummary(event)}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-amber-dim" dateTime={String(event.committed_at)}>
                        tick {event.tick_index} · {formatDate(event.committed_at)}
                      </time>
                    </div>
                    {attempts.length > 0 && (
                      <p className="mt-1 m-0 text-xs text-amber-dim">
                        Essais :{' '}
                        {attempts.map((attempt, attempt_index) => (
                          <span key={`${attempt.category}-${attempt_index}`}>
                            {attempt_index > 0 ? ' → ' : ''}
                            <span className={attempt.result === 'success' ? 'text-emerald-400' : ''}>
                              {formatObservabilityAttemptLabel(
                                attempt.category as ObservabilityTickCategory,
                                attempt.result,
                              )}
                            </span>
                          </span>
                        ))}
                      </p>
                    )}
                    <details className="mt-2 text-xs text-amber-dim">
                      <summary className="cursor-pointer text-amber">Détails JSON</summary>
                      <pre className="admin-surface-code mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-sm p-2 text-[11px]">
                        {JSON.stringify({
                          outcome: event.outcome,
                          attempts: event.attempts,
                          committed_actions: event.committed_actions,
                          payload: event.payload,
                        }, null, 2)}
                      </pre>
                    </details>
                  </li>
                )
              })
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
