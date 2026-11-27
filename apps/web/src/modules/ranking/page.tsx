import React from 'react'
import { Link } from '@tanstack/react-router'
import classNames from 'classnames'
import {
  RankingCategory,
  RankingKind,
  type RankingMePosition,
  type RankingRow,
} from '@eoneom/api-client'

import { LayoutPage } from '#ui/layout/page'
import { Button } from '#ui/button'
import { FactionTranslations } from '#faction/translations'
import { allianceDisplayName } from '#alliance/translations'
import { useRankingList, useRankingMe } from '#ranking/hooks'
import {
  RankingCategoryLabels,
  RankingKindLabels,
  formatComputedAt,
  formatPoints,
  formatRankChange,
} from '#ranking/translations'

export interface RankingPageSearch {
  category?: RankingCategory
  kind?: RankingKind
  page?: number
}

const AnyLink = Link as React.ComponentType<{
  to: string
  params?: Record<string, string>
  search?: Record<string, string>
  className?: string
  children: React.ReactNode
}>

const tabClass = (active: boolean) => classNames(
  'rounded-sm border px-3 py-1 text-xs uppercase tracking-wider transition',
  active
    ? 'neon-amber motion-safe-neon border-amber/50 bg-chrome text-amber'
    : 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber'
)

const linkClass = 'text-amber hover:underline'

const entityKey = (row: RankingRow): string => row.entity.kind === RankingKind.FACTION ? row.entity.code : row.entity.id

const RowName: React.FC<{ row: RankingRow }> = ({ row }) => {
  const { entity } = row
  if (entity.kind === RankingKind.PLAYER) {
    return (
      <AnyLink
        to="/inbox/mail"
        search={{ view: 'compose', to: entity.name }}
        className={linkClass}
      >
        {allianceDisplayName(entity.name, entity.alliance_tag)}
      </AnyLink>
    )
  }
  if (entity.kind === RankingKind.ALLIANCE) {
    if (entity.name === null) {
      return <span className="text-label">Alliance dissoute</span>
    }
    return (
      <AnyLink to="/alliance/$allianceId" params={{ allianceId: entity.id }} className={linkClass}>
        {allianceDisplayName(entity.name, entity.tag)}
      </AnyLink>
    )
  }
  return <span className="text-amber">{FactionTranslations[entity.code].name}</span>
}

/** Faction column for players, member count for alliances and player count for factions. */
const RowDetail: React.FC<{ row: RankingRow }> = ({ row }) => {
  const { entity } = row
  if (entity.kind === RankingKind.PLAYER) {
    return <>{FactionTranslations[entity.faction_code].name}</>
  }
  const count = entity.kind === RankingKind.ALLIANCE ? entity.member_count : entity.player_count
  const noun = entity.kind === RankingKind.ALLIANCE ? 'membre' : 'joueur'
  return <>{count} {noun}{count > 1 ? 's' : ''}</>
}

const RankChange: React.FC<{ change: number | null }> = ({ change }) => (
  <span
    className={classNames(
      change !== null && change > 0 && 'text-terminal',
      change !== null && change < 0 && 'text-danger',
      (change === null || change === 0) && 'text-label'
    )}
    aria-label={change === null ? 'Pas de variation connue' : `Variation sur 24 h : ${change}`}
  >
    {formatRankChange(change)}
  </span>
)

/** Rankings page (slice 034): categories, kinds, 50 rows per page, own row highlighted. */
export const RankingPage: React.FC<{
  search: RankingPageSearch
  onNavigate: (search: RankingPageSearch) => void
}> = ({ search, onNavigate }) => {
  const category = search.category ?? RankingCategory.GLOBAL
  const kind = search.kind ?? RankingKind.PLAYER
  const page = search.page ?? 1

  const { data, isPending } = useRankingList(category, kind, page)
  const { data: me } = useRankingMe()

  const myPosition: RankingMePosition | undefined = me?.positions.find(
    position => position.category === category && position.kind === kind
  )
  const myEntityId = me?.positions.find(position => position.kind === kind)?.entity_id ?? null
  const totalPages = data && data.page_size > 0 ? Math.ceil(data.total / data.page_size) : 0
  const showHeaderLabel = kind === RankingKind.PLAYER ? 'Faction' : kind === RankingKind.ALLIANCE ? 'Membres' : 'Joueurs'

  return (
    <LayoutPage>
      <div className="space-y-3">
        <header className="space-y-2">
          <h2 className="m-0 text-base text-amber">Classements</h2>
          <nav aria-label="Catégorie" className="flex flex-wrap gap-1">
            {Object.values(RankingCategory).map(value => (
              <button
                key={value}
                type="button"
                className={tabClass(value === category)}
                aria-pressed={value === category}
                onClick={() => onNavigate({ category: value, kind })}
              >
                {RankingCategoryLabels[value]}
              </button>
            ))}
          </nav>
          <nav aria-label="Classer" className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {Object.values(RankingKind).map(value => (
                <button
                  key={value}
                  type="button"
                  className={tabClass(value === kind)}
                  aria-pressed={value === kind}
                  onClick={() => onNavigate({ category, kind: value })}
                >
                  {RankingKindLabels[value]}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              disabled={!myPosition}
              onClick={() => myPosition && onNavigate({ category, kind, page: myPosition.page })}
            >
              Ma position
            </Button>
          </nav>
        </header>

        {isPending && <p className="m-0 text-sm text-label">Chargement…</p>}
        {!isPending && data?.computed_at === null && (
          <p className="m-0 text-sm text-label">Le premier classement n&apos;a pas encore été calculé.</p>
        )}
        {!isPending && data && data.computed_at !== null && data.rows.length === 0 && (
          <p className="m-0 text-sm text-label">
            {kind === RankingKind.ALLIANCE
              ? 'Aucune alliance classée (il faut au moins 3 membres).'
              : 'Personne n\'est classé ici.'}
          </p>
        )}

        {data && data.rows.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-label">
                <th scope="col" className="px-2 py-1">Rang</th>
                <th scope="col" className="px-2 py-1">24 h</th>
                <th scope="col" className="px-2 py-1">Nom</th>
                <th scope="col" className="px-2 py-1">{showHeaderLabel}</th>
                <th scope="col" className="px-2 py-1 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(row => {
                const isMine = myEntityId !== null && entityKey(row) === myEntityId
                return (
                  <tr
                    key={entityKey(row)}
                    aria-current={isMine ? 'true' : undefined}
                    className={classNames(
                      'border-t border-rust/30',
                      isMine ? 'neon-amber motion-safe-neon bg-chrome text-amber' : 'text-amber-dim'
                    )}
                  >
                    <td className="px-2 py-1 tabular-nums">{row.rank}</td>
                    <td className="px-2 py-1 tabular-nums"><RankChange change={row.rank_change_24h} /></td>
                    <td className="px-2 py-1"><RowName row={row} /></td>
                    <td className="px-2 py-1"><RowDetail row={row} /></td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatPoints(row.points)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 text-xs text-amber-dim">
            <p className="m-0">Page {page}/{totalPages}</p>
            <div className="flex gap-1">
              <Button variant="ghost" disabled={page <= 1} onClick={() => onNavigate({ category, kind, page: page - 1 })}>
                Précédente
              </Button>
              <Button variant="ghost" disabled={page >= totalPages} onClick={() => onNavigate({ category, kind, page: page + 1 })}>
                Suivante
              </Button>
            </div>
          </div>
        )}

        {data?.computed_at != null && (
          <footer className="text-xs text-label">{formatComputedAt(data.computed_at)}</footer>
        )}
      </div>
    </LayoutPage>
  )
}
