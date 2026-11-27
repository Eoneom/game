import React from 'react'
import { Link } from '@tanstack/react-router'
import classNames from 'classnames'
import { WorldTarget, WorldTargetIntel } from '@eoneom/api-client'

import { allianceDisplayName } from '#alliance/translations'
import { outpostLabel } from '#map/markers'
import {
  BALANCE_LABELS,
  Balance,
  balanceOf,
  formatReportAge,
  formatStrength,
  reportAgeClass,
} from '#map/overlays'

export const NO_REPORT = 'Aucun rapport d\'espionnage — envoyez des éclaireurs'

const BALANCE_CLASS: Record<Balance, string> = {
  favorable: 'text-terminal',
  uncertain: 'text-amber',
  risky: 'text-danger',
}

const AGE_CLASS = {
  fresh: 'bg-chrome-3 text-ink',
  aging: 'bg-chrome-3/60 text-label',
  stale: 'border border-edge text-label',
} as const

/** Spy report age badge: solid when fresh, faded 6–24 h, outline only past 24 h. */
const ReportAgeBadge: React.FC<{ recordedAt: number; now: number }> = ({ recordedAt, now }) => (
  <span className={classNames('inline-block rounded-sm px-1.5 text-caption tabular-nums', AGE_CLASS[reportAgeClass(recordedAt, now)])}>
    {formatReportAge(recordedAt, now)}
  </span>
)

/** Report tier and age, estimated strength and balance against the current location's attack. */
export const IntelSummary: React.FC<{ intel: WorldTargetIntel; attack: number; now: number }> = ({ intel, attack, now }) => {
  const balance = balanceOf({ attack, targetLife: intel.estimated.life })
  return (
    <div className="space-y-1">
      <p className="m-0 text-meta text-label">
        Rapport niv. {intel.tier} · il y a <ReportAgeBadge recordedAt={intel.recorded_at} now={now} />
      </p>
      <p className="m-0 font-mono text-meta tabular-nums text-ink">
        {formatStrength({ ...intel.estimated, defenses_known: intel.defenses_known })}
      </p>
      <p className="m-0 text-meta">
        Rapport de force : <span className={classNames('font-semibold', BALANCE_CLASS[balance])}>{BALANCE_LABELS[balance]}</span>
      </p>
    </div>
  )
}

const targetName = (target: WorldTarget): string =>
  allianceDisplayName(
    target.name ?? (target.outpost_type ? outpostLabel(target.outpost_type) : 'Avant-poste'),
    target.alliance_tag
  )

const smallButton = 'cursor-pointer rounded-sm border border-rust/60 px-2 py-0.5 text-caption uppercase tracking-wide text-amber hover:border-amber disabled:cursor-not-allowed disabled:opacity-40'

interface Props {
  targets: WorldTarget[] | undefined
  loading: boolean
  radius: number
  attack: number
  now: number
  espionageLevel: number
  onView: (target: WorldTarget) => void
  onSpy: (target: WorldTarget) => void
  onAttack: (target: WorldTarget) => void
}

/** « Cibles et menaces » list (slice 044), nearest first. */
export const MapDrawerTargets: React.FC<Props> = ({ targets, loading, radius, attack, now, espionageLevel, onView, onSpy, onAttack }) => {
  if (loading && !targets) return <p className="text-body text-label">Chargement des cibles…</p>
  if (!targets || targets.length === 0) {
    return <p className="text-body text-label">Aucune cible ni menace à moins de {radius} cases de vos emplacements.</p>
  }
  return (
    <div className="space-y-2">
      <p className="m-0 text-meta text-label">À moins de {radius} cases de vos emplacements, les plus proches d'abord.</p>
      <ul className="m-0 list-none space-y-2 p-0">
        {targets.map(target => (
          <li key={`${target.kind}-${target.id}`} className="surface-panel-inset space-y-1 p-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="m-0 text-body text-ink">{targetName(target)}</p>
                <p className="m-0 text-meta text-label">
                  {allianceDisplayName(target.owner_name, target.alliance_tag)} · ({target.coordinates.x}, {target.coordinates.y}) · {target.nearest.distance} cases
                </p>
              </div>
              <span className={classNames('shrink-0 text-caption uppercase tracking-wide', target.category === 'threat' ? 'text-danger' : 'text-amber')}>
                {target.category === 'threat' ? 'Menace' : 'Cible'}
              </span>
            </div>
            {target.intel
              ? <IntelSummary intel={target.intel} attack={attack} now={now} />
              : <p className="m-0 text-meta text-label">{NO_REPORT}</p>}
            <div className="flex flex-wrap gap-1 pt-1">
              <button type="button" className={smallButton} onClick={() => onView(target)}>Voir</button>
              <button
                type="button"
                className={smallButton}
                disabled={espionageLevel < 1}
                title={espionageLevel < 1 ? 'Recherchez Espionnage' : undefined}
                onClick={() => onSpy(target)}
              >
                Espionner
              </button>
              <button type="button" className={smallButton} onClick={() => onAttack(target)}>Attaquer</button>
              {target.intel && (
                <Link to="/inbox/report" search={{ report_id: target.intel.report_id }} className={smallButton}>
                  Voir le rapport
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
