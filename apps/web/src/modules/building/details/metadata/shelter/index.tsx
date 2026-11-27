import React from 'react'

import { transformDecimals } from '#helpers/transform'
import { Resource } from '@eoneom/api-client'

interface Props {
  currentSheltered: Resource
  nextSheltered: Resource
}

const ShelteredLine: React.FC<{ label: string, sheltered: Resource }> = ({ label, sheltered }) => {
  return <>
    {label} : <strong>{transformDecimals(sheltered.plastic)}</strong> plastique,{' '}
    <strong>{transformDecimals(sheltered.mushroom)}</strong> champignons,{' '}
    <strong>{transformDecimals(sheltered.plasma)}</strong> plasma
  </>
}

export const BuildingDetailsMetadataShelter: React.FC<Props> = ({ currentSheltered, nextSheltered }) => {
  return <p>
    <ShelteredLine label="Protégé actuellement" sheltered={currentSheltered} /><br />
    <ShelteredLine label="Au niveau suivant" sheltered={nextSheltered} />
  </p>
}
