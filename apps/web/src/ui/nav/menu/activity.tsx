import React from 'react'
import classNames from 'classnames'
import type {
  LocationActivityBuilding,
  LocationActivityFortification,
  LocationActivityRecruitment,
  LocationActivityResearch,
  TroopIncomingMovement,
} from '@eoneom/api-client'

import { useCountdownProgress } from '#hook/countdown-progress'
import { useInvalidateLocationActivity } from '#location/activity-hooks'
import { BuildingTranslations } from '#building/translations'
import { TechnologyTranslations } from '#technology/translations'
import { TroopTranslations } from '#troop/translations'
import { DefenseTranslations } from '#defense/translations'
import { formatDurationMmSs } from '#helpers/transform'

/** « Bientôt fini »: last 10 % of the job or its last minute. */
const SOON_PROGRESS = 0.9
const SOON_SECONDS = 60

const IdleLine: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = 'text-terminal' }) => (
  <span className={classNames('block text-meta', className)}>{children}</span>
)

interface JobLineProps {
  /** Visible line, e.g. « Usine de recyclage → 5 ». */
  text: string
  /** Progress bar label, e.g. « Usine de recyclage niveau 5 ». */
  valueLabel: string
  endAt: number
  startAt: number
  /** Appended after the text, e.g. « · Ferraille » for research running in another city. */
  suffix?: string
}

/** Running job: text line, 4 px progress bar and time left; « Terminé » once the countdown reaches 0. */
const JobLine: React.FC<JobLineProps> = ({ text, valueLabel, endAt, startAt, suffix }) => {
  const invalidate = useInvalidateLocationActivity()
  const { remainingSeconds, elapsedProgress } = useCountdownProgress({
    endAt,
    startAt,
    onDone: () => {
      invalidate()
    },
  })

  if (remainingSeconds <= 0) {
    return <IdleLine>Terminé</IdleLine>
  }

  const soon = elapsedProgress >= SOON_PROGRESS || remainingSeconds <= SOON_SECONDS
  const time = formatDurationMmSs(remainingSeconds)
  const percent = Math.round(elapsedProgress * 100)

  return (
    <span className="block">
      <span className="block truncate text-meta text-amber-dim" title={`${text}${suffix ?? ''}`}>
        {text}
        {suffix ? <span className="text-label">{suffix}</span> : null}
      </span>
      <span className="mt-1 flex items-center gap-2">
        <span
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${valueLabel}, ${time} restantes`}
          aria-label={valueLabel}
          className="h-1 min-w-0 flex-1 overflow-hidden rounded-sm bg-chrome"
        >
          <span className="block h-full bg-amber" style={{ width: `${percent}%` }} />
        </span>
        <span className={classNames('shrink-0 font-mono text-caption tabular-nums', soon ? 'font-semibold text-amber' : 'text-label')}>
          {time}
        </span>
      </span>
    </span>
  )
}

/** No running job: « Libre » with an empty queue, « En attente » while queued items wait for the next start. */
const NoJobLine: React.FC<{ queueDepth: number }> = ({ queueDepth }) => queueDepth > 0
  ? <IdleLine className="text-label">En attente</IdleLine>
  : <IdleLine>Libre</IdleLine>

export const BuildingActivity: React.FC<{ building: LocationActivityBuilding | null, queueDepth: number }> = ({
  building,
  queueDepth,
}) => {
  if (!building) {
    return <NoJobLine queueDepth={queueDepth} />
  }
  const name = BuildingTranslations[building.code].name
  return (
    <JobLine
      text={`${name} → ${building.level + 1}`}
      valueLabel={`${name} niveau ${building.level + 1}`}
      endAt={building.upgrade_at}
      startAt={building.upgrade_started_at}
    />
  )
}

/** Research is player-wide: the running city's name is appended when it is not the current city. */
export const ResearchActivity: React.FC<{
  research: LocationActivityResearch | null
  queueDepth: number
  cityId: string
}> = ({ research, queueDepth, cityId }) => {
  if (!research) {
    return <NoJobLine queueDepth={queueDepth} />
  }
  const name = TechnologyTranslations[research.code].name
  return (
    <JobLine
      text={`${name} → ${research.level + 1}`}
      valueLabel={`${name} niveau ${research.level + 1}`}
      endAt={research.research_at}
      startAt={research.research_started_at}
      suffix={research.city_id !== cityId ? ` · ${research.city_name}` : undefined}
    />
  )
}

export const RecruitmentActivity: React.FC<{ recruitment: LocationActivityRecruitment | null, queueDepth: number }> = ({
  recruitment,
  queueDepth,
}) => {
  if (!recruitment) {
    return <NoJobLine queueDepth={queueDepth} />
  }
  const text = `${recruitment.remaining_count} ${TroopTranslations[recruitment.code].name}`
  return (
    <JobLine
      text={text}
      valueLabel={text}
      endAt={recruitment.finish_at}
      startAt={recruitment.started_at}
    />
  )
}

export const FortificationActivity: React.FC<{
  fortification: LocationActivityFortification | null
  queueDepth: number
  available: boolean
}> = ({ fortification, queueDepth, available }) => {
  if (!available && !fortification) {
    return <IdleLine className="text-label">Enceinte requise</IdleLine>
  }
  if (!fortification) {
    return <NoJobLine queueDepth={queueDepth} />
  }
  const text = `${fortification.remaining_count} ${DefenseTranslations[fortification.code].name}`
  return (
    <JobLine
      text={text}
      valueLabel={text}
      endAt={fortification.finish_at}
      startAt={fortification.started_at}
    />
  )
}

const NextArrival: React.FC<{ arriveAt: number }> = ({ arriveAt }) => {
  const { remainingSeconds } = useCountdownProgress({ endAt: arriveAt })
  return (
    <span className="block text-meta text-amber-dim">
      Prochaine arrivée <span className="font-mono tabular-nums">{formatDurationMmSs(remainingSeconds)}</span>
    </span>
  )
}

const ThreatLine: React.FC<{ attacks: TroopIncomingMovement[] }> = ({ attacks }) => {
  const earliest = Math.min(...attacks.map(attack => attack.arrive_at))
  const { remainingSeconds } = useCountdownProgress({ endAt: earliest })
  const plural = attacks.length > 1 ? 's' : ''
  return (
    <span className="mt-0.5 block text-meta text-danger">
      <span aria-hidden>⚠ </span>
      {attacks.length} attaque{plural} entrante{plural} ·{' '}
      <span className="font-mono tabular-nums">{formatDurationMmSs(remainingSeconds)}</span>
    </span>
  )
}

/** Déplacements entry: next arrival of the player's movements, plus the attacks incoming on this location. */
export const MovementActivity: React.FC<{
  count: number
  nextArriveAt: number | null
  attacks: TroopIncomingMovement[]
}> = ({ count, nextArriveAt, attacks }) => (
  <>
    {count > 0 && nextArriveAt ? <NextArrival arriveAt={nextArriveAt} /> : <IdleLine className="text-label">Aucun</IdleLine>}
    {attacks.length ? <ThreatLine attacks={attacks} /> : null}
  </>
)
