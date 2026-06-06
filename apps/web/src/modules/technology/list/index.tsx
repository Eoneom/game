import React, { useMemo } from 'react'
import { TechnologyCode } from '@eoneom/api-client'

import { TechnologyListItem } from '#technology/list/item'
import { TechnologyTranslations } from '#technology/translations'
import { technologyImageSrc } from '#technology/image'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { EntityThumb } from '#ui/entity-thumb'
import { List } from '#ui/list'
import { QueuePanel } from '#ui/queue-panel'
import { useCountdownProgress } from '#hook/countdown-progress'
import { useListTechnologies, useCancelTechnology } from '#technology/hooks'
import { TechnologyItem } from '#types'

interface Props {
  selectedCode: TechnologyCode | null
  onSelect: (code: TechnologyCode) => void
}

export const TechnologyList: React.FC<Props> = ({ selectedCode, onSelect }) => {
  const { data: technologies = [] } = useListTechnologies()
  const cancelTechnology = useCancelTechnology()

  const inProgress = technologies.find(
    (t): t is Extract<TechnologyItem, { research_at: number }> => 'research_at' in t
  )

  const { remainingSeconds, elapsedProgress } = useCountdownProgress({
    onDone: () => undefined,
    endAt: inProgress?.research_at,
    startAt: inProgress?.research_started_at
  })

  const inProgressComponent = (
    <QueuePanel
      title="Recherche"
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
    />
  )

  const items = useMemo(() => {
    return technologies.map(technologyItem => (
      <TechnologyListItem
        active={technologyItem.code === selectedCode}
        key={technologyItem.id}
        technologyItem={technologyItem}
        onSelect={onSelect}
        badge={inProgress?.code === technologyItem.code ? 'En cours' : undefined}
        busy={inProgress?.code === technologyItem.code}
      />
    ))
  }, [selectedCode, technologies, onSelect, inProgress])

  return <List
    inProgress={inProgressComponent}
    items={items}
  />
}
