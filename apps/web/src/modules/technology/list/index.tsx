import React, { useMemo } from 'react'
import { RESEARCH_QUEUE_LIMIT } from '@eoneom/api-client'

import { TechnologyListItem } from '#technology/list/item'
import { projectResearchQueueLevels } from '#technology/queue-levels'
import { TechnologyTranslations } from '#technology/translations'
import { technologyImageSrc } from '#technology/image'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { EntityThumb } from '#ui/entity-thumb'
import { List } from '#ui/list'
import { QueuePanel } from '#ui/queue-panel'
import { useCountdownProgress } from '#hook/countdown-progress'
import {
  useListTechnologies,
  useCancelTechnology,
  useCancelQueuedTechnologyResearch
} from '#technology/hooks'
import { TechnologyItem } from '#types'

interface Props {
  selectedCode: TechnologyItem['code'] | null
  onSelect: (code: TechnologyItem['code']) => void
}

export const TechnologyList: React.FC<Props> = ({ selectedCode, onSelect }) => {
  const { data } = useListTechnologies()
  const technologies = data?.technologies ?? []
  const researchQueue = data?.research_queue ?? []
  const cancelTechnology = useCancelTechnology()
  const cancelQueued = useCancelQueuedTechnologyResearch()

  const inProgress = technologies.find(
    (t): t is Extract<TechnologyItem, { research_at: number }> => 'research_at' in t
  )

  const queuedCodes = useMemo(
    () => new Set(researchQueue.map(item => item.technology_code)),
    [researchQueue]
  )

  const queuedWithLevels = useMemo(
    () => projectResearchQueueLevels({
      technologies,
      research_queue: researchQueue
    }),
    [technologies, researchQueue]
  )

  const { remainingSeconds, elapsedProgress } = useCountdownProgress({
    onDone: () => undefined,
    endAt: inProgress?.research_at,
    startAt: inProgress?.research_started_at
  })

  const queueDepth = `${researchQueue.length}/${RESEARCH_QUEUE_LIMIT}`

  const inProgressComponent = (
    <QueuePanel
      title="Recherche"
      depth={queueDepth}
      empty={!inProgress ? 'Aucune recherche en cours' : undefined}
      active={inProgress ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <EntityThumb
            size="md"
            src={technologyImageSrc(inProgress.code)}
            alt=""
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="m-0 text-sm text-amber">
              {TechnologyTranslations[inProgress.code].name}{' '}
              <span className="text-label">→ niveau {inProgress.level + 1}</span>
            </p>
            <CountdownProgress
              summary={<>Recherche en cours</>}
              elapsedProgress={elapsedProgress}
              remainingSeconds={remainingSeconds}
            />
            <Button variant="danger" onClick={() => cancelTechnology.mutate()}>
              Annuler
            </Button>
          </div>
        </div>
      ) : undefined}
      queue={queuedWithLevels.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {queuedWithLevels.map(item => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-sm border border-rust/40 bg-chrome/50 px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 text-amber-dim">
                {TechnologyTranslations[item.technology_code].name}{' '}
                <span className="text-label">niveau {item.level}</span>
                <span className="text-label"> · {item.city_name}</span>
              </span>
              <Button
                variant="ghost"
                className="shrink-0 !px-2 !py-1 text-xs"
                onClick={() => cancelQueued.mutate(item.id)}
              >
                Annuler
              </Button>
            </li>
          ))}
        </ul>
      ) : undefined}
    />
  )

  const items = useMemo(() => {
    return technologies.map(technologyItem => {
      const isResearching = inProgress?.code === technologyItem.code
      const isQueued = queuedCodes.has(technologyItem.code)
      return (
        <TechnologyListItem
          active={technologyItem.code === selectedCode}
          key={technologyItem.id}
          technologyItem={technologyItem}
          onSelect={onSelect}
          badge={isResearching ? 'En cours' : isQueued ? 'File' : undefined}
          busy={isResearching || isQueued}
        />
      )
    })
  }, [selectedCode, technologies, onSelect, inProgress, queuedCodes])

  return <List
    inProgress={inProgressComponent}
    items={items}
  />
}
