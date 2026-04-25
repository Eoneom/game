import React, { useMemo } from 'react'
import { TechnologyCode } from '@eoneom/api-client'

import { TechnologyListItem } from '#technology/list/item'
import { TechnologyTranslations } from '#technology/translations'
import { Button } from '#ui/button'
import { CountdownProgress } from '#ui/countdown-progress'
import { List } from '#ui/list'
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

  const inProgressComponent = inProgress && <>
    <CountdownProgress
      summary={<>En cours: {TechnologyTranslations[inProgress.code].name}</>}
      elapsedProgress={elapsedProgress}
      remainingSeconds={remainingSeconds}
    />
    <Button onClick={() => cancelTechnology.mutate()}>Annuler</Button>
  </>

  const items = useMemo(() => {
    return technologies.map(technologyItem => <TechnologyListItem
      active={technologyItem.code === selectedCode}
      key={technologyItem.id}
      technologyItem={technologyItem}
      onSelect={onSelect}
    />)
  }, [selectedCode, technologies, onSelect])

  return <List
    inProgress={inProgressComponent}
    items={items}
  />
}
