import { Report } from '#types'
import { TroopTranslations } from '#troop/translations'
import React from 'react'
import { LayoutDetailsContent } from '#ui/layout/details/content'
import { formatCoordinates } from '#helpers/transform'
import { ReportTypeLabels } from '#communication/report/translations'

interface Props {
  report?: Report
}

const hasResources = (resources: { plastic: number; mushroom: number }) =>
  resources.plastic > 0 || resources.mushroom > 0

const formatResources = (resources: { plastic: number; mushroom: number }) =>
  `${resources.plastic} plastique, ${resources.mushroom} champignon`

export const ReportDetails: React.FC<Props> = ({ report }) => {
  if (!report) {
    return null
  }

  return <LayoutDetailsContent>
    <h1>{ReportTypeLabels[report.type]}</h1>
    <h3>Source: {formatCoordinates(report.origin)}</h3>
    <h3>Destination: {formatCoordinates(report.destination)}</h3>
    {hasResources(report.resources) && (
      <p className="details-meta">
        Ressources transportées : {formatResources(report.resources)}
      </p>
    )}
    {hasResources(report.remaining_resources) && (
      <p className="details-meta">
        Ressources restantes renvoyées à l&apos;origine : {formatResources(report.remaining_resources)}
      </p>
    )}
    <h3>Troupes</h3>
    <ul>
      {
        report.troops.map(troop => <li key={troop.code}>
          {TroopTranslations[troop.code].name} {troop.count}
        </li>)
      }
    </ul>
  </LayoutDetailsContent>
}
