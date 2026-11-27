import React from 'react'
import { TechnologyCode } from '@eoneom/api-client'

import { TechnologyList } from '#technology/list'
import { TechnologyDetails } from '#technology/details/index'
import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { useGetTechnology } from '#technology/hooks'
import { Technology } from '#types'

interface Props {
  cityId: string
  /** Selected technology from the URL (`?code=`, slice 043). */
  selectedCode: TechnologyCode | null
  onSelect: (code: TechnologyCode) => void
}

export const TechnologyPage: React.FC<Props> = ({ cityId, selectedCode, onSelect }) => {
  const { data: technology, isFetching } = useGetTechnology(cityId, selectedCode)

  const details = technology ? (
    <TechnologyDetails cityId={cityId} technology={technology as Technology} />
  ) : selectedCode && isFetching ? (
    <LayoutDetailsEmpty>Chargement de la technologie…</LayoutDetailsEmpty>
  ) : (
    <LayoutDetailsEmpty>
      Sélectionnez une technologie pour afficher ses détails.
    </LayoutDetailsEmpty>
  )

  return (
    <LayoutPage details={details}>
      <TechnologyList
        cityId={cityId}
        selectedCode={selectedCode}
        onSelect={onSelect}
      />
    </LayoutPage>
  )
}
